import { createClient } from "@jgoon/bluebubbles";
import type { paths } from "@jgoon/bluebubbles";
import { CliError } from "../errors.js";

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

export class BlueBubblesClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sdkClient: ReturnType<typeof createClient>;

  constructor(private readonly config: ApiConfig) {
    this.baseUrl = this.normalizeBaseUrl(config.baseUrl);
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.sdkClient = createClient({
      baseUrl: this.baseUrl,
      fetch: this.fetchImpl,
    });
  }

  async getFixed<T>(pathName: keyof paths, query: QueryParams = {}): Promise<T> {
    const { data, error, response } = await this.sdkClient.GET(pathName, {
      params: { query: { password: this.config.password, ...query } },
    } as never);
    if (!response.ok || error) {
      throw this.responseError(response, error, { method: "GET", endpoint: String(pathName) });
    }
    return data as T;
  }

  async postFixed<T>(pathName: keyof paths, body: unknown, query: QueryParams = {}): Promise<T> {
    const { data, error, response } = await this.sdkClient.POST(pathName, {
      params: { query: { password: this.config.password, ...query } },
      body,
    } as never);
    if (!response.ok || error) {
      throw this.responseError(response, error, { method: "POST", endpoint: String(pathName) });
    }
    return data as T;
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
