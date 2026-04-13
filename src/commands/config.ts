import type { Command } from "commander";
import {
  discoverLocalServerConfig,
  loadConfig,
  loadRawConfig,
  normalizeConfigKey,
  redactSecret,
  setConfigValue,
  unsetConfigValue,
} from "~/lib/config.js";
import { CliError } from "~/lib/errors.js";
import {
  maybePrint,
} from "~/lib/cli-helpers.js";
import {
  printKeyValue,
  printSuccess,
} from "~/lib/output.js";

const formatConfigForDisplay = (config: Record<string, unknown>, reveal = false) => ({
  ...config,
  password: reveal ? config.password : redactSecret(config.password as string | undefined),
});

export function registerConfigCommands(program: Command): void {
  const configCommand = program.command("config").description("Manage persisted BlueBubbles CLI settings");

  configCommand
    .command("set")
    .argument("<key>")
    .argument("<value>")
    .option("--config <path>", "Override the config file location")
    .action(async (key: string, value: string, options: { config?: string }) => {
      const context = await loadConfig({ configPath: options.config });
      const config = await setConfigValue(context.configPath, key, value);
      printSuccess(formatConfigForDisplay(config as Record<string, unknown>), false);
    });

  configCommand
    .command("get")
    .argument("[key]")
    .option("--config <path>", "Override the config file location")
    .option("--reveal", "Show secret values without redaction")
    .option("--json", "Emit machine-readable JSON")
    .action(async (key: string | undefined, options: { config?: string; reveal?: boolean; json?: boolean }) => {
      const context = await loadConfig({ configPath: options.config });
      const data = formatConfigForDisplay(context.config as Record<string, unknown>, options.reveal);

      if (!key) {
        maybePrint(data, options, () => printKeyValue(data));
        return;
      }

      const value = (data as Record<string, unknown>)[normalizeConfigKey(key)];
      maybePrint({ [key]: value }, options, () => printSuccess(`${key}: ${value ?? ""}`));
    });

  configCommand
    .command("unset")
    .argument("<key>")
    .option("--config <path>", "Override the config file location")
    .action(async (key: string, options: { config?: string }) => {
      const context = await loadConfig({ configPath: options.config });
      const config = await unsetConfigValue(context.configPath, key);
      printSuccess(formatConfigForDisplay(config as Record<string, unknown>), false);
    });

  configCommand
    .command("sync")
    .description("Bootstrap baseUrl/password from local BlueBubbles server config.db and persist them")
    .option("--config <path>", "Override the config file location")
    .option("--json", "Emit machine-readable JSON")
    .action(async (options: { config?: string; json?: boolean }) => {
      const context = await loadConfig({ configPath: options.config });

      const discovered = await discoverLocalServerConfig();
      const baseUrl = discovered.baseUrl ?? context.config.baseUrl;
      const password = discovered.password ?? context.config.password;
      if (!baseUrl && !password) {
        throw new CliError("Could not discover local BlueBubbles credentials from config.db.", "not-found");
      }

      let finalConfig = await loadRawConfig(context.configPath);
      if (baseUrl) {
        finalConfig = await setConfigValue(context.configPath, "baseUrl", baseUrl);
      }
      if (password) {
        finalConfig = await setConfigValue(context.configPath, "password", password);
      }

      maybePrint(
        formatConfigForDisplay(finalConfig as Record<string, unknown>),
        options,
        () => {
          printSuccess("Synced and persisted credentials:");
          printKeyValue(formatConfigForDisplay(finalConfig as Record<string, unknown>));
        }
      );
    });
}
