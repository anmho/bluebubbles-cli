import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  maybePrint,
  requireConfirmation,
  withBlueBubblesDeps,
  withPaging,
} from "~/lib/cli-helpers.js";
import {
  printChats,
  printMessages,
  printSuccess,
} from "~/lib/output.js";
import {
  addParticipant,
  deleteChat,
  getChat,
  leaveChat,
  listChatMessages,
  listChats,
  removeGroupIcon,
  removeParticipant,
  setGroupIcon,
  startTyping,
  stopTyping,
  updateChat,
} from "~/lib/bluebubbles/chat.js";
import { DEFAULT_CHAT_WITH, DEFAULT_MESSAGE_WITH } from "~/lib/constants.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerChatCommands(program: Command): void {
  const chatCommand = program.command("chat").description("Chat resource operations");

  addConnectionOptions(
    withPaging(chatCommand.command("list").description("List chats (POST /api/v1/chat/query)")),
  ).action(
    withBlueBubblesDeps(({ client }) => async (
      options: CommandOverrides & OutputOptions & {
        limit?: number;
        offset?: number;
        sort?: string;
        with: string[];
        config?: string;
      },
    ) => {
      const result = await listChats(client, {
        limit: options.limit,
        offset: options.offset,
        sort: options.sort,
        with: options.with.length > 0 ? options.with : [...DEFAULT_CHAT_WITH],
      });
      const chats = result.data ?? [];
      maybePrint(chats, options, () => printChats(chats));
    }),
  );

  addConnectionOptions(
    chatCommand.command("get").description("Fetch a chat by GUID (GET /api/v1/chat/<Chat GUID>)"),
  )
    .argument("<guid>")
    .option("--with <item>", "Include related data", (value, previous: string[] = []) => [...previous, value], [])
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { with: string[] }) => {
      const result = await getChat(
        client,
        guid,
        options.with.length > 0 ? options.with : [...DEFAULT_CHAT_WITH],
      );
      maybePrint(result.data, options, () => printSuccess(result.data ?? {}, false));
    }));

  addConnectionOptions(
    withPaging(chatCommand.command("messages").description("List messages for a chat (GET /api/v1/chat/<Chat GUID>/message)"), 50),
  )
    .argument("<guid>")
    .option("--after <epochSeconds>", "Only include messages after this epoch seconds value")
    .option("--before <epochSeconds>", "Only include messages before this epoch seconds value")
    .action(
      withBlueBubblesDeps(({ client }) => async (
        guid: string,
        options: CommandOverrides &
          OutputOptions & {
            limit?: number;
            offset?: number;
            sort?: string;
            with: string[];
            after?: string;
            before?: string;
          },
      ) => {
        const result = await listChatMessages(client, {
          chatGuid: guid,
          limit: options.limit,
          offset: options.offset,
          sort: options.sort,
          after: options.after,
          before: options.before,
          with: options.with.length > 0 ? options.with : [...DEFAULT_MESSAGE_WITH],
        });
        maybePrint(result.data ?? [], options, () => printMessages(result.data ?? []));
      }),
    );

  addConnectionOptions(
    chatCommand.command("update").description("Update a chat (PUT /api/v1/chat/<Chat GUID>)"),
  )
    .argument("<guid>")
    .requiredOption("--name <string>", "New display name")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { name: string }) => {
      const result = await updateChat(client, guid, options.name);
      maybePrint(result.data, options, () => printSuccess(`Chat name updated to: ${options.name}`, false));
    }));

  addConnectionOptions(
    addDangerousOption(
      chatCommand.command("delete").description("Delete a chat (DELETE /api/v1/chat/<Chat GUID>)"),
    ),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Delete chat ${guid}?`);
      const result = await deleteChat(client, guid);
      maybePrint(result.data, options, () => printSuccess("Chat deleted.", false));
    }));

  const groupCommand = chatCommand.command("group").description("Group-specific chat operations");

  addConnectionOptions(
    addDangerousOption(
      groupCommand.command("leave").description("Leave a group chat (POST /api/v1/chat/<Chat GUID>/leave)"),
    ),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Leave group chat ${guid}?`);
      const result = await leaveChat(client, guid);
      maybePrint(result.data, options, () => printSuccess("Left the chat.", false));
    }));

  const participantCommand = groupCommand.command("participant").description("Manage group chat participants");

  addConnectionOptions(
    participantCommand.command("add").description("Add a participant (POST /api/v1/chat/<Chat GUID>/participant)"),
  )
    .argument("<guid>")
    .argument("<address>", "Participant address")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, address: string, options: CommandOverrides & OutputOptions) => {
      const result = await addParticipant(client, guid, address);
      maybePrint(result.data, options, () => printSuccess(`Added participant: ${address}`, false));
    }));

  addConnectionOptions(
    addDangerousOption(
      participantCommand.command("remove").description("Remove a participant (DELETE /api/v1/chat/<Chat GUID>/participant)"),
    ),
  )
    .argument("<guid>")
    .argument("<address>", "Participant address")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, address: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Remove ${address} from group chat ${guid}?`);
      const result = await removeParticipant(client, guid, address);
      maybePrint(result.data, options, () => printSuccess(`Removed participant: ${address}`, false));
    }));

  const iconCommand = groupCommand.command("icon").description("Manage group chat icons");

  addConnectionOptions(
    iconCommand.command("set").description("Set a group icon (POST /api/v1/chat/<Chat GUID>/icon)"),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions) => {
      const result = await setGroupIcon(client, guid);
      maybePrint(result.data, options, () => printSuccess("Group icon set.", false));
    }));

  addConnectionOptions(
    addDangerousOption(
      iconCommand.command("remove").description("Remove a group icon (DELETE /api/v1/chat/<Chat GUID>/icon)"),
    ),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Remove the group icon for ${guid}?`);
      const result = await removeGroupIcon(client, guid);
      maybePrint(result.data, options, () => printSuccess("Group icon removed.", false));
    }));

  const typingCommand = chatCommand.command("typing").description("Typing indicator operations");

  addConnectionOptions(
    typingCommand.command("start").description("Start typing indicators (POST /api/v1/chat/<Chat GUID>/typing)"),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions) => {
      await startTyping(client, guid);
      maybePrint({}, options, () => printSuccess("Typing indicator started.", false));
    }));

  addConnectionOptions(
    typingCommand.command("stop").description("Stop typing indicators (DELETE /api/v1/chat/<Chat GUID>/typing)"),
  )
    .argument("<guid>")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions) => {
      await stopTyping(client, guid);
      maybePrint({}, options, () => printSuccess("Typing indicator stopped.", false));
    }));
}
