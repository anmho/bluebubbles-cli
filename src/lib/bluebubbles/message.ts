import type { MessageSummary } from "~/lib/types.js";
import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export interface SendTextInput {
  chatGuid: string;
  message: string;
  method?: string;
  subject?: string;
  effectId?: string;
  selectedMessageGuid?: string;
}

export interface SendReactInput {
  chatGuid: string;
  selectedMessageGuid: string;
  reaction: string;
  selectedMessageText?: string;
  partIndex?: number;
}

export interface EditMessageInput {
  editedMessage: string;
  backwardsCompatibilityMessage?: string;
  partIndex?: number;
}

export const listMessages = (
  client: BlueBubblesClient,
  input: {
    limit?: number;
    offset?: number;
    sort?: string;
    chatGuid?: string;
    with?: string[];
    where?: Array<Record<string, unknown>>;
    after?: number;
    before?: number;
  },
) => client.postFixed<ApiEnvelope<MessageSummary[]>>("/api/v1/message/query", input);

export const getMessage = (
  client: BlueBubblesClient,
  guid: string,
  withItems?: string[],
) =>
  client.fetchTemplated<ApiEnvelope<MessageSummary>>(
    "GET",
    "/api/v1/message/<GUID>",
    { "<GUID>": guid },
    undefined,
    { with: withItems?.join(",") },
  );

export const sendText = (client: BlueBubblesClient, input: SendTextInput) =>
  client.postFixed<ApiEnvelope>("/api/v1/message/text", input);

export const sendReact = (client: BlueBubblesClient, input: SendReactInput) =>
  client.postFixed<ApiEnvelope>("/api/v1/message/react", input);

export const editMessage = (
  client: BlueBubblesClient,
  guid: string,
  input: EditMessageInput,
) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/message/<GUID>/edit",
    { "<GUID>": guid },
    input,
  );

export const unsendMessage = (
  client: BlueBubblesClient,
  guid: string,
  input?: { partIndex?: number },
) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/message/<GUID>/unsend",
    { "<GUID>": guid },
    input,
  );

export const getScheduledMessages = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any[]>>("/api/v1/message/schedule" as any);

export const createScheduledMessage = (
  client: BlueBubblesClient,
  input: { type: string; payload: any; scheduledFor: number; schedule?: { type: string } },
) => client.postFixed<ApiEnvelope>("/api/v1/message/schedule" as any, input);

export const deleteScheduledMessage = (client: BlueBubblesClient, id: number) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/message/schedule/<ID>",
    { "<ID>": String(id) },
  );

export const getScheduledMessage = (client: BlueBubblesClient, id: number) =>
  client.fetchTemplated<ApiEnvelope<any>>(
    "GET",
    "/api/v1/message/schedule/<ID>",
    { "<ID>": String(id) },
  );

export const updateScheduledMessage = (
  client: BlueBubblesClient,
  id: number,
  input: Record<string, unknown>,
) =>
  client.fetchTemplated<ApiEnvelope>(
    "PUT",
    "/api/v1/message/schedule/<ID>",
    { "<ID>": String(id) },
    input,
  );
