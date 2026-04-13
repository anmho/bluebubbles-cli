import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  maybePrint,
  requireConfirmation,
  withBlueBubblesDeps,
} from "~/lib/cli-helpers.js";
import {
  printAlerts,
  printKeyValue,
  printSuccess,
} from "~/lib/output.js";
import { CliError } from "~/lib/errors.js";
import {
  checkServerUpdate,
  getAlerts,
  getServerInfo,
  installServerUpdate,
  markAlertRead,
  restartApp,
  restartServices,
} from "~/lib/bluebubbles/server.js";
import { registerServerLifecycleCommands } from "~/commands/local-server.js";
import { registerServerSettingsCommands } from "~/commands/settings.js";
import { registerServerThemeCommands } from "~/commands/themes.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerServerCommands(program: Command): void {
  const serverCommand = program
    .command("server")
    .description("BlueBubbles server resource operations");

  addConnectionOptions(
    serverCommand.command("info").description("Fetch server metadata (GET /api/v1/server/info)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { config?: string }) => {
    const result = await getServerInfo(client);
    maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
  }));

  const alertCommand = serverCommand
    .command("alert")
    .description("Server alerts resource");

  addConnectionOptions(
    alertCommand.command("list").description("List server alerts (GET /api/v1/server/alert)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await getAlerts(client);
    maybePrint(result.data, options, () => {
      if (!result.data || result.data.length === 0) {
        console.log("No alerts.");
        return;
      }
      printAlerts(result.data);
    });
  }));

  addConnectionOptions(
    alertCommand.command("read").description("Mark alerts as read (POST /api/v1/server/alert/read)"),
  )
    .argument("<ids>", "Comma-separated alert IDs")
    .action(withBlueBubblesDeps(({ client }) => async (ids: string, options: CommandOverrides & OutputOptions) => {
      const idArray = ids
        .split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
      const result = await markAlertRead(client, idArray);
      maybePrint(result.data, options, () => printSuccess(`Alerts ${ids} marked as read.`, false));
    }));

  const updateCommand = serverCommand
    .command("update")
    .description("Server update operations");

  addConnectionOptions(
    updateCommand.command("check").description("Check for server updates (GET /api/v1/server/update/check)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await checkServerUpdate(client);
    maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
  }));

  addConnectionOptions(
    addDangerousOption(
      updateCommand.command("install").description("Install an available update (POST /api/v1/server/update/install)"),
    ),
  )
    .option("--wait", "Wait for installation to complete")
    .action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { wait?: boolean; yes?: boolean }) => {
      await requireConfirmation(options, "Install the available BlueBubbles server update?");
      const result = await installServerUpdate(client, !!options.wait);
      maybePrint(result.data, options, () => printSuccess("Update installation initiated.", false));
    }));

  addConnectionOptions(
    addDangerousOption(
      serverCommand.command("restart-services").description("Restart internal services (GET /api/v1/server/restart/soft)"),
    ),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
    await requireConfirmation(options, "Restart BlueBubbles internal services?");
    const result = await restartServices(client);
    maybePrint(result.data, options, () => printSuccess("Services restarted.", false));
  }));

  addConnectionOptions(
    addDangerousOption(
      serverCommand.command("restart-app").description("Restart the app (GET /api/v1/server/restart/hard)"),
    ),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { yes?: boolean }) => {
    await requireConfirmation(options, "Restart the BlueBubbles app?");
    const result = await restartApp(client);
    maybePrint(result.data, options, () => printSuccess("App restart initiated.", false));
  }));

  registerServerLifecycleCommands(serverCommand);
  registerServerSettingsCommands(serverCommand);
  registerServerThemeCommands(serverCommand);

  serverCommand
    .command("local")
    .description("Deprecated command namespace")
    .argument("[command]", "Deprecated local subcommand")
    .argument("[...rest]", "Additional deprecated local arguments")
    .action(() => {
      throw new CliError(
        "`bluebubbles server local ...` has been removed. Use `bluebubbles server start|status|stop|restart|logs`.",
        "validation",
      );
    });
}
