import type { Command } from "commander";
import {
  addConnectionOptions,
  maybePrint,
  withBlueBubblesDeps,
} from "../lib/cli-helpers.js";
import { ping } from "../lib/bluebubbles/ping.js";
import { printSuccess } from "../lib/output.js";
import type { CommandOverrides, OutputOptions } from "../lib/types.js";

export function registerPingCommands(program: Command): void {
  addConnectionOptions(
    program.command("ping").description("Ping the BlueBubbles server (GET /api/v1/ping)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await ping(client);
    maybePrint(result.data ?? result, options, () => printSuccess(result.message ?? "pong", false));
  }));
}
