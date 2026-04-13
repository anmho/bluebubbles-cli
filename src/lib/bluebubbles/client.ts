import { BlueBubblesClient as SdkClient } from "@anmho/bluebubbles-sdk";
import { CliError } from "~/lib/errors.js";

export interface ApiConfig {
  baseUrl: string;
  password: string;
  fetchImpl?: typeof fetch;
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

  constructor(private readonly config: ApiConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.sdkClient = new SdkClient({
      baseUrl: this.baseUrl,
      password: this.config.password,
      fetch: this.fetchImpl,
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

    const response = await this.fetchImpl(url, {
      method,
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    });

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
    const response = await this.fetchImpl(url);

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
    const result = await resultPromise;
    const response = result.response;
    if (!response) {
      throw new CliError(`${context.method} ${context.endpoint}: No response from SDK request`, "network", result);
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

    const response = await this.fetchImpl(url, {
      method,
      ...(body !== undefined && {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    });

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
}
