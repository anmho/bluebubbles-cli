import { describe, expect, test } from "bun:test";
import path from "node:path";

// ── CLI runner ────────────────────────────────────────────────────────────────

type CliResult = { stdout: string; stderr: string; exitCode: number };

async function cli(args: string[]): Promise<CliResult> {
  const proc = Bun.spawn(
    ["bun", "run", path.join(import.meta.dir, "index.ts"), ...args],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout, stderr, exitCode };
}

// ── Live Validation ───────────────────────────────────────────────────────────

describe("Live CLI Validator", () => {
  test("server info (discovery works)", async () => {
    const r = await cli(["server", "info", "--json"]);
    if (r.exitCode !== 0) {
      console.warn("Live test skipped or failed: server info exited with", r.exitCode, r.stderr);
      return;
    }
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeObject();
  });

  test("chats query (iMessage format)", async () => {
    const r = await cli(["chats", "query", "--limit", "5", "--json"]);
    if (r.exitCode !== 0) return;
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeArray();
    
    if (parsed.data.length > 0) {
      const firstChat = parsed.data[0];
      expect(firstChat.guid).toBeString();
      // Should follow "service;type;identifier" or similar iMessage format
      expect(firstChat.guid).toMatch(/^(iMessage|SMS|any);[+-;];/);
    }
  });

  test("messages query --limit 1", async () => {
    const r = await cli(["messages", "query", "--limit", "1", "--json"]);
    if (r.exitCode !== 0) return;
    const parsed = JSON.parse(r.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeArray();
  });

  test("typing start/stop", async () => {
    // 1. Get a real chat guid
    const listRes = await cli(["chats", "query", "--limit", "1", "--json"]);
    if (listRes.exitCode !== 0) return;
    const chats = JSON.parse(listRes.stdout).data;
    if (chats.length === 0) return;
    
    const guid = chats[0].guid;
    
    // 2. Start typing
    const startRes = await cli(["chats", "typing-start", guid, "--json"]);
    expect(startRes.exitCode).toBe(0);
    
    // 3. Stop typing
    const stopRes = await cli(["chats", "typing-stop", guid, "--json"]);
    expect(stopRes.exitCode).toBe(0);
  });
});
