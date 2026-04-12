import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "./index.js";

const MOCK_PASSWORD = "test-secret";
const MOCK_BASE_URL = "http://bluebubbles.test";
const CHAT_GUID = "iMessage;+;chat1";
const MSG_GUID = "msg1";
const ATTACHMENT_GUID = "att1";

let tmpDir: string;
let configFile: string;
let settingsFile: string;
let themeFile: string;
let originalFetch: typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function parseBody(init?: RequestInit): Promise<unknown> {
  if (!init?.body) return undefined;
  if (typeof init.body === "string") return JSON.parse(init.body);
  return JSON.parse(await new Response(init.body as BodyInit).text());
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : undefined;
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = init?.method ?? request?.method ?? "GET";

  if (url.searchParams.get("password") !== MOCK_PASSWORD) {
    return jsonResponse({ status: 401, message: "Unauthorized" }, 401);
  }

  const pathname = url.pathname;
  const encodedChatGuid = encodeURIComponent(CHAT_GUID);
  const encodedAddress = encodeURIComponent("user@example.com");

  if (method === "GET" && pathname === "/api/v1/ping") {
    return jsonResponse({ status: 200, message: "pong" });
  }
  if (method === "GET" && pathname === "/api/v1/server/info") {
    return jsonResponse({ status: 200, data: { version: "1.0.0" } });
  }
  if (method === "GET" && pathname === "/api/v1/server/logs") {
    return jsonResponse({ status: 200, data: "log line 1\nlog line 2" });
  }
  if (method === "GET" && pathname === "/api/v1/server/alert") {
    return jsonResponse({ status: 200, data: [{ id: 1, message: "Test alert" }] });
  }
  if (method === "POST" && pathname === "/api/v1/server/alert/read") {
    return jsonResponse({ status: 200, message: "Alerts read" });
  }
  if (method === "GET" && pathname === "/api/v1/server/update/check") {
    return jsonResponse({ status: 200, data: { available: false } });
  }
  if (method === "POST" && pathname === "/api/v1/server/update/install") {
    return jsonResponse({ status: 200, message: "Installing" });
  }
  if (method === "GET" && pathname === "/api/v1/server/restart/soft") {
    return jsonResponse({ status: 200, message: "Services restarted" });
  }
  if (method === "GET" && pathname === "/api/v1/server/restart/hard") {
    return jsonResponse({ status: 200, message: "App restarted" });
  }
  if (method === "POST" && pathname === "/api/v1/chat/query") {
    return jsonResponse({
      status: 200,
      data: [
        {
          guid: CHAT_GUID,
          displayName: "Test Chat",
          participants: [{ address: "user@example.com" }],
        },
      ],
    });
  }
  if (method === "GET" && pathname === `/api/v1/chat/${encodedChatGuid}`) {
    return jsonResponse({ status: 200, data: { guid: CHAT_GUID, displayName: "Test Chat" } });
  }
  if (method === "GET" && pathname === `/api/v1/chat/${encodedChatGuid}/message`) {
    return jsonResponse({ status: 200, data: [{ guid: MSG_GUID, text: "hello", isFromMe: true }] });
  }
  if (method === "PUT" && pathname === `/api/v1/chat/${encodedChatGuid}`) {
    return jsonResponse({ status: 200, message: "Chat updated" });
  }
  if (method === "DELETE" && pathname === `/api/v1/chat/${encodedChatGuid}`) {
    return jsonResponse({ status: 200, message: "Chat deleted" });
  }
  if (method === "POST" && pathname === `/api/v1/chat/${encodedChatGuid}/leave`) {
    return jsonResponse({ status: 200, message: "Left chat" });
  }
  if ((method === "POST" || method === "DELETE") && pathname === `/api/v1/chat/${encodedChatGuid}/participant`) {
    return jsonResponse({ status: 200, message: "Participant updated" });
  }
  if ((method === "POST" || method === "DELETE") && pathname === `/api/v1/chat/${encodedChatGuid}/icon`) {
    return jsonResponse({ status: 200, message: "Icon updated" });
  }
  if ((method === "POST" || method === "DELETE") && pathname === `/api/v1/chat/${encodedChatGuid}/typing`) {
    return jsonResponse({ status: 200, message: "Typing updated" });
  }
  if (method === "POST" && pathname === "/api/v1/message/query") {
    return jsonResponse({ status: 200, data: [{ guid: MSG_GUID, text: "hello", isFromMe: true }] });
  }
  if (method === "GET" && pathname === `/api/v1/message/${MSG_GUID}`) {
    return jsonResponse({ status: 200, data: { guid: MSG_GUID, text: "hello" } });
  }
  if (method === "POST" && pathname === "/api/v1/message/text") {
    return jsonResponse({ status: 200, message: "Message sent" });
  }
  if (method === "POST" && pathname === "/api/v1/message/react") {
    return jsonResponse({ status: 200, message: "Reaction sent" });
  }
  if (method === "POST" && pathname === `/api/v1/message/${MSG_GUID}/edit`) {
    return jsonResponse({ status: 200, message: "Message edited" });
  }
  if (method === "POST" && pathname === `/api/v1/message/${MSG_GUID}/unsend`) {
    return jsonResponse({ status: 200, message: "Message unsent" });
  }
  if (method === "GET" && pathname === "/api/v1/message/schedule") {
    return jsonResponse({ status: 200, data: [{ id: 1, status: "scheduled" }] });
  }
  if (method === "POST" && pathname === "/api/v1/message/schedule") {
    return jsonResponse({ status: 200, data: { id: 2 } });
  }
  if (method === "GET" && pathname === "/api/v1/message/schedule/1") {
    return jsonResponse({ status: 200, data: { id: 1, status: "scheduled" } });
  }
  if (method === "PUT" && pathname === "/api/v1/message/schedule/1") {
    return jsonResponse({ status: 200, message: "Schedule updated" });
  }
  if (method === "DELETE" && pathname === "/api/v1/message/schedule/1") {
    return jsonResponse({ status: 200, message: "Schedule deleted" });
  }
  if (method === "POST" && pathname === "/api/v1/handle/query") {
    return jsonResponse({ status: 200, data: [{ address: "user@example.com" }] });
  }
  if (method === "GET" && pathname === `/api/v1/handle/${encodedAddress}/availability`) {
    return jsonResponse({ status: 200, data: { available: true } });
  }
  if (method === "GET" && pathname === `/api/v1/attachment/${ATTACHMENT_GUID}`) {
    return jsonResponse({ status: 200, data: { guid: ATTACHMENT_GUID, mimeType: "image/png" } });
  }
  if (method === "GET" && pathname === `/api/v1/attachment/${ATTACHMENT_GUID}/download`) {
    return new Response("attachment-data", {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": 'attachment; filename="att1.txt"',
      },
    });
  }
  if (method === "GET" && pathname === `/api/v1/attachment/${ATTACHMENT_GUID}/download/force`) {
    return new Response("attachment-data", {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": 'attachment; filename="att1-force.txt"',
      },
    });
  }
  if (method === "GET" && pathname === "/api/v1/contact") {
    return jsonResponse({ status: 200, data: [{ displayName: "Alice" }] });
  }
  if (method === "POST" && pathname === "/api/v1/contact/query") {
    return jsonResponse({ status: 200, data: [{ displayName: "Alice" }] });
  }
  if (method === "GET" && pathname === "/api/v1/icloud/account") {
    return jsonResponse({ status: 200, data: { apple_id: "user@icloud.com" } });
  }
  if (method === "GET" && pathname === "/api/v1/icloud/contact") {
    return jsonResponse({ status: 200, data: { name: "User" } });
  }
  if (method === "GET" && pathname === "/api/v1/icloud/findmy/devices") {
    return jsonResponse({ status: 200, data: [{ title: "MacBook" }] });
  }
  if (method === "POST" && pathname === "/api/v1/icloud/findmy/devices/refresh") {
    return jsonResponse({ status: 200, message: "Devices refreshed" });
  }
  if (method === "GET" && pathname === "/api/v1/icloud/findmy/friends") {
    return jsonResponse({ status: 200, data: [{ title: "Friend" }] });
  }
  if (method === "POST" && pathname === "/api/v1/icloud/findmy/friends/refresh") {
    return jsonResponse({ status: 200, message: "Friends refreshed" });
  }
  if (method === "POST" && pathname === "/api/v1/icloud/account/alias") {
    return jsonResponse({ status: 200, message: "Alias updated" });
  }
  if (method === "GET" && pathname === "/api/v1/backup/settings") {
    return jsonResponse({ status: 200, data: { darkMode: true } });
  }
  if (method === "POST" && pathname === "/api/v1/backup/settings") {
    return jsonResponse({ status: 200, data: await parseBody(init) });
  }
  if (method === "DELETE" && pathname === "/api/v1/backup/settings/test-setting") {
    return jsonResponse({ status: 200, message: "Deleted" });
  }
  if (method === "GET" && pathname === "/api/v1/backup/theme") {
    return jsonResponse({ status: 200, data: [{ name: "Default" }] });
  }
  if (method === "POST" && pathname === "/api/v1/backup/theme") {
    return jsonResponse({ status: 200, data: await parseBody(init) });
  }
  if (method === "DELETE" && pathname === "/api/v1/backup/theme/test-theme") {
    return jsonResponse({ status: 200, message: "Deleted" });
  }

  return jsonResponse({ status: 404, message: `No mock for ${method} ${pathname}` }, 404);
}

beforeAll(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "bb-cli-test-"));
  configFile = path.join(tmpDir, "config.json");
  settingsFile = path.join(tmpDir, "settings.json");
  themeFile = path.join(tmpDir, "theme.json");

  await writeFile(settingsFile, JSON.stringify({ darkMode: false }));
  await writeFile(themeFile, JSON.stringify({ accent: "blue" }));

  originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = originalFetch;
  await rm(tmpDir, { recursive: true, force: true });
});

type CliResult = { stdout: string; stderr: string; exitCode: number };

async function cli(args: string[], extraEnv: Record<string, string> = {}): Promise<CliResult> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleTable = console.table;
  const originalEnv = {
    BLUEBUBBLES_CONFIG: process.env.BLUEBUBBLES_CONFIG,
    BLUEBUBBLES_BASE_URL: process.env.BLUEBUBBLES_BASE_URL,
    BLUEBUBBLES_PASSWORD: process.env.BLUEBUBBLES_PASSWORD,
  };

  process.env.BLUEBUBBLES_CONFIG = configFile;
  process.env.BLUEBUBBLES_BASE_URL = MOCK_BASE_URL;
  process.env.BLUEBUBBLES_PASSWORD = MOCK_PASSWORD;

  for (const [key, value] of Object.entries(extraEnv)) {
    process.env[key] = value;
  }

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
    stdoutChunks.push(`${JSON.stringify(tabularData, null, 2)}\n`);
  };

  try {
    const exitCode = await runCli(args);
    return {
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join(""),
      exitCode,
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.table = originalConsoleTable;

    if (originalEnv.BLUEBUBBLES_CONFIG === undefined) delete process.env.BLUEBUBBLES_CONFIG;
    else process.env.BLUEBUBBLES_CONFIG = originalEnv.BLUEBUBBLES_CONFIG;
    if (originalEnv.BLUEBUBBLES_BASE_URL === undefined) delete process.env.BLUEBUBBLES_BASE_URL;
    else process.env.BLUEBUBBLES_BASE_URL = originalEnv.BLUEBUBBLES_BASE_URL;
    if (originalEnv.BLUEBUBBLES_PASSWORD === undefined) delete process.env.BLUEBUBBLES_PASSWORD;
    else process.env.BLUEBUBBLES_PASSWORD = originalEnv.BLUEBUBBLES_PASSWORD;
  }
}

describe("help surface", () => {
  test("root help reflects the curated resource tree", async () => {
    const r = await cli(["--help"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("server");
    expect(r.stdout).toContain("chat");
    expect(r.stdout).toContain("message");
    expect(r.stdout).toContain("contact");
    expect(r.stdout).toContain("webhook");
    expect(r.stdout).not.toContain("fcm");
    expect(r.stdout).not.toContain("mac");
    expect(r.stdout).not.toContain("webhooks");
    expect(r.stdout).not.toContain("\n  themes");
    expect(r.stdout).not.toContain("\n  settings");
  });
});

describe("config", () => {
  test("config set and get work", async () => {
    expect((await cli(["config", "set", "baseUrl", "http://localhost:1234"])).exitCode).toBe(0);
    const r = await cli(["config", "get", "baseUrl"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("baseUrl");
  });
});

describe("server flows", () => {
  test("ping and server info work", async () => {
    expect((await cli(["ping"])).exitCode).toBe(0);

    const info = await cli(["server", "info", "--json"]);
    expect(info.exitCode).toBe(0);
    expect(JSON.parse(info.stdout).data.version).toBe("1.0.0");
  });

  test("server alert, update, and restart commands work", async () => {
    expect((await cli(["server", "logs", "--source", "api"])).exitCode).toBe(0);
    expect((await cli(["server", "alert", "list"])).exitCode).toBe(0);
    expect((await cli(["server", "alert", "read", "1"])).exitCode).toBe(0);
    expect((await cli(["server", "update", "check"])).exitCode).toBe(0);
    expect((await cli(["server", "update", "install", "--yes"])).exitCode).toBe(0);
    expect((await cli(["server", "restart-services", "--yes"])).exitCode).toBe(0);
    expect((await cli(["server", "restart-app", "--yes"])).exitCode).toBe(0);
  });

  test("server settings and theme commands work", async () => {
    expect((await cli(["server", "settings", "get"])).exitCode).toBe(0);
    expect((await cli(["server", "settings", "set", "--file", settingsFile])).exitCode).toBe(0);
    expect((await cli(["server", "settings", "delete", "test-setting", "--yes"])).exitCode).toBe(0);
    expect((await cli(["server", "theme", "list"])).exitCode).toBe(0);
    expect((await cli(["server", "theme", "set", "test-theme", "--file", themeFile])).exitCode).toBe(0);
    expect((await cli(["server", "theme", "delete", "test-theme", "--yes"])).exitCode).toBe(0);
  });
});

describe("chat and message flows", () => {
  test("chat commands work", async () => {
    expect((await cli(["chat", "list"])).exitCode).toBe(0);
    expect((await cli(["chat", "get", CHAT_GUID])).exitCode).toBe(0);
    expect((await cli(["chat", "messages", CHAT_GUID])).exitCode).toBe(0);
    expect((await cli(["chat", "update", CHAT_GUID, "--name", "Renamed"])).exitCode).toBe(0);
    expect((await cli(["chat", "group", "participant", "add", CHAT_GUID, "user@example.com"])).exitCode).toBe(0);
    expect((await cli(["chat", "group", "icon", "set", CHAT_GUID])).exitCode).toBe(0);
    expect((await cli(["chat", "typing", "start", CHAT_GUID])).exitCode).toBe(0);
    expect((await cli(["chat", "typing", "stop", CHAT_GUID])).exitCode).toBe(0);
  });

  test("message commands work", async () => {
    expect((await cli(["message", "list"])).exitCode).toBe(0);
    expect((await cli(["message", "get", MSG_GUID])).exitCode).toBe(0);
    expect((await cli(["message", "send", "--chat", CHAT_GUID, "--message", "hello"])).exitCode).toBe(0);
    expect((await cli(["message", "react", MSG_GUID, "--chat", CHAT_GUID, "--reaction", "love"])).exitCode).toBe(0);
    expect((await cli(["message", "edit", MSG_GUID, "--message", "updated"])).exitCode).toBe(0);
    expect((await cli(["message", "unsend", MSG_GUID, "--yes"])).exitCode).toBe(0);
  });

  test("message schedule commands work", async () => {
    expect((await cli(["message", "schedule", "list"])).exitCode).toBe(0);
    expect((await cli(["message", "schedule", "get", "1"])).exitCode).toBe(0);
    expect((await cli(["message", "schedule", "create", "--chat", CHAT_GUID, "--message", "later", "--date", "1893456000000"])).exitCode).toBe(0);
    expect((await cli(["message", "schedule", "update", "1", "--message", "updated"])).exitCode).toBe(0);
    expect((await cli(["message", "schedule", "delete", "1", "--yes"])).exitCode).toBe(0);
  });
});

describe("resource sidecars", () => {
  test("handle, attachment, contact, and icloud commands work", async () => {
    expect((await cli(["handle", "list"])).exitCode).toBe(0);
    expect((await cli(["handle", "availability", "user@example.com"])).exitCode).toBe(0);

    const downloadPath = path.join(tmpDir, "att1.txt");
    const forceDownloadPath = path.join(tmpDir, "att1-force.txt");
    expect((await cli(["attachment", "get", ATTACHMENT_GUID])).exitCode).toBe(0);
    expect((await cli(["attachment", "download", ATTACHMENT_GUID, "--file", downloadPath])).exitCode).toBe(0);
    expect((await cli(["attachment", "force-download", ATTACHMENT_GUID, "--file", forceDownloadPath])).exitCode).toBe(0);
    expect(await readFile(downloadPath, "utf8")).toBe("attachment-data");
    expect(await readFile(forceDownloadPath, "utf8")).toBe("attachment-data");

    expect((await cli(["contact", "list"])).exitCode).toBe(0);
    expect((await cli(["contact", "query", "--address", "user@example.com"])).exitCode).toBe(0);
    expect((await cli(["icloud", "account"])).exitCode).toBe(0);
    expect((await cli(["icloud", "contact"])).exitCode).toBe(0);
    expect((await cli(["icloud", "findmy", "devices", "list"])).exitCode).toBe(0);
    expect((await cli(["icloud", "findmy", "devices", "refresh"])).exitCode).toBe(0);
    expect((await cli(["icloud", "findmy", "friends", "list"])).exitCode).toBe(0);
    expect((await cli(["icloud", "findmy", "friends", "refresh"])).exitCode).toBe(0);
    expect((await cli(["icloud", "alias", "set", "alias@icloud.com"])).exitCode).toBe(0);
  });
});

describe("confirmation and diagnostics", () => {
  test("destructive commands require --yes in non-interactive mode", async () => {
    const r = await cli(["chat", "delete", CHAT_GUID]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("--yes");
  });

  test("doctor reports API reachability", async () => {
    const r = await cli(["doctor"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("api ping");
  });
});

describe("server lifecycle", () => {
  test("server lifecycle commands fail clearly without a managed process", async () => {
    expect((await cli(["server", "start", "--app-path", "/nonexistent/BlueBubbles.app"])).exitCode).toBe(5);

    const freshConfig = path.join(tmpDir, "local-config.json");
    const stop = await cli(["server", "stop", "--yes"], { BLUEBUBBLES_CONFIG: freshConfig });
    const logs = await cli(["server", "logs"], { BLUEBUBBLES_CONFIG: freshConfig });
    const status = await cli(["server", "status"], { BLUEBUBBLES_CONFIG: freshConfig });
    const expected = process.platform === "darwin" ? 6 : 5;
    const expectedStatus = process.platform === "darwin" ? 0 : 5;
    expect(stop.exitCode).toBe(expected);
    expect(logs.exitCode).toBe(expected);
    expect(status.exitCode).toBe(expectedStatus);
  });
});
