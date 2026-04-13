#!/usr/bin/env bun
import { Command } from "commander";
import { APP_NAME } from "~/lib/constants.js";
import { printError } from "~/lib/output.js";
import { toCliError } from "~/lib/errors.js";
import { registerConfigCommands } from "~/commands/config.js";
import { registerServerCommands } from "~/commands/server.js";
import { registerChatCommands } from "~/commands/chats.js";
import { registerMessageCommands } from "~/commands/messages.js";
import { registerHandleCommands } from "~/commands/handles.js";
import { registerAttachmentCommands } from "~/commands/attachments.js";
import { registerICloudCommands } from "~/commands/icloud.js";
import { registerContactCommands } from "~/commands/contacts.js";
import { registerPingCommands } from "~/commands/ping.js";
import { registerDoctorCommands } from "~/commands/doctor.js";
import { registerWebhookCommands } from "~/commands/webhooks.js";
import { getCliVersion } from "~/lib/version.js";

function wantsJsonOutput(argv: string[]): boolean {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--json") return true;
    if ((token === "-o" || token === "--output") && argv[index + 1]?.toLowerCase() === "json") {
      return true;
    }
    if (token.startsWith("--output=") && token.slice("--output=".length).toLowerCase() === "json") {
      return true;
    }
    if (token.startsWith("-o=") && token.slice("-o=".length).toLowerCase() === "json") {
      return true;
    }
  }
  return false;
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name(APP_NAME)
    .description("Curated BlueBubbles CLI organized around relevant resources and endpoint-mapped actions")
    .version(getCliVersion());

  registerConfigCommands(program);
  registerDoctorCommands(program);
  registerPingCommands(program);
  registerServerCommands(program);
  registerChatCommands(program);
  registerMessageCommands(program);
  registerHandleCommands(program);
  registerAttachmentCommands(program);
  registerContactCommands(program);
  registerICloudCommands(program);
  registerWebhookCommands(program);

  return program;
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const program = createProgram();
  program.exitOverride();

  try {
    await program.parseAsync(["node", APP_NAME, ...argv]);
    return 0;
  } catch (error) {
    const commandError = error as { code?: string; exitCode?: number };
    if (commandError.code === "commander.helpDisplayed" || commandError.code === "commander.version") {
      return 0;
    }

    const cliError = toCliError(error);
    const json = wantsJsonOutput(argv);
    printError(cliError, json);
    return cliError.exitCode;
  }
}

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
