import type { ApiEnvelope, BlueBubblesClient } from "./client.js";

export const ping = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope>("/api/v1/ping");
