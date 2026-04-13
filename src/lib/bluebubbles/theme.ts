import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const getThemes = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any[]>>("/api/v1/backup/theme");

export const setTheme = (client: BlueBubblesClient, name: string, theme: any) =>
  client.postFixed<ApiEnvelope>("/api/v1/backup/theme", { name, data: theme });

export const deleteTheme = (client: BlueBubblesClient, name: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/backup/theme/<name>",
    { "<name>": name },
  );
