import { existsSync } from "node:fs";
import { OPENAPI_SPEC_URL } from "~/lib/constants.js";
import { discoverAppPath, readRuntimeState, serverStatus } from "~/lib/local-server.js";
import { ping } from "~/lib/bluebubbles/ping.js";
import { BlueBubblesClient } from "~/lib/bluebubbles/client.js";
import type { CliConfig, DoctorCheck } from "~/lib/types.js";

export async function runDoctor(input: {
  config: CliConfig;
  configPath: string;
  statePath: string;
}): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const hasRuntimeConfig = input.config.baseUrl && input.config.password;
  checks.push({
    name: "config file",
    status: existsSync(input.configPath) ? "pass" : (hasRuntimeConfig ? "pass" : "warn"),
    detail: existsSync(input.configPath)
      ? `Found ${input.configPath}`
      : (hasRuntimeConfig ? "Using runtime config (env and/or CLI flags)." : `No config file yet at ${input.configPath}`),
  });

  checks.push({
    name: "base URL",
    status: input.config.baseUrl ? "pass" : "warn",
    detail: input.config.baseUrl ?? "Missing BLUEBUBBLES_BASE_URL or persisted baseUrl",
  });

  checks.push({
    name: "password",
    status: input.config.password ? "pass" : "warn",
    detail: input.config.password ? "Configured" : "Missing BLUEBUBBLES_PASSWORD or persisted password",
  });

  const appPath = discoverAppPath(input.config);
  checks.push({
    name: "local app",
    status: process.platform === "darwin" ? (appPath ? "pass" : "warn") : "warn",
    detail:
      process.platform === "darwin"
        ? appPath ?? "No installed BlueBubbles app found in the default locations"
        : "Local lifecycle commands require macOS",
  });

  const status = await serverStatus({ statePath: input.statePath, config: input.config });
  let apiPingPass = false;

  if (input.config.baseUrl && input.config.password) {
    try {
      const client = new BlueBubblesClient({
        baseUrl: input.config.baseUrl,
        password: input.config.password,
      });
      await ping(client);
      apiPingPass = true;
    } catch {
      apiPingPass = false;
    }
  }

  checks.push({
    name: "local process",
    status: (status.running || apiPingPass) ? "pass" : "warn",
    detail: status.running 
      ? `Running with PID ${status.state!.pid}` 
      : (apiPingPass ? "Running (External)" : "Not running under CLI control"),
  });

  if (input.config.baseUrl && input.config.password) {
    if (apiPingPass) {
      checks.push({
        name: "api ping",
        status: "pass",
        detail: "BlueBubbles API responded successfully",
      });
    } else {
      checks.push({
        name: "api ping",
        status: "fail",
        detail: "Unable to reach the BlueBubbles API",
      });
    }
  } else {
    checks.push({
      name: "api ping",
      status: "warn",
      detail: "Skipped because base URL or password is missing",
    });
  }

  try {
    const response = await fetch(OPENAPI_SPEC_URL, { method: "HEAD" });
    checks.push({
      name: "official OpenAPI URL",
      status: response.ok ? "pass" : "warn",
      detail: response.ok ? OPENAPI_SPEC_URL : `Returned status ${response.status}`,
    });
  } catch (error) {
    checks.push({
      name: "official OpenAPI URL",
      status: "warn",
      detail: error instanceof Error ? error.message : "Unable to reach the official OpenAPI URL",
    });
  }

  const state = await readRuntimeState(input.statePath);
  if (state?.logPath) {
    checks.push({
      name: "log path",
      status: existsSync(state.logPath) ? "pass" : "warn",
      detail: existsSync(state.logPath) ? state.logPath : `Missing log file ${state.logPath}`,
    });
  }

  return checks;
}
