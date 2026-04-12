import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { existsSync } from "node:fs";
import { APP_NAME } from "./constants.js";
import { CliError } from "./errors.js";
import type { CliConfig, CommandOverrides, ConfigContext } from "./types.js";

const configSchema = z.object({
  baseUrl: z.string().url().optional(),
  password: z.string().min(1).optional(),
  appPath: z.string().min(1).optional(),
  logPath: z.string().min(1).optional(),
  launchArgs: z.array(z.string()).optional(),
});

const keyMap = {
  "base-url": "baseUrl",
  baseUrl: "baseUrl",
  password: "password",
  "app-path": "appPath",
  appPath: "appPath",
  "log-path": "logPath",
  logPath: "logPath",
  "launch-args": "launchArgs",
  launchArgs: "launchArgs",
} as const;

type ConfigKey = (typeof keyMap)[keyof typeof keyMap];

function getBaseDir(): string {
  if (process.platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support", APP_NAME);
  }

  return path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config"),
    APP_NAME,
  );
}

function getBlueBubblesServerDir(): string | undefined {
  if (process.platform !== "darwin") return undefined;
  const serverDir = path.join(homedir(), "Library", "Application Support", "bluebubbles-server");
  return existsSync(serverDir) ? serverDir : undefined;
}

export function resolveConfigPath(override?: string): string {
  return override ?? process.env.BLUEBUBBLES_CONFIG ?? path.join(getBaseDir(), "config.json");
}

function resolveDataDir(configPath: string): string {
  return path.dirname(configPath);
}

function readEnvConfig(): CliConfig {
  const launchArgs = process.env.BLUEBUBBLES_LAUNCH_ARGS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    baseUrl: process.env.BLUEBUBBLES_BASE_URL,
    password: process.env.BLUEBUBBLES_PASSWORD,
    appPath: process.env.BLUEBUBBLES_APP_PATH,
    logPath: process.env.BLUEBUBBLES_LOG_PATH,
    launchArgs: launchArgs && launchArgs.length > 0 ? launchArgs : undefined,
  };
}

export async function discoverLocalServerConfig(): Promise<Partial<Pick<CliConfig, "baseUrl" | "password">>> {
  const serverDir = getBlueBubblesServerDir();
  if (!serverDir) {
    return {};
  }

  const dbPath = path.join(serverDir, "config.db");
  if (!existsSync(dbPath)) {
    return {};
  }

  try {
    // Bootstrap convenience: only attempt local db reads when running with Bun.
    if (!("Bun" in globalThis)) {
      return {};
    }

    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ Database: new (filename: string, options?: { readonly?: boolean }) => {
      query: (sql: string) => { all: () => Array<{ name: string; value: string }> };
      close: () => void;
    } }>;
    const sqlite = await dynamicImport("bun:sqlite");
    const Database = sqlite.Database;

    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .query("SELECT name, value FROM config WHERE name IN ('password', 'server_address')")
      .all();
    db.close();

    const discovered: Partial<Pick<CliConfig, "baseUrl" | "password">> = {};
    for (const row of rows) {
      if (row.name === "password") discovered.password = row.value;
      if (row.name === "server_address") discovered.baseUrl = row.value;
    }
    return discovered;
  } catch {
    return {};
  }
}

export async function loadRawConfig(configPath: string): Promise<CliConfig> {
  try {
    const contents = await readFile(configPath, "utf8");
    return configSchema.parse(JSON.parse(contents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    if (error instanceof z.ZodError) {
      throw new CliError(`Invalid config file at ${configPath}: ${error.message}`, "validation");
    }

    throw error;
  }
}

export async function loadConfig(overrides: CommandOverrides = {}): Promise<ConfigContext> {
  const configPath = resolveConfigPath(overrides.configPath);
  const dataDir = resolveDataDir(configPath);
  const statePath = path.join(dataDir, "runtime.json");
  const defaultLogPath = path.join(dataDir, "logs", "bluebubbles-server.log");
  const persisted = await loadRawConfig(configPath);
  const envConfig = readEnvConfig();
  const config: CliConfig = {
    ...Object.fromEntries(
      Object.entries(persisted).filter(([, v]) => v !== undefined)
    ),
    ...Object.fromEntries(
      Object.entries(envConfig).filter(([, v]) => v !== undefined)
    ),
    ...Object.fromEntries(
      Object.entries(overrides).filter(
        ([key, value]) => key !== "configPath" && value !== undefined,
      ),
    ),
  };

  return {
    config,
    configPath,
    dataDir,
    statePath,
    defaultLogPath,
  };
}


export function normalizeConfigKey(input: string): ConfigKey {
  const key = keyMap[input as keyof typeof keyMap];
  if (!key) {
    throw new CliError(
      `Unsupported config key "${input}". Supported keys: ${Object.keys(keyMap).join(", ")}`,
      "validation",
    );
  }

  return key;
}

function parseConfigValue(key: ConfigKey, value: string): CliConfig[ConfigKey] {
  if (key === "launchArgs") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}

export async function setConfigValue(
  configPath: string,
  keyInput: string,
  rawValue: string,
): Promise<CliConfig> {
  const key = normalizeConfigKey(keyInput);
  const current = await loadRawConfig(configPath);
  const next = {
    ...current,
    [key]: parseConfigValue(key, rawValue),
  };

  const parsed = configSchema.parse(next);
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

export async function unsetConfigValue(configPath: string, keyInput: string): Promise<CliConfig> {
  const key = normalizeConfigKey(keyInput);
  const current = await loadRawConfig(configPath);
  delete current[key];
  const parsed = configSchema.parse(current);
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

export async function ensureDataDirs(config: ConfigContext): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
  await mkdir(path.dirname(config.defaultLogPath), { recursive: true });
}

export function redactSecret(value?: string): string | undefined {
  if (!value) return value;
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-2)}`;
}
