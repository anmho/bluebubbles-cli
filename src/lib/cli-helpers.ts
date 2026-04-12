import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import {
  ensureDataDirs,
  loadConfig,
} from "./config.js";
import { CliError } from "./errors.js";
import { printJson } from "./output.js";
import type { CommandOverrides, OutputFormat, OutputOptions } from "./types.js";
import { BlueBubblesClient } from "./bluebubbles/client.js";
import type { ApiConfig } from "./bluebubbles/client.js";

export function collect(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

export function addConnectionOptions(command: Command): Command {
  return command
    .option("--config <path>", "Override the config file location")
    .option("--base-url <url>", "BlueBubbles API base URL")
    .option("--password <password>", "BlueBubbles server password")
    .option("-o, --output <format>", "Output format (table|json)", parseOutputFormat)
    .option("--json", "Alias for -o json");
}

function parseOutputFormat(value: string): OutputFormat {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "table" && normalized !== "json") {
    throw new CliError(`Unsupported output format "${value}". Use: table, json`, "validation");
  }
  return normalized as OutputFormat;
}

export function getConfigOverride(options: { config?: string }): Pick<CommandOverrides, "configPath"> {
  return { configPath: options.config };
}

export async function apiConfigFromOptions(
  options: CommandOverrides & { config?: string },
): Promise<ApiConfig> {
  const { config } = await loadConfig({
    ...getConfigOverride(options),
    baseUrl: options.baseUrl,
    password: options.password,
    appPath: options.appPath,
    logPath: options.logPath,
  });
  if (!config.baseUrl) {
    throw new CliError("BlueBubbles base URL is required. Use --base-url or `bluebubbles config set baseUrl <url>`.", "validation");
  }
  if (!config.password) {
    throw new CliError("BlueBubbles password is required. Use --password or `bluebubbles config set password <value>`.", "validation");
  }

  return {
    baseUrl: config.baseUrl,
    password: config.password,
  };
}

export async function clientFromOptions(
  options: CommandOverrides & { config?: string },
): Promise<BlueBubblesClient> {
  const config = await apiConfigFromOptions(options);
  return new BlueBubblesClient(config);
}

export interface BlueBubblesDeps {
  client: BlueBubblesClient;
}

export function withBlueBubblesDeps<TArgs extends unknown[]>(
  createHandler: (deps: BlueBubblesDeps) => (...args: TArgs) => Promise<void>,
): (...args: TArgs) => Promise<void> {
  return async (...args: TArgs) => {
    const commandArg = args[args.length - 1];
    if (
      commandArg &&
      typeof commandArg === "object" &&
      "optsWithGlobals" in commandArg &&
      typeof (commandArg as { optsWithGlobals?: unknown }).optsWithGlobals === "function"
    ) {
      const commandOptions = (commandArg as { optsWithGlobals: () => object }).optsWithGlobals();
      const client = await clientFromOptions(commandOptions as CommandOverrides & { config?: string });
      const deps: BlueBubblesDeps = { client };
      return createHandler(deps)(...args);
    }

    const maybeOptions = [...args]
      .reverse()
      .find((value) => value && typeof value === "object" && !("optsWithGlobals" in (value as object)));

    if (!maybeOptions || typeof maybeOptions !== "object") {
      throw new CliError("Unable to resolve command options for dependency injection.", "general");
    }

    const client = await clientFromOptions(maybeOptions as CommandOverrides & { config?: string });
    const deps: BlueBubblesDeps = { client };
    return createHandler(deps)(...args);
  };
}

export function maybePrint(data: unknown, output: OutputOptions, human: () => void): void {
  if (output.json || output.output === "json") {
    printJson({ ok: true, data });
    return;
  }

  human();
}

export async function withConfig(options: CommandOverrides) {
  const configContext = await loadConfig({
    configPath: (options as CommandOverrides & { config?: string }).config ?? options.configPath,
    baseUrl: options.baseUrl,
    password: options.password,
    appPath: options.appPath,
    logPath: options.logPath,
  });
  await ensureDataDirs(configContext);
  return configContext;
}

export function withPaging(command: Command): Command {
  return command
    .option("--limit <number>", "Result limit", (value) => Number.parseInt(value, 10))
    .option("--offset <number>", "Result offset", (value) => Number.parseInt(value, 10))
    .option("--sort <direction>", "Sort direction")
    .option("--with <item>", "Include related data", (value, previous: string[]) => [...previous, value], []);
}

export function addDangerousOption(command: Command): Command {
  return command.option("-y, --yes", "Confirm the operation without prompting");
}

export async function requireConfirmation(
  options: { yes?: boolean },
  message: string,
): Promise<void> {
  if (options.yes) return;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError(`${message} Re-run with --yes to confirm.`, "validation");
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(`${message} [y/N] `);
    if (!/^y(es)?$/i.test(answer.trim())) {
      throw new CliError("Operation cancelled.", "general");
    }
  } finally {
    rl.close();
  }
}

export function addJsonInputOptions(command: Command, label: string): Command {
  return command
    .option("--file <path>", `Read ${label} from a JSON file`)
    .option("--body <json>", `Provide ${label} as an inline JSON string`);
}

export async function readJsonInput(options: {
  file?: string;
  body?: string;
}): Promise<unknown> {
  const hasFile = typeof options.file === "string";
  const hasBody = typeof options.body === "string";

  if (hasFile && hasBody) {
    throw new CliError("Use either --file or --body, not both.", "validation");
  }

  if (hasFile) {
    return JSON.parse(await readFile(options.file!, "utf8"));
  }

  if (hasBody) {
    return JSON.parse(options.body!);
  }

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }

    const stdin = Buffer.concat(chunks).toString("utf8").trim();
    if (stdin.length > 0) {
      return JSON.parse(stdin);
    }
  }

  throw new CliError("Provide JSON input with --file, --body, or stdin.", "validation");
}
