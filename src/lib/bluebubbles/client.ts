import { BlueBubblesClient as SdkClient } from "@anmho/bluebubbles-sdk";
import { CliError } from "~/lib/errors.js";

export interface ApiConfig {
  baseUrl: string;
  password: string;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
  verbose?: boolean;
}

export interface ApiEnvelope<T = unknown> {
  status?: number;
  message?: string;
  data?: T;
}

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;
type SdkFieldsResult = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

export class BlueBubblesClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sdkClient: SdkClient;
  private readonly requestTimeoutMs: number;
  private readonly verbose: boolean;

  constructor(private readonly config: ApiConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.requestTimeoutMs = this.resolveRequestTimeout(config.requestTimeoutMs);
    this.verbose = config.verbose ?? process.env.BLUEBUBBLES_VERBOSE === "1";
    this.sdkClient = new SdkClient({
      baseUrl: this.baseUrl,
      password: this.config.password,
      fetch: this.fetchWithTimeout.bind(this),
    });
  }

  async getFixed<T>(pathName: string, query: QueryParams = {}): Promise<T> {
    switch (pathName) {
      case "/api/v1/ping":
        return this.unwrapSdk<T>(this.sdkClient.server.ping({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/info":
        return this.unwrapSdk<T>(this.sdkClient.server.info({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/logs":
        return this.unwrapSdk<T>(this.sdkClient.server.logs({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/update/check":
        return this.unwrapSdk<T>(this.sdkClient.server.checkUpdate({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/restart/soft":
        return this.unwrapSdk<T>(this.sdkClient.server.restartServices({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/restart/hard":
        return this.unwrapSdk<T>(this.sdkClient.server.restartApp({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/server/alert":
        return this.unwrapSdk<T>(this.sdkClient.server.listAlerts({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/icloud/account":
        return this.unwrapSdk<T>(this.sdkClient.icloud.accountInfo({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/icloud/findmy/devices":
        return this.unwrapSdk<T>(this.sdkClient.icloud.listDevices({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/icloud/findmy/friends":
        return this.unwrapSdk<T>(this.sdkClient.icloud.listFriends({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/contact":
        return this.unwrapSdk<T>(this.sdkClient.contacts.list({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/backup/settings":
        return this.unwrapSdk<T>(this.sdkClient.backups.getSettings({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/backup/theme":
        return this.unwrapSdk<T>(this.sdkClient.backups.listThemes({ query }), { method: "GET", endpoint: pathName });
      case "/api/v1/message/schedule":
        return this.unwrapSdk<T>(this.sdkClient.messages.listScheduled({ query }), { method: "GET", endpoint: pathName });
      default:
        return this.fetchRawJson<T>("GET", pathName, undefined, query);
    }
  }

  async postFixed<T>(pathName: string, body: unknown, query: QueryParams = {}): Promise<T> {
    switch (pathName) {
      case "/api/v1/server/alert/read":
        return this.unwrapSdk<T>(this.sdkClient.server.readAlerts({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/icloud/findmy/devices/refresh":
        return this.unwrapSdk<T>(this.sdkClient.icloud.refreshDevices({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/icloud/findmy/friends/refresh":
        return this.unwrapSdk<T>(this.sdkClient.icloud.refreshFriends({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/contact/query":
        return this.unwrapSdk<T>(this.sdkClient.contacts.query({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/chat/query":
        return this.unwrapSdk<T>(this.sdkClient.chats.query({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/handle/query":
        return this.unwrapSdk<T>(this.sdkClient.handles.query({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/backup/settings":
        return this.unwrapSdk<T>(this.sdkClient.backups.saveSettings({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/backup/theme":
        return this.unwrapSdk<T>(this.sdkClient.backups.saveTheme({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/message/query":
        return this.unwrapSdk<T>(this.sdkClient.messages.query({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/message/text":
        return this.unwrapSdk<T>(this.sdkClient.messages.sendText({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/message/react":
        return this.unwrapSdk<T>(this.sdkClient.messages.react({ query, body }), { method: "POST", endpoint: pathName });
      case "/api/v1/message/schedule":
        return this.unwrapSdk<T>(this.sdkClient.messages.createScheduled({ query, body }), { method: "POST", endpoint: pathName });
      default:
        return this.fetchRawJson<T>("POST", pathName, body, query);
    }
  }

  async fetchTemplated<T>(
    method: string,
    pathTemplate: string,
    replacements: Record<string, string>,
    body?: unknown,
    query: QueryParams = {},
  ): Promise<T> {
    const pathName = this.interpolatePath(pathTemplate, replacements);
    const url = this.buildUrl(pathName, {
      password: this.config.password,
      ...query,
    });

    const response = await this.fetchWithTimeout(url, {
      method,
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    }, { method, endpoint: pathName });

    if (method === "GET" && !response.headers.get("content-type")?.includes("application/json")) {
      return response as T;
    }

    const payload = await this.parseResponse<T>(response);
    if (!response.ok) {
      throw this.responseError(response, payload, { method, endpoint: pathName });
    }
    return payload;
  }

  async fetchDownload(pathTemplate: string, replacements: Record<string, string>): Promise<Response> {
    const pathName = this.interpolatePath(pathTemplate, replacements);
    const url = this.buildUrl(pathName, { password: this.config.password });
    const response = await this.fetchWithTimeout(url, undefined, { method: "GET", endpoint: pathName });

    if (!response.ok) {
      const payload = await this.parseResponse(response);
      throw this.responseError(response, payload, { method: "GET", endpoint: pathName });
    }

    return response;
  }

  private async unwrapSdk<T>(
    resultPromise: Promise<SdkFieldsResult>,
    context: { method: string; endpoint: string },
  ): Promise<T> {
    let result: SdkFieldsResult;
    try {
      result = await resultPromise;
    } catch (error) {
      throw this.transportError(error, context);
    }
    const response = result.response;
    if (!response) {
      throw new CliError(
        `${context.method} ${context.endpoint}: ${this.extractTransportError(result.error) ?? "No response from SDK request"}`,
        "network",
        result,
      );
    }
    if (!response.ok || result.error) {
      throw this.responseError(response, result.error ?? result, context);
    }
    return result.data as T;
  }

  private async fetchRawJson<T>(
    method: string,
    pathName: string,
    body?: unknown,
    query: QueryParams = {},
  ): Promise<T> {
    const url = this.buildUrl(pathName, {
      password: this.config.password,
      ...query,
    });

    const response = await this.fetchWithTimeout(url, {
      method,
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    }, { method, endpoint: pathName });

    const payload = await this.parseResponse<T>(response);
    if (!response.ok) {
      throw this.responseError(response, payload, { method, endpoint: pathName });
    }
    return payload;
  }

  responseError(
    response: Response,
    payload: unknown,
    context?: { method: string; endpoint: string },
  ): CliError {
    const reason = this.extractMessage(payload) ?? `Request failed with status ${response.status}`;
    const message = context ? `${context.method} ${context.endpoint}: ${reason}` : reason;

    if (response.status === 401 || response.status === 403) {
      return new CliError(message, "auth", payload);
    }
    if (response.status === 404) {
      return new CliError(message, "not-found", payload);
    }
    return new CliError(message, response.status >= 500 ? "network" : "general", payload);
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  }

  private resolveRequestTimeout(configured?: number): number {
    if (configured && Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured);
    }
    const fromEnv = Number.parseInt(process.env.BLUEBUBBLES_REQUEST_TIMEOUT_MS ?? "", 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) {
      return fromEnv;
    }
    return 10_000;
  }

  private buildUrl(pathName: string, query: QueryParams): URL {
    const url = new URL(pathName.replace(/^\//, ""), this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private interpolatePath(pathTemplate: string, replacements: Record<string, string>): string {
    let result = pathTemplate;
    for (const [token, value] of Object.entries(replacements)) {
      result = result.replaceAll(token, encodeURIComponent(value));
    }
    return result;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") ? JSON.parse(text) : (text as T);
  }

  private extractMessage(payload: unknown): string | undefined {
    if (typeof payload === "string") return payload.trim() || undefined;
    if (!payload || typeof payload !== "object") return undefined;
    const candidate = payload as { message?: unknown; error?: unknown; data?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
    if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
    if (candidate.data && typeof candidate.data === "object") {
      const nested = candidate.data as { message?: unknown; error?: unknown };
      if (typeof nested.message === "string" && nested.message.trim()) return nested.message;
      if (typeof nested.error === "string" && nested.error.trim()) return nested.error;
    }
    return undefined;
  }

  private async fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    context?: { method: string; endpoint: string },
  ): Promise<Response> {
    const method = context?.method ?? init.method ?? "GET";
    const endpoint = context?.endpoint ?? this.describeInput(input);
    this.debug(`${method} ${endpoint} request started (timeout=${this.requestTimeoutMs}ms)`);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(`timeout:${this.requestTimeoutMs}`);
    }, this.requestTimeoutMs);

    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort((init.signal as { reason?: unknown }).reason);
      } else {
        init.signal.addEventListener(
          "abort",
          () => controller.abort((init.signal as { reason?: unknown }).reason),
          { once: true },
        );
      }
    }

    try {
      const response = await this.fetchImpl(input, { ...init, signal: controller.signal });
      this.debug(`${method} ${endpoint} response status=${response.status}`);
      return response;
    } catch (error) {
      throw this.transportError(error, context);
    } finally {
      clearTimeout(timeout);
    }
  }

  private transportError(error: unknown, context?: { method: string; endpoint: string }): CliError {
    const base =
      this.extractTransportError(error) ??
      this.extractMessage(error) ??
      (error instanceof Error && error.message ? error.message : undefined) ??
      "Failed to reach BlueBubbles API";
    const prefix = context ? `${context.method} ${context.endpoint}: ` : "";
    this.debug(`${prefix}${base}`);
    return new CliError(`${prefix}${base}`, "network", error);
  }

  private extractTransportError(error: unknown): string | undefined {
    if (!error || typeof error !== "object") return undefined;
    const candidate = error as {
      code?: unknown;
      name?: unknown;
      path?: unknown;
      message?: unknown;
      cause?: unknown;
      details?: unknown;
    };

    if (typeof candidate.code === "string" && candidate.code === "FailedToOpenSocket") {
      const target = typeof candidate.path === "string" ? candidate.path : this.baseUrl;
      return `Unable to connect to BlueBubbles API at ${target}`;
    }

    if (typeof candidate.name === "string" && candidate.name === "AbortError") {
      return `Request timed out after ${this.requestTimeoutMs}ms`;
    }

    if (typeof candidate.message === "string" && candidate.message.includes("timeout")) {
      return `Request timed out after ${this.requestTimeoutMs}ms`;
    }

    if (candidate.details && typeof candidate.details === "object") {
      const details = candidate.details as { code?: unknown; path?: unknown; message?: unknown };
      if (typeof details.code === "string" && details.code === "FailedToOpenSocket") {
        const target = typeof details.path === "string" ? details.path : this.baseUrl;
        return `Unable to connect to BlueBubbles API at ${target}`;
      }
      if (typeof details.message === "string" && details.message.trim()) {
        return details.message;
      }
    }

    if (candidate.cause && typeof candidate.cause === "object") {
      const cause = candidate.cause as { code?: unknown; message?: unknown };
      if (typeof cause.code === "string" && cause.code === "FailedToOpenSocket") {
        return `Unable to connect to BlueBubbles API at ${this.baseUrl}`;
      }
      if (typeof cause.message === "string" && cause.message.trim()) {
        return cause.message;
      }
    }

    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }

    return undefined;
  }

  private describeInput(input: RequestInfo | URL): string {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.href;
    return input.url;
  }

  private debug(message: string): void {
    if (!this.verbose) return;
    console.error(`[verbose] ${message}`);
  }
}
