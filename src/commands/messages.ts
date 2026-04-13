import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  maybePrint,
  requireConfirmation,
  withBlueBubblesDeps,
  withPaging,
} from "../lib/cli-helpers.js";
import { CliError } from "../lib/errors.js";
import {
  printMessages,
  printScheduledMessages,
  printSuccess,
} from "../lib/output.js";
import {
  createScheduledMessage,
  deleteScheduledMessage,
  editMessage,
  getMessage,
  getScheduledMessage,
  getScheduledMessages,
  listMessages,
  sendReact,
  sendText,
  unsendMessage,
  updateScheduledMessage,
} from "../lib/bluebubbles/message.js";
import { DEFAULT_MESSAGE_WITH } from "../lib/constants.js";
import type { EditMessageInput, SendReactInput } from "../lib/bluebubbles/message.js";
import type { CommandOverrides, MessageSummary, OutputOptions } from "../lib/types.js";

export function registerMessageCommands(program: Command): void {
  const messageCommand = program.command("message").description("Message resource operations");

  addConnectionOptions(
    withPaging(messageCommand.command("list").description("List messages (POST /api/v1/message/query)"), 50),
  )
    .option("--chat <guid>", "Limit messages to a specific chat")
    .option("--after <epochSeconds>", "Only include messages after this epoch seconds value")
    .option("--before <epochSeconds>", "Only include messages before this epoch seconds value")
    .option("--text <value>", "Filter messages containing text")
    .option("--from <address>", "Filter messages by sender address")
    .option("--from-me", "Only include messages sent by this account")
    .option("--not-from-me", "Only include messages not sent by this account")
    .option("--has-attachments", "Only include messages with attachments")
    .option(
      "--where <json>",
      "Advanced escape hatch: raw TypeORM-style where clauses JSON (array or object).",
    )
    .action(
      withBlueBubblesDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            limit?: number;
            offset?: number;
            sort?: string;
            with: string[];
            chat?: string;
            after?: string;
            before?: string;
            text?: string;
            from?: string;
            fromMe?: boolean;
            notFromMe?: boolean;
            hasAttachments?: boolean;
            where?: string;
          },
      ) => {
        const parseEpoch = (value?: string): number | undefined => {
          if (!value) return undefined;
          const parsed = Number.parseInt(value, 10);
          if (Number.isNaN(parsed)) {
            throw new CliError(`Invalid epoch seconds value: ${value}`, "validation");
          }
          return parsed;
        };

        const parseWhere = (value?: string): Array<Record<string, unknown>> | undefined => {
          if (!value) return undefined;
          let parsed: unknown;
          try {
            parsed = JSON.parse(value);
          } catch {
            throw new CliError("--where must be valid JSON (array or object).", "validation");
          }
          if (Array.isArray(parsed)) {
            return parsed as Array<Record<string, unknown>>;
          }
          if (parsed && typeof parsed === "object") {
            return [parsed as Record<string, unknown>];
          }
          throw new CliError("--where must be a JSON object or array of objects.", "validation");
        };

        const buildServerWhere = (
          value: {
            text?: string;
            from?: string;
            fromMe?: boolean;
            notFromMe?: boolean;
            hasAttachments?: boolean;
          },
        ): Array<Record<string, unknown>> => {
          if (value.fromMe && value.notFromMe) {
            throw new CliError("Use either --from-me or --not-from-me, not both.", "validation");
          }

          const clauses: Array<Record<string, unknown>> = [];

          if (value.fromMe) {
            clauses.push({
              statement: "message.isFromMe = :isFromMe",
              args: { isFromMe: true },
            });
          }

          if (value.notFromMe) {
            clauses.push({
              statement: "message.isFromMe = :isFromMe",
              args: { isFromMe: false },
            });
          }

          return clauses;
        };

        const applyLocalCommonFilters = (
          messages: MessageSummary[],
          value: {
            text?: string;
            from?: string;
            hasAttachments?: boolean;
          },
        ): MessageSummary[] => {
          const query = value.text?.trim().toLowerCase();
          return messages.filter((message) => {
            if (query && !(message.text ?? "").toLowerCase().includes(query)) {
              return false;
            }
            if (value.from && message.handle?.address !== value.from) {
              return false;
            }
            if (value.hasAttachments) {
              if (!Array.isArray(message.attachments) || message.attachments.length === 0) {
                return false;
              }
            }
            return true;
          });
        };

        const rawWhere = parseWhere(options.where);
        const serverWhere = buildServerWhere({
          text: options.text,
          from: options.from,
          fromMe: options.fromMe,
          notFromMe: options.notFromMe,
          hasAttachments: options.hasAttachments,
        });
        const mergedWhere = [...(rawWhere ?? []), ...serverWhere];

        const result = await listMessages(client, {
          chatGuid: options.chat,
          limit: options.limit,
          offset: options.offset,
          sort: options.sort,
          after: parseEpoch(options.after),
          before: parseEpoch(options.before),
          where: mergedWhere.length > 0 ? mergedWhere : undefined,
          with: options.with.length > 0 ? options.with : [...DEFAULT_MESSAGE_WITH],
        });
        const filtered = applyLocalCommonFilters(result.data ?? [], {
          text: options.text,
          from: options.from,
          hasAttachments: options.hasAttachments,
        });
        maybePrint(filtered, options, () => printMessages(filtered));
      }),
    );

  addConnectionOptions(
    messageCommand.command("get").description("Fetch a message by GUID (GET /api/v1/message/<GUID>)"),
  )
    .argument("<guid>")
    .option("--with <item>", "Include related data", (value, previous: string[] = []) => [...previous, value], [])
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { with: string[] }) => {
      const result = await getMessage(
        client,
        guid,
        options.with.length > 0 ? options.with : [...DEFAULT_MESSAGE_WITH],
      );
      maybePrint(result.data, options, () => printSuccess(result.data ?? {}, false));
    }));

  addConnectionOptions(
    messageCommand.command("send").description("Send a text message (POST /api/v1/message/text)"),
  )
    .requiredOption("--chat <guid>", "Chat GUID")
    .requiredOption("--message <text>", "Message body")
    .option("--method <method>", "Message delivery method")
    .option("--subject <subject>", "Optional subject line")
    .option("--effect-id <id>", "Optional bubble or screen effect ID")
    .option("--reply-to <guid>", "Optional selected message GUID for replies")
    .action(
      withBlueBubblesDeps(({ client }) => async (
        options: CommandOverrides &
          OutputOptions & {
            chat: string;
            message: string;
            method?: string;
            subject?: string;
            effectId?: string;
            replyTo?: string;
          },
      ) => {
        const result = await sendText(client, {
          chatGuid: options.chat,
          message: options.message,
          method: options.method,
          subject: options.subject,
          effectId: options.effectId,
          selectedMessageGuid: options.replyTo,
        });
        maybePrint(result.data, options, () => printSuccess(result.message ?? "Message sent.", false));
      }),
    );

  addConnectionOptions(
    messageCommand.command("react").description("Send a tapback reaction (POST /api/v1/message/react)"),
  )
    .argument("<guid>", "GUID of the message to react to")
    .requiredOption("--chat <guid>", "Chat GUID")
    .requiredOption("--reaction <type>", "Tapback reaction name")
    .option("--message-text <text>", "Text of the message being reacted to")
    .option("--part-index <n>", "Part index for multi-part messages", (v: string) => Number.parseInt(v, 10))
    .action(
      withBlueBubblesDeps(({ client }) => async (
        guid: string,
        options: CommandOverrides &
          OutputOptions & {
            chat: string;
            reaction: string;
            messageText?: string;
            partIndex?: number;
          },
      ) => {
        const result = await sendReact(client, {
          chatGuid: options.chat,
          selectedMessageGuid: guid,
          reaction: options.reaction,
          selectedMessageText: options.messageText,
          partIndex: options.partIndex,
        } satisfies SendReactInput);
        maybePrint(result.data, options, () => printSuccess(result.message ?? "Reaction sent.", false));
      }),
    );

  addConnectionOptions(
    messageCommand.command("edit").description("Edit a sent message (POST /api/v1/message/<GUID>/edit)"),
  )
    .argument("<guid>", "GUID of the message to edit")
    .requiredOption("--message <text>", "New message text")
    .option("--backwards-compat <text>", "Fallback message text for older clients")
    .option("--part-index <n>", "Part index for multi-part messages", (v: string) => Number.parseInt(v, 10))
    .action(
      withBlueBubblesDeps(({ client }) => async (
        guid: string,
        options: CommandOverrides &
          OutputOptions & {
            message: string;
            backwardsCompat?: string;
            partIndex?: number;
          },
      ) => {
        const result = await editMessage(client, guid, {
          editedMessage: options.message,
          backwardsCompatibilityMessage: options.backwardsCompat ?? options.message,
          partIndex: options.partIndex,
        } satisfies EditMessageInput);
        maybePrint(result.data, options, () => printSuccess(result.message ?? "Message edited.", false));
      }),
    );

  addConnectionOptions(
    addDangerousOption(
      messageCommand.command("unsend").description("Unsend a message (POST /api/v1/message/<GUID>/unsend)"),
    ),
  )
    .argument("<guid>", "GUID of the message to unsend")
    .option("--part-index <n>", "Part index for multi-part messages", (v: string) => Number.parseInt(v, 10))
    .action(withBlueBubblesDeps(({ client }) => async (
      guid: string,
      options: CommandOverrides & OutputOptions & { yes?: boolean; partIndex?: number },
    ) => {
      await requireConfirmation(options, `Unsend message ${guid}?`);
      const result = await unsendMessage(client, guid, {
        partIndex: options.partIndex,
      });
      maybePrint(result.data, options, () => printSuccess(result.message ?? "Message unsent.", false));
    }));

  const scheduleCommand = messageCommand.command("schedule").description("Scheduled message resource operations");

  addConnectionOptions(
    scheduleCommand.command("list").description("List scheduled messages (GET /api/v1/message/schedule)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await getScheduledMessages(client);
    maybePrint(result.data, options, () => {
      if (!result.data || result.data.length === 0) {
        console.log("No scheduled messages.");
        return;
      }
      printScheduledMessages(result.data);
    });
  }));

  addConnectionOptions(
    scheduleCommand.command("get").description("Fetch a scheduled message (GET /api/v1/message/schedule/<ID>)"),
  )
    .argument("<id>", "Scheduled message ID")
    .action(withBlueBubblesDeps(({ client }) => async (id: string, options: CommandOverrides & OutputOptions) => {
      const result = await getScheduledMessage(client, Number.parseInt(id, 10));
      maybePrint(result.data, options, () => printSuccess(result.data ?? {}, false));
    }));

  addConnectionOptions(
    scheduleCommand.command("create").description("Create a scheduled message (POST /api/v1/message/schedule)"),
  )
    .requiredOption("--chat <guid>", "Chat GUID")
    .requiredOption("--message <text>", "Message body")
    .requiredOption("--date <string>", "Scheduled date (ISO8601 string or timestamp)")
    .action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { chat: string; message: string; date: string }) => {
      const scheduledFor = Number.isNaN(Number(options.date))
        ? new Date(options.date).getTime()
        : Number(options.date);
      const result = await createScheduledMessage(client, {
        type: "send-message",
        payload: {
          chatGuid: options.chat,
          message: options.message,
        },
        scheduledFor,
        schedule: {
          type: "once",
        },
      });
      maybePrint(result.data, options, () => printSuccess(`Message scheduled with ID: ${(result.data as { id?: number } | undefined)?.id ?? "unknown"}`, false));
    }));

  addConnectionOptions(
    scheduleCommand.command("update").description("Update a scheduled message (PUT /api/v1/message/schedule/<ID>)"),
  )
    .argument("<id>", "Scheduled message ID")
    .option("--date <string>", "New scheduled date (ISO8601 string or timestamp)")
    .option("--message <text>", "Updated message text")
    .option("--chat <guid>", "Updated chat GUID")
    .action(
      withBlueBubblesDeps(({ client }) => async (
        id: string,
        options: CommandOverrides &
          OutputOptions & {
            date?: string;
            message?: string;
            chat?: string;
          },
      ) => {
        const payload: Record<string, unknown> = {};
        if (options.date) {
          payload.scheduledFor = Number.isNaN(Number(options.date))
            ? new Date(options.date).getTime()
            : Number(options.date);
        }
        if (options.message || options.chat) {
          payload.payload = {
            ...(options.chat ? { chatGuid: options.chat } : {}),
            ...(options.message ? { message: options.message } : {}),
          };
        }
        const result = await updateScheduledMessage(client, Number.parseInt(id, 10), payload);
        maybePrint(result.data, options, () => printSuccess(`Scheduled message ${id} updated.`, false));
      }),
    );

  addConnectionOptions(
    addDangerousOption(
      scheduleCommand.command("delete").description("Delete a scheduled message (DELETE /api/v1/message/schedule/<ID>)"),
    ),
  )
    .argument("<id>", "Scheduled message ID")
    .action(withBlueBubblesDeps(({ client }) => async (id: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Delete scheduled message ${id}?`);
      const result = await deleteScheduledMessage(client, Number.parseInt(id, 10));
      maybePrint(result.data, options, () => printSuccess(`Scheduled message ${id} deleted.`, false));
    }));
}
