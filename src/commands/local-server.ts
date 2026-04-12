import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  collect,
  maybePrint,
  requireConfirmation,
  withConfig,
} from "../lib/cli-helpers.js";
import {
  printKeyValue,
  printSuccess,
} from "../lib/output.js";
import {
  restartServer,
  serverStatus,
  showLogs,
  startServer,
  stopServer,
} from "../lib/local-server.js";
import type { CommandOverrides, OutputOptions } from "../lib/types.js";

export function registerServerLocalCommands(serverCommand: Command): void {
  const localCommand = serverCommand
    .command("local")
    .description("Local BlueBubbles server process control (no API endpoint)");

  addConnectionOptions(
    localCommand.command("start").description("Start the local BlueBubbles app (local process manager, no API endpoint)"),
  )
    .option("--app-path <path>", "Override the BlueBubbles app bundle or executable path")
    .option("--log-path <path>", "Override the local log file path")
    .option("--arg <value>", "Append a launch argument", collect, [])
    .action(
      async (
        options: CommandOverrides & OutputOptions & { arg: string[]; config?: string },
      ) => {
        const context = await withConfig({
          configPath: options.config,
          appPath: options.appPath,
          logPath: options.logPath,
        });
        const state = await startServer({
          config: context.config,
          statePath: context.statePath,
          defaultLogPath: context.defaultLogPath,
          appPath: options.appPath,
          logPath: options.logPath,
          launchArgs: options.arg.length > 0 ? options.arg : undefined,
        });
        maybePrint(state, options, () => printSuccess(`Started BlueBubbles with PID ${state.pid}`, false));
      },
    );

  addConnectionOptions(
    localCommand.command("status").description("Show local process status (local process manager, no API endpoint)"),
  ).action(async (options: CommandOverrides & OutputOptions & { config?: string }) => {
    const context = await withConfig(options);
    const status = await serverStatus({
      statePath: context.statePath,
      config: context.config,
    });

    const payload: Record<string, unknown> = {
      running: status.running,
      appPath: status.appPath,
      pid: status.state?.pid,
      launchedAt: status.state?.launchedAt,
      logPath: status.state?.logPath ?? context.config.logPath,
    };

    maybePrint(payload, options, () => printKeyValue(payload));
  });

  addConnectionOptions(
    addDangerousOption(
      localCommand.command("stop").description("Stop the local app (local process manager, no API endpoint)"),
    ),
  ).action(async (options: CommandOverrides & OutputOptions & { config?: string; yes?: boolean }) => {
    await requireConfirmation(options, "Stop the local BlueBubbles app?");
    const context = await withConfig(options);
    const state = await stopServer(context.statePath);
    maybePrint(state, options, () => printSuccess(`Stopped BlueBubbles PID ${state.pid}`, false));
  });

  addConnectionOptions(
    addDangerousOption(
      localCommand.command("restart").description("Restart the local app (local process manager, no API endpoint)"),
    ),
  )
    .option("--app-path <path>", "Override the BlueBubbles app bundle or executable path")
    .option("--log-path <path>", "Override the local log file path")
    .option("--arg <value>", "Append a launch argument", collect, [])
    .action(async (options: CommandOverrides & OutputOptions & { arg: string[]; config?: string; yes?: boolean }) => {
      await requireConfirmation(options, "Restart the local BlueBubbles app?");
      const context = await withConfig({
        configPath: options.config,
        appPath: options.appPath,
        logPath: options.logPath,
      });
      const state = await restartServer({
        config: context.config,
        statePath: context.statePath,
        defaultLogPath: context.defaultLogPath,
        appPath: options.appPath,
        logPath: options.logPath,
        launchArgs: options.arg.length > 0 ? options.arg : undefined,
      });
      maybePrint(state, options, () => printSuccess(`Restarted BlueBubbles with PID ${state.pid}`, false));
    });

  localCommand
    .command("logs")
    .description("Show local process logs (local process manager, no API endpoint)")
    .option("--config <path>", "Override the config file location")
    .option("--log-path <path>", "Override the local log file path")
    .option("--count <number>", "Number of log lines to show", (value) => Number.parseInt(value, 10), 100)
    .option("-f, --follow", "Follow the log file")
    .action(async (options: CommandOverrides & { count: number; follow?: boolean; config?: string }) => {
      const context = await withConfig(options);
      await showLogs({
        statePath: context.statePath,
        config: context.config,
        count: options.count,
        follow: options.follow,
        logPath: options.logPath,
      });
    });
}
