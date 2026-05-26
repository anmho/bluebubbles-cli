import { existsSync } from "node:fs";
import { OPENAPI_SPEC_URL } from "~/lib/constants.js";
import { discoverAppPath, readRuntimeState, serverStatus } from "~/lib/local-server.js";
import { ping } from "~/lib/bluebubbles/ping.js";
import { BlueBubblesClient } from "~/lib/bluebubbles/client.js";
import { getServerInfo } from "~/lib/bluebubbles/server.js";
import type { CliConfig, DoctorCheck } from "~/lib/types.js";

type DoctorInput = {
  config: CliConfig;
  configPath: string;
  statePath: string;
};

function checkConfigFile(input: DoctorInput): DoctorCheck {
  const hasRuntimeConfig = input.config.baseUrl && input.config.password;
  if (existsSync(input.configPath)) {
    return { name: "config file", status: "pass", detail: `Found ${input.configPath}` };
  }
  return {
    name: "config file",
    status: hasRuntimeConfig ? "pass" : "warn",
    detail: hasRuntimeConfig
      ? "Using runtime config (env and/or CLI flags)."
      : `No config file yet at ${input.configPath}`,
  };
}

function checkBaseUrl(input: DoctorInput): DoctorCheck {
  return {
    name: "base URL",
    status: input.config.baseUrl ? "pass" : "warn",
    detail: input.config.baseUrl ?? "Missing BLUEBUBBLES_BASE_URL or persisted baseUrl",
  };
}

function checkPassword(input: DoctorInput): DoctorCheck {
  return {
    name: "password",
    status: input.config.password ? "pass" : "warn",
    detail: input.config.password ? "Configured" : "Missing BLUEBUBBLES_PASSWORD or persisted password",
  };
}

function checkLocalApp(input: DoctorInput): DoctorCheck {
  const appPath = discoverAppPath(input.config);
  if (process.platform !== "darwin") {
    return { name: "local app", status: "warn", detail: "Local lifecycle commands require macOS" };
  }
  return {
    name: "local app",
    status: appPath ? "pass" : "warn",
    detail: appPath ?? "No installed BlueBubbles app found in the default locations",
  };
}

async function tryApiPing(input: DoctorInput): Promise<boolean> {
  if (!input.config.baseUrl || !input.config.password) return false;
  try {
    const client = new BlueBubblesClient({
      baseUrl: input.config.baseUrl,
      password: input.config.password,
    });
    await ping(client);
    return true;
  } catch {
    return false;
  }
}

async function checkLocalProcess(input: DoctorInput, apiPingPass: boolean): Promise<DoctorCheck> {
  const status = await serverStatus({ statePath: input.statePath, config: input.config });
  return {
    name: "local process",
    status: status.running || apiPingPass ? "pass" : "warn",
    detail: status.running
      ? `Running with PID ${status.state!.pid}`
      : apiPingPass
        ? "Running (External)"
        : "Not running under CLI control",
  };
}

function checkApiPing(input: DoctorInput, apiPingPass: boolean): DoctorCheck {
  if (!input.config.baseUrl || !input.config.password) {
    return {
      name: "api ping",
      status: "warn",
      detail: "Skipped because base URL or password is missing",
    };
  }
  return apiPingPass
    ? { name: "api ping", status: "pass", detail: "BlueBubbles API responded successfully" }
    : { name: "api ping", status: "fail", detail: "Unable to reach the BlueBubbles API" };
}

async function checkPrivateApiHelper(input: DoctorInput, apiPingPass: boolean): Promise<DoctorCheck> {
  if (!apiPingPass || !input.config.baseUrl || !input.config.password) {
    return {
      name: "private API helper",
      status: "warn",
      detail: "Skipped because api ping did not succeed",
    };
  }
  try {
    const client = new BlueBubblesClient({
      baseUrl: input.config.baseUrl,
      password: input.config.password,
    });
    const info = (await getServerInfo(client)).data ?? {};
    const privateApi = info.private_api === true;
    const helperConnected = info.helper_connected === true;
    if (privateApi && helperConnected) {
      return {
        name: "private API helper",
        status: "pass",
        detail: "Server has Private API enabled and helper is connected",
      };
    }
    if (privateApi && !helperConnected) {
      return {
        name: "private API helper",
        status: "warn",
        detail:
          "Private API enabled in server settings but helper dylib is NOT connected — unsend/edit/tapback/typing-indicator endpoints will fail. Install/repair the Messages Helper via the BlueBubbles UI (Settings → Private API).",
      };
    }
    return {
      name: "private API helper",
      status: "warn",
      detail:
        "Private API is disabled in server settings. Enable it (BlueBubbles UI → Settings → Private API) and install the Messages Helper to use unsend/edit/tapback/typing-indicator endpoints.",
    };
  } catch (error) {
    return {
      name: "private API helper",
      status: "warn",
      detail:
        error instanceof Error
          ? `Failed to read /api/v1/server/info: ${error.message}`
          : "Failed to read /api/v1/server/info",
    };
  }
}

async function checkOpenApiUrl(): Promise<DoctorCheck> {
  try {
    const response = await fetch(OPENAPI_SPEC_URL, { method: "HEAD" });
    return {
      name: "official OpenAPI URL",
      status: response.ok ? "pass" : "warn",
      detail: response.ok ? OPENAPI_SPEC_URL : `Returned status ${response.status}`,
    };
  } catch (error) {
    return {
      name: "official OpenAPI URL",
      status: "warn",
      detail: error instanceof Error ? error.message : "Unable to reach the official OpenAPI URL",
    };
  }
}

async function checkLogPath(input: DoctorInput): Promise<DoctorCheck | null> {
  const state = await readRuntimeState(input.statePath);
  if (!state?.logPath) return null;
  return {
    name: "log path",
    status: existsSync(state.logPath) ? "pass" : "warn",
    detail: existsSync(state.logPath) ? state.logPath : `Missing log file ${state.logPath}`,
  };
}

export async function runDoctor(input: DoctorInput): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  checks.push(checkConfigFile(input));
  checks.push(checkBaseUrl(input));
  checks.push(checkPassword(input));
  checks.push(checkLocalApp(input));

  const apiPingPass = await tryApiPing(input);
  checks.push(await checkLocalProcess(input, apiPingPass));
  checks.push(checkApiPing(input, apiPingPass));
  checks.push(await checkPrivateApiHelper(input, apiPingPass));
  checks.push(await checkOpenApiUrl());

  const logPath = await checkLogPath(input);
  if (logPath) checks.push(logPath);

  return checks;
}
