import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";
import { loadConfig, setConfigValue } from "./config.js";

describe("config precedence", () => {
  let configPath: string;

  beforeEach(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bluebubbles-config-"));
    configPath = path.join(dir, "config.json");
    delete process.env.BLUEBUBBLES_BASE_URL;
    delete process.env.BLUEBUBBLES_PASSWORD;
  });

  test("prefers explicit overrides over env and persisted config", async () => {
    await setConfigValue(configPath, "baseUrl", "http://persisted.local:1234");
    process.env.BLUEBUBBLES_BASE_URL = "http://env.local:1234";

    const context = await loadConfig({
      configPath,
      baseUrl: "http://flag.local:1234",
    });

    expect(context.config.baseUrl).toBe("http://flag.local:1234");
  });

  test("stores launch args as an array", async () => {
    await setConfigValue(configPath, "launchArgs", "--headless,--foreground");
    const contents = JSON.parse(await readFile(configPath, "utf8")) as { launchArgs: string[] };
    expect(contents.launchArgs).toEqual(["--headless", "--foreground"]);
  });
});
