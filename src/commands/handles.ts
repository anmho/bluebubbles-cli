import type { Command } from "commander";
import {
  addConnectionOptions,
  maybePrint,
  withBlueBubblesDeps,
  withPaging,
} from "../lib/cli-helpers.js";
import {
  printHandles,
  printSuccess,
} from "../lib/output.js";
import { getHandleAvailability, queryHandles } from "../lib/bluebubbles/handle.js";
import type { CommandOverrides, OutputOptions } from "../lib/types.js";

export function registerHandleCommands(program: Command): void {
  const handleCommand = program.command("handle").description("Handle resource operations");

  addConnectionOptions(
    withPaging(handleCommand.command("list").description("List handles (POST /api/v1/handle/query)")),
  )
    .option("--address <string>", "Filter by address")
    .action(
      withBlueBubblesDeps(({ client }) => async (
        options: CommandOverrides & OutputOptions & { address?: string; limit?: number; offset?: number },
      ) => {
        const result = await queryHandles(client, {
          address: options.address,
          limit: options.limit,
          offset: options.offset,
        });
        maybePrint(result.data, options, () => {
          if (!result.data || result.data.length === 0) {
            console.log("No handles found.");
            return;
          }
          printHandles(result.data);
        });
      }),
    );

  addConnectionOptions(
    handleCommand.command("availability").description("Check iMessage availability (GET /api/v1/handle/<address>/availability)"),
  )
    .argument("<address>", "Phone number or email")
    .action(withBlueBubblesDeps(({ client }) => async (address: string, options: CommandOverrides & OutputOptions) => {
      const result = await getHandleAvailability(client, address);
      maybePrint(result.data, options, () => {
        const status = result.data?.available ? "AVAILABLE (Blue Bubble)" : "UNAVAILABLE (Green Bubble)";
        printSuccess(`${address}: ${status}`, false);
      });
    }));
}
