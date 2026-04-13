import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  addJsonInputOptions,
  maybePrint,
  readJsonInput,
  requireConfirmation,
  withBlueBubblesDeps,
} from "~/lib/cli-helpers.js";
import {
  printKeyValue,
  printSuccess,
} from "~/lib/output.js";
import { getSettings, setSettings, deleteSettings } from "~/lib/bluebubbles/settings.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerServerSettingsCommands(serverCommand: Command): void {
  const settingsCommand = serverCommand.command("settings").description("Server settings resource operations");

  addConnectionOptions(settingsCommand.command("get").description("Fetch current settings (GET /api/v1/backup/settings)")).action(
    withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const result = await getSettings(client);
      maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
    }),
  );

  addConnectionOptions(addJsonInputOptions(settingsCommand.command("set").description("Update settings (POST /api/v1/backup/settings)"), "settings JSON"))
    .option("--name <name>", "Backup name", "CLI Settings")
    .action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { file?: string; body?: string; name: string }) => {
      const payload = await readJsonInput(options);
      const result = await setSettings(client, options.name, payload);
      maybePrint(result.data, options, () => printSuccess("Settings updated."));
    }));

  addConnectionOptions(addDangerousOption(settingsCommand.command("delete").description("Delete a setting (DELETE /api/v1/backup/settings/<name>)")))
    .argument("<name>", "Setting name")
    .action(withBlueBubblesDeps(({ client }) => async (name: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Delete setting ${name}?`);
      const result = await deleteSettings(client, name);
      maybePrint(result, options, () => printSuccess(`Setting ${name} deleted.`));
    }));
}
