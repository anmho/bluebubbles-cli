import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const getSettings = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any>>("/api/v1/backup/settings");

export const setSettings = (client: BlueBubblesClient, name: string, settings: any) =>
  client.postFixed<ApiEnvelope>("/api/v1/backup/settings", { name, data: settings });

export const deleteSettings = (client: BlueBubblesClient, name: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/backup/settings/<name>",
    { "<name>": name },
  );
