import { createReadStream, existsSync } from "node:fs";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { CliError } from "~/lib/errors.js";
import type { CliConfig, RuntimeState } from "~/lib/types.js";

const DEFAULT_APP_CANDIDATES = [
  "/Applications/BlueBubbles.app",
  "/Applications/BlueBubbles Server.app",
  path.join(homedir(), "Applications", "BlueBubbles.app"),
  path.join(homedir(), "Applications", "BlueBubbles Server.app"),
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readRuntimeState(statePath: string): Promise<RuntimeState | null> {
  try {
    const contents = await readFile(statePath, "utf8");
    return JSON.parse(contents) as RuntimeState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeRuntimeState(statePath: string, state: RuntimeState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function clearRuntimeState(statePath: string): Promise<void> {
  await rm(statePath, { force: true });
}

export function ensureMacOS(): void {
  if (process.platform !== "darwin") {
    throw new CliError("Local BlueBubbles server management is only supported on macOS.", "process");
  }
}

export function discoverAppPath(config: CliConfig): string | undefined {
  const candidates = [config.appPath, ...DEFAULT_APP_CANDIDATES].filter(Boolean) as string[];
  return candidates.find((candidate) => existsSync(candidate));
}

async function resolveBundleExecutable(appPath: string): Promise<string> {
  if (!appPath.endsWith(".app")) {
    if (!existsSync(appPath)) {
      throw new CliError(`Configured executable does not exist: ${appPath}`, "process");
    }

    return appPath;
  }

  const plistPath = path.join(appPath, "Contents", "Info.plist");
  if (!existsSync(plistPath)) {
    throw new CliError(`Unable to find Info.plist for app bundle: ${appPath}`, "process");
  }

  const child = spawn("plutil", ["-extract", "CFBundleExecutable", "raw", "-o", "-", plistPath], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));

  const code = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (code !== 0) {
    throw new CliError(
      `Failed to resolve the BlueBubbles app executable: ${Buffer.concat(stderr).toString("utf8").trim()}`,
      "process",
    );
  }

  const executableName = Buffer.concat(stdout).toString("utf8").trim();
  const executablePath = path.join(appPath, "Contents", "MacOS", executableName);
  if (!existsSync(executablePath)) {
    throw new CliError(`Resolved executable does not exist: ${executablePath}`, "process");
  }

  return executablePath;
}

export async function startServer(input: {
  config: CliConfig;
  statePath: string;
  defaultLogPath: string;
  appPath?: string;
  logPath?: string;
  launchArgs?: string[];
}): Promise<RuntimeState> {
  ensureMacOS();
  const existing = await readRuntimeState(input.statePath);
  if (existing?.pid && isRunning(existing.pid)) {
    throw new CliError(`BlueBubbles is already running with PID ${existing.pid}.`, "process", existing);
  }

  const appPath = input.appPath ?? discoverAppPath({ ...input.config, appPath: input.appPath });
  if (!appPath) {
    throw new CliError(
      "Unable to find an installed BlueBubbles app. Set one with `bluebubbles config set appPath /Applications/BlueBubbles.app`.",
      "process",
    );
  }

  const executablePath = await resolveBundleExecutable(appPath);
  const logPath = input.logPath ?? input.config.logPath ?? input.defaultLogPath;
  const args = input.launchArgs ?? input.config.launchArgs ?? [];

  await mkdir(path.dirname(logPath), { recursive: true });
  const logFile = await open(logPath, "a");
  const child = spawn(executablePath, args, {
    cwd: path.dirname(executablePath),
    detached: true,
    stdio: ["ignore", logFile.fd, logFile.fd],
  });

  child.unref();
  await logFile.close();
  await sleep(300);

  if (!isRunning(child.pid!)) {
    throw new CliError("BlueBubbles exited immediately after launch. Check `bluebubbles server logs`.", "process");
  }

  const state: RuntimeState = {
    pid: child.pid!,
    appPath,
    executablePath,
    launchedAt: new Date().toISOString(),
    logPath,
    args,
  };

  await writeRuntimeState(input.statePath, state);
  return state;
}

export async function stopServer(statePath: string): Promise<RuntimeState> {
  ensureMacOS();
  const state = await readRuntimeState(statePath);
  if (!state) {
    throw new CliError("BlueBubbles is not running under CLI control.", "not-found");
  }

  if (!isRunning(state.pid)) {
    await clearRuntimeState(statePath);
    throw new CliError("Tracked BlueBubbles process is no longer running.", "not-found", state);
  }

  process.kill(state.pid, "SIGTERM");
  for (let index = 0; index < 20; index += 1) {
    await sleep(250);
    if (!isRunning(state.pid)) {
      await clearRuntimeState(statePath);
      return state;
    }
  }

  process.kill(state.pid, "SIGKILL");
  await clearRuntimeState(statePath);
  return state;
}

export async function restartServer(input: {
  config: CliConfig;
  statePath: string;
  defaultLogPath: string;
  appPath?: string;
  logPath?: string;
  launchArgs?: string[];
}): Promise<RuntimeState> {
  const existing = await readRuntimeState(input.statePath);
  if (existing?.pid && isRunning(existing.pid)) {
    await stopServer(input.statePath);
  }

  return startServer(input);
}

export async function serverStatus(input: {
  statePath: string;
  config: CliConfig;
}): Promise<{
  running: boolean;
  state: RuntimeState | null;
  appPath?: string;
}> {
  ensureMacOS();
  const state = await readRuntimeState(input.statePath);
  if (!state) {
    return {
      running: false,
      state: null,
      appPath: discoverAppPath(input.config),
    };
  }

  if (!isRunning(state.pid)) {
    await clearRuntimeState(input.statePath);
    return {
      running: false,
      state: null,
      appPath: state.appPath,
    };
  }

  return {
    running: true,
    state,
    appPath: state.appPath,
  };
}

export async function showLogs(input: {
  statePath: string;
  config: CliConfig;
  count: number;
  follow?: boolean;
  logPath?: string;
}): Promise<void> {
  ensureMacOS();
  const state = await readRuntimeState(input.statePath);
  const logPath = input.logPath ?? input.config.logPath ?? state?.logPath;

  if (!logPath) {
    throw new CliError(
      "No local BlueBubbles log file is configured yet. Start the server through the CLI or set `bluebubbles config set logPath /path/to/log`.",
      "not-found",
    );
  }

  if (!existsSync(logPath)) {
    throw new CliError(`Log file does not exist: ${logPath}`, "not-found");
  }

  if (input.follow) {
    const child = spawn("tail", ["-n", String(input.count), "-f", logPath], {
      stdio: "inherit",
    });

    await new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", () => resolve());
    });

    return;
  }

  const stream = createReadStream(logPath, { encoding: "utf8" });
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const lines = chunks.join("").split(/\r?\n/).filter(Boolean).slice(-input.count);
  console.log(lines.join("\n"));
}
