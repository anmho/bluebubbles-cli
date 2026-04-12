import type { ApiEnvelope, BlueBubblesClient } from "./client.js";

export const queryHandles = (
  client: BlueBubblesClient,
  input: { address?: string; limit?: number; offset?: number },
) =>
  client.postFixed<ApiEnvelope<any[]>>("/api/v1/handle/query", {
    address: input.address,
    limit: input.limit,
    // BlueBubbles currently expects `skip` even though the OpenAPI spec documents `offset`.
    skip: input.offset ?? 0,
  });

export const getHandleAvailability = (client: BlueBubblesClient, address: string) =>
  client.fetchTemplated<ApiEnvelope<{ available: boolean }>>(
    "GET",
    "/api/v1/handle/<address>/availability",
    { "<address>": address },
  );
