import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const listContacts = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any[]>>("/api/v1/contact" as any);

export const queryContacts = (
  client: BlueBubblesClient,
  input: { addresses?: string[] },
) => client.postFixed<ApiEnvelope<any[]>>("/api/v1/contact/query" as any, input);
