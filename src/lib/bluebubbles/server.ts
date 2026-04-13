import type { paths } from "@jgoon/bluebubbles";
import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export type ServerInfo = NonNullable<
  paths["/api/v1/server/info"]["get"]["responses"][200]["content"]["application/json"]["data"]
>;

export const getServerInfo = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<ServerInfo>>("/api/v1/server/info");

export const getRemoteLogs = (client: BlueBubblesClient, count = 100) =>
  client.getFixed<ApiEnvelope<string>>("/api/v1/server/logs", { count });

export const checkServerUpdate = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any>>("/api/v1/server/update/check");

export const installServerUpdate = (client: BlueBubblesClient, wait = false) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/server/update/install",
    {},
    {},
    { wait },
  );

export const restartServices = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope>("/api/v1/server/restart/soft");

export const restartApp = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope>("/api/v1/server/restart/hard");

export const getAlerts = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any[]>>("/api/v1/server/alert");

export const markAlertRead = (client: BlueBubblesClient, ids: number[]) =>
  client.postFixed<ApiEnvelope>("/api/v1/server/alert/read", { ids });
