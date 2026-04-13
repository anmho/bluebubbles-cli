import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { loadRawConfig, resolveConfigPath } from "../src/lib/config.js";
import { runCli } from "../src/index.js";

type Case = {
  name: string;
  argv: string[];
  ok: number[];
  requiresApi?: boolean;
  requiresDarwin?: boolean;
  destructive?: boolean;
  longRunning?: boolean;
  acceptsConnection?: boolean;
};

type Result = {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  exitCode?: number;
  reason?: string;
};

type ParsedCliError = {
  kind?: string;
  message?: string;
  status?: number;
};

type ApiPreflight = {
  ready: boolean;
  reason?: string;
};

const strict = process.env.TEST_COMMANDS_STRICT === "1";
const allowDestructive = process.env.TEST_COMMANDS_ALLOW_DESTRUCTIVE === "1";
const runLongRunning = process.env.TEST_COMMANDS_RUN_LONG_RUNNING === "1";

const chatGuid = process.env.TEST_COMMANDS_CHAT_GUID ?? "iMessage;+;chat1";
const messageGuid = process.env.TEST_COMMANDS_MESSAGE_GUID ?? "msg1";
const attachmentGuid = process.env.TEST_COMMANDS_ATTACHMENT_GUID ?? "att1";
const scheduleId = process.env.TEST_COMMANDS_SCHEDULE_ID ?? "1";
const address = process.env.TEST_COMMANDS_ADDRESS ?? "user@example.com";
const aliasEmail = process.env.TEST_COMMANDS_ALIAS_EMAIL ?? "alias@icloud.com";

function normalizeEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readRawDotEnvValue(key: string): Promise<string | undefined> {
  try {
    const envText = await readFile(path.join(process.cwd(), ".env"), "utf8");
    for (const line of envText.split(/\r?\n/)) {
      if (line.startsWith(`${key}=`)) {
        return normalizeEnvValue(line.slice(key.length + 1));
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function resolveConnectionArgs(): Promise<string[]> {
  const rawDefaultBaseUrl = await readRawDotEnvValue("BLUEBUBBLES_BASE_URL");
  const rawDefaultPassword = await readRawDotEnvValue("BLUEBUBBLES_PASSWORD");
  if (rawDefaultBaseUrl && rawDefaultPassword) {
    return ["--base-url", rawDefaultBaseUrl, "--password", rawDefaultPassword];
  }

  const envDefaultBaseUrl = process.env.BLUEBUBBLES_BASE_URL;
  const envDefaultPassword = process.env.BLUEBUBBLES_PASSWORD;
  if (envDefaultBaseUrl && envDefaultPassword) {
    return ["--base-url", envDefaultBaseUrl, "--password", envDefaultPassword];
  }

  const configPath = resolveConfigPath(
    process.env.TEST_COMMANDS_CONFIG ?? process.env.BLUEBUBBLES_CONFIG,
  );
  const persisted = await loadRawConfig(configPath);
  if (persisted.baseUrl && persisted.password) {
    return ["--base-url", persisted.baseUrl, "--password", persisted.password];
  }

  return [];
}

async function runCliCaptured(argv: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleTable = console.table;

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stderr.write;
  console.log = (...args: unknown[]) => {
    stdoutChunks.push(`${args.map((arg) => String(arg)).join(" ")}\n`);
  };
  console.error = (...args: unknown[]) => {
    stderrChunks.push(`${args.map((arg) => String(arg)).join(" ")}\n`);
  };
  console.table = (tabularData: unknown) => {
    stdoutChunks.push(`${JSON.stringify(tabularData)}\n`);
  };

  try {
    const exitCode = await runCli(argv);
    return { exitCode, stdout: stdoutChunks.join(""), stderr: stderrChunks.join("") };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.table = originalConsoleTable;
  }
}

function firstNonEmpty(...values: string[]): string | undefined {
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function parseCliJson(stream: string): { error?: ParsedCliError } | undefined {
  const text = stream.trim();
  if (!text) return undefined;

  const candidates: string[] = [text];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.trim().startsWith("{")) {
      candidates.push(lines.slice(index).join("\n"));
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim()) as {
        ok?: boolean;
        error?: { kind?: string; message?: string; details?: { status?: number } };
      };
      if (parsed.ok === false) {
        return {
          error: {
            kind: parsed.error?.kind,
            message: parsed.error?.message,
            status: parsed.error?.details?.status,
          },
        };
      }
    } catch {
      // ignore malformed candidates
    }
  }

  return undefined;
}

function extractJsonError(stream: string): string | undefined {
  const parsed = parseCliJson(stream);
  if (!parsed?.error?.message) return undefined;
  const kind = parsed.error.kind ? `[${parsed.error.kind}] ` : "";
  return `${kind}${parsed.error.message}`;
}

function summarizeFailure(
  result: { exitCode: number; stdout: string; stderr: string },
  argv: string[],
): string {
  const jsonError = extractJsonError(result.stdout) ?? extractJsonError(result.stderr);
  if (jsonError) return jsonError;

  const fallback = firstNonEmpty(result.stderr, result.stdout);
  if (fallback) return fallback;

  return `Unexpected exit=${result.exitCode} command=${argv.join(" ")}`;
}

function withConnection(argv: string[], connectionArgs: string[], acceptsConnection = true): string[] {
  if (!acceptsConnection || connectionArgs.length === 0) return argv;
  return [...argv, ...connectionArgs];
}

function classifyApiPreflight(result: { exitCode: number; stdout: string; stderr: string }): ApiPreflight {
  if (result.exitCode === 0) {
    return { ready: true };
  }

  const parsed = parseCliJson(result.stdout) ?? parseCliJson(result.stderr);
  const kind = parsed?.error?.kind ?? "";
  const status = parsed?.error?.status;

  if (kind === "auth" || status === 401) {
    return {
      ready: false,
      reason: "API unauthorized in preflight (401). Check BLUEBUBBLES_PASSWORD or persisted config password.",
    };
  }

  return {
    ready: false,
    reason: "API unavailable in preflight. Check BLUEBUBBLES_BASE_URL (or persisted config baseUrl) and server reachability.",
  };
}

async function getFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to acquire free port");
  }
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function probeWebhookServe(): Promise<Result> {
  if (!runLongRunning) {
    return { name: "webhook serve", status: "SKIP", reason: "TEST_COMMANDS_RUN_LONG_RUNNING=1 not set." };
  }

  let port: number;
  try {
    port = await getFreePort();
  } catch (error) {
    return { name: "webhook serve", status: "FAIL", reason: (error as Error).message };
  }

  const proc = Bun.spawn(
    ["bun", "run", "src/index.ts", "webhook", "serve", "--port", String(port), "--path", "/bluebubbles/test-hook"],
    { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" },
  );

  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 1200));
  const exited = proc.exited.then((code) => ({ code }));
  const race = await Promise.race([timeout, exited]);

  if (race === "timeout") {
    proc.kill();
    await proc.exited;
    return { name: "webhook serve", status: "PASS", exitCode: 0 };
  }

  const stdout = (await new Response(proc.stdout).text()).trim();
  const stderr = (await new Response(proc.stderr).text()).trim();
  return {
    name: "webhook serve",
    status: "FAIL",
    exitCode: race.code,
    reason: `Exited early. stdout=${stdout} stderr=${stderr}`,
  };
}

async function runCase(testCase: Case, apiPreflight: ApiPreflight, connectionArgs: string[]): Promise<Result> {
  if (testCase.requiresDarwin && process.platform !== "darwin") {
    return { name: testCase.name, status: "SKIP", reason: "macOS-only command." };
  }
  if (testCase.destructive && !allowDestructive) {
    return { name: testCase.name, status: "SKIP", reason: "TEST_COMMANDS_ALLOW_DESTRUCTIVE=1 not set." };
  }
  if (testCase.longRunning) {
    return probeWebhookServe();
  }
  if (testCase.requiresApi && !apiPreflight.ready) {
    return { name: testCase.name, status: "SKIP", reason: apiPreflight.reason ?? "API unavailable in preflight." };
  }

  const argv = withConnection(testCase.argv, connectionArgs, testCase.acceptsConnection ?? true);
  const result = await runCliCaptured(argv);

  if (testCase.ok.includes(result.exitCode)) {
    return { name: testCase.name, status: "PASS", exitCode: result.exitCode };
  }

  return {
    name: testCase.name,
    status: "FAIL",
    exitCode: result.exitCode,
    reason: summarizeFailure(result, argv),
  };
}

async function main(): Promise<number> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bb-cli-test-commands-"));
  const tmpConfig = path.join(tmpDir, "config.json");
  const settingsFile = path.join(tmpDir, "settings.json");
  const themeFile = path.join(tmpDir, "theme.json");
  const attachmentOut = path.join(tmpDir, "attachment.bin");
  const attachmentForceOut = path.join(tmpDir, "attachment-force.bin");
  const webhookPayload = path.join(tmpDir, "webhook-invalid.json");

  await writeFile(settingsFile, JSON.stringify({ darkMode: false }));
  await writeFile(themeFile, JSON.stringify({ accent: "blue" }));
  await writeFile(webhookPayload, JSON.stringify({ invalid: true }));

  const connectionArgs = await resolveConnectionArgs();
  const pingPreflight = await runCliCaptured(withConnection(["ping", "--json"], connectionArgs, true));
  const apiPreflight = classifyApiPreflight(pingPreflight);

  if (strict && !apiPreflight.ready) {
    console.error(`FAIL preflight: ${apiPreflight.reason ?? "API unavailable."}`);
    await rm(tmpDir, { recursive: true, force: true });
    return 1;
  }

  const cases: Case[] = [
    { name: "config set baseUrl", argv: ["config", "set", "baseUrl", "http://localhost:1234", "--config", tmpConfig], ok: [0], acceptsConnection: false },
    { name: "config set password", argv: ["config", "set", "password", "secret", "--config", tmpConfig], ok: [0], acceptsConnection: false },
    { name: "config get", argv: ["config", "get", "--config", tmpConfig, "--json"], ok: [0], acceptsConnection: false },
    { name: "config unset password", argv: ["config", "unset", "password", "--config", tmpConfig], ok: [0], acceptsConnection: false },
    { name: "config sync", argv: ["config", "sync", "--config", tmpConfig, "--json"], ok: [0], acceptsConnection: false },

    { name: "doctor", argv: ["doctor"], ok: [0] },
    { name: "ping", argv: ["ping"], ok: [0], requiresApi: true },
    { name: "server info", argv: ["server", "info", "--json"], ok: [0], requiresApi: true },
    { name: "server logs api", argv: ["server", "logs", "--source", "api", "--count", "5"], ok: [0], requiresApi: true },
    { name: "server alert list", argv: ["server", "alert", "list"], ok: [0], requiresApi: true },
    { name: "server alert read", argv: ["server", "alert", "read", "1"], ok: [0], requiresApi: true },
    { name: "server update check", argv: ["server", "update", "check"], ok: [0], requiresApi: true },
    { name: "server update install", argv: ["server", "update", "install", "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "server restart services", argv: ["server", "restart-services", "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "server restart app", argv: ["server", "restart-app", "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "server settings get", argv: ["server", "settings", "get"], ok: [0], requiresApi: true },
    { name: "server settings set", argv: ["server", "settings", "set", "--file", settingsFile], ok: [0], requiresApi: true, destructive: true },
    { name: "server settings delete", argv: ["server", "settings", "delete", "test-setting", "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "server theme list", argv: ["server", "theme", "list"], ok: [0], requiresApi: true },
    { name: "server theme set", argv: ["server", "theme", "set", "test-theme", "--file", themeFile], ok: [0], requiresApi: true, destructive: true },
    { name: "server theme delete", argv: ["server", "theme", "delete", "test-theme", "--yes"], ok: [0, 6], requiresApi: true, destructive: true },

    { name: "chat list", argv: ["chat", "list"], ok: [0], requiresApi: true },
    { name: "chat get", argv: ["chat", "get", chatGuid], ok: [0, 6], requiresApi: true },
    { name: "chat messages", argv: ["chat", "messages", chatGuid], ok: [0, 6], requiresApi: true },
    { name: "chat update", argv: ["chat", "update", chatGuid, "--name", "Updated Name"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat delete", argv: ["chat", "delete", chatGuid, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat group leave", argv: ["chat", "group", "leave", chatGuid, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat group participant add", argv: ["chat", "group", "participant", "add", chatGuid, address], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat group participant remove", argv: ["chat", "group", "participant", "remove", chatGuid, address, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat group icon set", argv: ["chat", "group", "icon", "set", chatGuid], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat group icon remove", argv: ["chat", "group", "icon", "remove", chatGuid, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "chat typing start", argv: ["chat", "typing", "start", chatGuid], ok: [0, 6], requiresApi: true },
    { name: "chat typing stop", argv: ["chat", "typing", "stop", chatGuid], ok: [0, 6], requiresApi: true },

    { name: "message list", argv: ["message", "list"], ok: [0], requiresApi: true },
    { name: "message list common filters", argv: ["message", "list", "--chat", chatGuid, "--text", "hello", "--not-from-me", "--limit", "20"], ok: [0, 6], requiresApi: true },
    { name: "message list raw where", argv: ["message", "list", "--where", '[{"statement":"message.text LIKE :q","args":{"q":"%hello%"}}]'], ok: [0], requiresApi: true },
    { name: "message get", argv: ["message", "get", messageGuid], ok: [0, 6], requiresApi: true },
    { name: "message send", argv: ["message", "send", "--chat", chatGuid, "--message", "hello"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message react", argv: ["message", "react", messageGuid, "--chat", chatGuid, "--reaction", "love"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message edit", argv: ["message", "edit", messageGuid, "--message", "updated"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message unsend", argv: ["message", "unsend", messageGuid, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message schedule list", argv: ["message", "schedule", "list"], ok: [0], requiresApi: true },
    { name: "message schedule get", argv: ["message", "schedule", "get", scheduleId], ok: [0, 6], requiresApi: true },
    { name: "message schedule create", argv: ["message", "schedule", "create", "--chat", chatGuid, "--message", "later", "--date", String(Date.now() + 60000)], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message schedule update", argv: ["message", "schedule", "update", scheduleId, "--message", "new value"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "message schedule delete", argv: ["message", "schedule", "delete", scheduleId, "--yes"], ok: [0, 6], requiresApi: true, destructive: true },

    { name: "handle list", argv: ["handle", "list"], ok: [0, 4], requiresApi: true },
    { name: "handle availability", argv: ["handle", "availability", address], ok: [0, 6], requiresApi: true },
    { name: "attachment get", argv: ["attachment", "get", attachmentGuid], ok: [0, 6], requiresApi: true },
    { name: "attachment download", argv: ["attachment", "download", attachmentGuid, "--file", attachmentOut], ok: [0, 1, 4, 6], requiresApi: true },
    { name: "attachment force-download", argv: ["attachment", "force-download", attachmentGuid, "--file", attachmentForceOut], ok: [0, 1, 4, 6], requiresApi: true },
    { name: "contact list", argv: ["contact", "list"], ok: [0], requiresApi: true },
    { name: "contact query", argv: ["contact", "query", "--address", address], ok: [0], requiresApi: true },
    { name: "icloud account", argv: ["icloud", "account"], ok: [0], requiresApi: true },
    { name: "icloud contact", argv: ["icloud", "contact"], ok: [0, 6], requiresApi: true },
    { name: "icloud findmy devices list", argv: ["icloud", "findmy", "devices", "list"], ok: [0, 6], requiresApi: true },
    { name: "icloud findmy devices refresh", argv: ["icloud", "findmy", "devices", "refresh"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "icloud findmy friends list", argv: ["icloud", "findmy", "friends", "list"], ok: [0, 6], requiresApi: true },
    { name: "icloud findmy friends refresh", argv: ["icloud", "findmy", "friends", "refresh"], ok: [0, 6], requiresApi: true, destructive: true },
    { name: "icloud alias set", argv: ["icloud", "alias", "set", aliasEmail], ok: [0, 6], requiresApi: true, destructive: true },

    { name: "webhook validate", argv: ["webhook", "validate", webhookPayload], ok: [0, 2], acceptsConnection: false },
    { name: "webhook serve", argv: ["webhook", "serve"], ok: [0], longRunning: true, acceptsConnection: false },

    { name: "server status", argv: ["server", "status"], ok: [0, 5], requiresDarwin: true, acceptsConnection: false },
    { name: "server logs local", argv: ["server", "logs"], ok: [0, 5, 6], requiresDarwin: true, acceptsConnection: false },
    { name: "server start", argv: ["server", "start", "--app-path", "/nonexistent/BlueBubbles.app"], ok: [0, 5], requiresDarwin: true, destructive: true, acceptsConnection: false },
    { name: "server stop", argv: ["server", "stop", "--yes"], ok: [0, 5, 6], requiresDarwin: true, destructive: true, acceptsConnection: false },
    { name: "server restart local", argv: ["server", "restart", "--yes", "--app-path", "/nonexistent/BlueBubbles.app"], ok: [0, 5, 6], requiresDarwin: true, destructive: true, acceptsConnection: false },
  ];

  const results: Result[] = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase, apiPreflight, connectionArgs));
  }

  const pass = results.filter((result) => result.status === "PASS").length;
  const fail = results.filter((result) => result.status === "FAIL").length;
  const skip = results.filter((result) => result.status === "SKIP").length;

  for (const result of results) {
    const code = result.exitCode !== undefined ? ` exit=${result.exitCode}` : "";
    const reason = result.reason ? ` (${result.reason})` : "";
    console.log(`${result.status.padEnd(4, " ")} ${result.name}${code}${reason}`);
  }
  console.log(`\nSummary: pass=${pass} fail=${fail} skip=${skip}`);

  await rm(tmpDir, { recursive: true, force: true });
  if (fail > 0) return 1;
  if (strict) {
    const policySkips = results.filter((result) =>
      result.status === "SKIP" &&
      (result.reason?.includes("TEST_COMMANDS_ALLOW_DESTRUCTIVE=1 not set.") ||
        result.reason?.includes("TEST_COMMANDS_RUN_LONG_RUNNING=1 not set.")),
    ).length;
    if (policySkips > 0) return 2;
  }
  return 0;
}

const exitCode = await main();
process.exit(exitCode);
