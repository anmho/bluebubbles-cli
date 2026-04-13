import type { Command } from "commander";
import {
  addConnectionOptions,
  collect,
  isWideOutput,
  maybePrint,
  withBlueBubblesDeps,
} from "~/lib/cli-helpers.js";
import {
  listContacts,
  queryContacts,
} from "~/lib/bluebubbles/contact.js";
import { printContacts } from "~/lib/output.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerContactCommands(program: Command): void {
  const contactCommand = program.command("contact").description("Contact resource operations");

  addConnectionOptions(
    contactCommand.command("list").description("List contacts (GET /api/v1/contact)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await listContacts(client);
    maybePrint(result.data, options, () => {
      if (!result.data || result.data.length === 0) {
        console.log("No contacts found.");
        return;
      }
      printContacts(result.data, isWideOutput(options));
    });
  }));

  addConnectionOptions(
    contactCommand.command("query").description("Query contacts (POST /api/v1/contact/query)"),
  )
    .option("--address <value>", "Address to include in the query", collect, [])
    .action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { address: string[] }) => {
      const result = await queryContacts(client, {
        addresses: options.address.length > 0 ? options.address : undefined,
      });
      maybePrint(result.data, options, () => {
        if (!result.data || result.data.length === 0) {
          console.log("No contacts found.");
          return;
        }
        printContacts(result.data, isWideOutput(options));
      });
    }));
}
