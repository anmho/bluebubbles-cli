import type { Command } from "commander";
import {
  addConnectionOptions,
  addDangerousOption,
  clientFromOptions,
  collect,
  maybePrint,
  requireConfirmation,
  withConfig,
} from "../lib/cli-helpers.js";
import { CliError } from "../lib/errors.js";
import {
  printKeyValue,
  printSuccess,
} from "../lib/output.js";
import { getRemoteLogs } from "../lib/bluebubbles/server.js";
import {
  restartServer,
  serverStatus,
  showLogs,
  startServer,
  stopServer,
} from "../lib/local-server.js";
import type { CommandOverrides, OutputOptions } from "../lib/types.js";

export function registerServerLifecycleCommands(serverCommand: Command): void {
  addConnectionOptions(
    serverCommand.command("start").description("Start the local BlueBubbles app (local process manager, no API endpoint)"),
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
    serverCommand.command("status").description("Show local process status (local process manager, no API endpoint)"),
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
      serverCommand.command("stop").description("Stop the local app (local process manager, no API endpoint)"),
    ),
  ).action(async (options: CommandOverrides & OutputOptions & { config?: string; yes?: boolean }) => {
    await requireConfirmation(options, "Stop the local BlueBubbles app?");
    const context = await withConfig(options);
    const state = await stopServer(context.statePath);
    maybePrint(state, options, () => printSuccess(`Stopped BlueBubbles PID ${state.pid}`, false));
  });

  addConnectionOptions(
    addDangerousOption(
      serverCommand.command("restart").description("Restart the local app (local process manager, no API endpoint)"),
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

  addConnectionOptions(
    serverCommand
      .command("logs")
      .description("Show server logs (local process manager by default; use --source api for GET /api/v1/server/logs)")
      .option("--source <source>", "Log source (local|api)", "local"),
  )
    .option("--log-path <path>", "Override the local log file path")
    .option("--count <number>", "Number of log lines to show", (value) => Number.parseInt(value, 10), 100)
    .option("-f, --follow", "Follow the log file")
    .action(async (options: CommandOverrides & OutputOptions & { count: number; follow?: boolean; config?: string; source?: string }) => {
      const source = (options.source ?? "local").toLowerCase();
      if (source === "api") {
        if (options.follow) {
          throw new CliError("`--follow` is only supported with `--source local`.", "validation");
        }
        const client = await clientFromOptions(options);
        const result = await getRemoteLogs(client, options.count);
        maybePrint(result.data, options, () => printSuccess(result.data ?? "", false));
        return;
      }
      if (source !== "local") {
        throw new CliError(`Unsupported log source "${options.source}". Use: local, api`, "validation");
      }
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
