import type { ApiEnvelope, BlueBubblesClient } from "./client.js";

export const getAttachment = (client: BlueBubblesClient, guid: string) =>
  client.fetchTemplated<ApiEnvelope<any>>(
    "GET",
    "/api/v1/attachment/<GUID>",
    { "<GUID>": guid },
  );

export const downloadAttachment = (client: BlueBubblesClient, guid: string) =>
  client.fetchDownload("/api/v1/attachment/<GUID>/download", {
    "<GUID>": guid,
  });

export const forceDownloadAttachment = (client: BlueBubblesClient, guid: string) =>
  client.fetchDownload("/api/v1/attachment/<GUID>/download/force", {
    "<GUID>": guid,
  });
