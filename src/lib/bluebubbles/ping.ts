import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const ping = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope>("/api/v1/ping");
