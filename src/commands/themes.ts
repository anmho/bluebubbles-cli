import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  addJsonInputOptions,
  maybePrint,
  readJsonInput,
  requireConfirmation,
  withBlueBubblesDeps,
} from "../lib/cli-helpers.js";
import {
  printThemes,
  printSuccess,
} from "../lib/output.js";
import { getThemes, setTheme, deleteTheme } from "../lib/bluebubbles/theme.js";
import type { CommandOverrides, OutputOptions } from "../lib/types.js";

export function registerServerThemeCommands(serverCommand: Command): void {
  const themesCommand = serverCommand.command("theme").description("Server theme resource operations");

  addConnectionOptions(themesCommand.command("list").description("List themes (GET /api/v1/backup/theme)")).action(
    withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
      const result = await getThemes(client);
      maybePrint(result.data, options, () => {
        if (!result.data || result.data.length === 0) {
          console.log("No themes found.");
          return;
        }
        printThemes(result.data);
      });
    }),
  );

  addConnectionOptions(addJsonInputOptions(themesCommand.command("set").description("Create or update a theme (POST /api/v1/backup/theme)"), "theme JSON"))
    .argument("<name>", "Theme name")
    .action(withBlueBubblesDeps(({ client }) => async (name: string, options: CommandOverrides & OutputOptions & { file?: string; body?: string }) => {
      const payload = await readJsonInput(options);
      const result = await setTheme(client, name, payload);
      maybePrint(result.data, options, () => printSuccess(`Theme ${name} updated.`));
    }));

  addConnectionOptions(addDangerousOption(themesCommand.command("delete").description("Delete a theme (DELETE /api/v1/backup/theme/<name>)")))
    .argument("<name>", "Theme name")
    .action(withBlueBubblesDeps(({ client }) => async (name: string, options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
      await requireConfirmation(options, `Delete theme ${name}?`);
      const result = await deleteTheme(client, name);
      maybePrint(result, options, () => printSuccess(`Theme ${name} deleted.`));
    }));
}
