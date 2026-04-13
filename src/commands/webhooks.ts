import type { Command } from "commander";
import {
  maybePrint,
} from "~/lib/cli-helpers.js";
import {
  printSuccess,
} from "~/lib/output.js";
import {
  serveWebhookReceiver,
  validateWebhookPayload,
} from "~/lib/webhooks.js";
import { WEBHOOK_DEFAULT_PATH } from "~/lib/constants.js";
import type { OutputOptions } from "~/lib/types.js";

export function registerWebhookCommands(program: Command): void {
  const webhookCommand = program.command("webhook").description("Webhook validation and local receiver tooling");

  webhookCommand
    .command("validate")
    .description("Validate a BlueBubbles webhook payload from a file or stdin (local tool, no API endpoint)")
    .argument("[file]")
    .option("--json", "Emit machine-readable JSON")
    .action(async (file: string | undefined, options: OutputOptions) => {
      const payload = await validateWebhookPayload(file);
      maybePrint(payload, options, () => printSuccess((payload as { type: string }).type, false));
    });

  webhookCommand
    .command("serve")
    .description("Start a local webhook receiver for BlueBubbles payloads (local tool, no API endpoint)")
    .option("--port <number>", "Port to listen on", (value) => Number.parseInt(value, 10), 8000)
    .option("--path <path>", "Route path to receive POSTed webhook payloads", WEBHOOK_DEFAULT_PATH)
    .option("--json", "Log received payloads as JSON")
    .action(async (options: { port: number; path: string } & OutputOptions) => {
      await serveWebhookReceiver({
        port: options.port,
        routePath: options.path,
        output: options,
      });
    });
}
