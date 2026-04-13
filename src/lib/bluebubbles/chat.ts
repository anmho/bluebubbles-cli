import type { ChatSummary, MessageSummary } from "~/lib/types.js";
import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const listChats = (
  client: BlueBubblesClient,
  input: {
    limit?: number;
    offset?: number;
    with?: string[];
    sort?: string;
  },
) => client.postFixed<ApiEnvelope<ChatSummary[]>>("/api/v1/chat/query", input);

export const getChat = (
  client: BlueBubblesClient,
  chatGuid: string,
  withItems?: string[],
) =>
  client.fetchTemplated<ApiEnvelope<ChatSummary>>(
    "GET",
    "/api/v1/chat/<Chat GUID>",
    { "<Chat GUID>": chatGuid },
    undefined,
    { with: withItems?.join(",") },
  );

export const updateChat = (
  client: BlueBubblesClient,
  chatGuid: string,
  displayName: string,
) =>
  client.fetchTemplated<ApiEnvelope>(
    "PUT",
    "/api/v1/chat/<Chat GUID>",
    { "<Chat GUID>": chatGuid },
    { displayName },
  );

export const deleteChat = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/chat/<Chat GUID>",
    { "<Chat GUID>": chatGuid },
  );

export const listChatMessages = (
  client: BlueBubblesClient,
  input: {
    chatGuid: string;
    limit?: number;
    offset?: number;
    sort?: string;
    after?: string;
    before?: string;
    with?: string[];
  },
) =>
  client.fetchTemplated<ApiEnvelope<MessageSummary[]>>(
    "GET",
    "/api/v1/chat/<Chat GUID>/message",
    { "<Chat GUID>": input.chatGuid },
    undefined,
    {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      after: input.after,
      before: input.before,
      with: input.with?.join(","),
    },
  );

export const startTyping = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<void>(
    "POST",
    "/api/v1/chat/<Chat GUID>/typing",
    { "<Chat GUID>": chatGuid },
  );

export const stopTyping = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<void>(
    "DELETE",
    "/api/v1/chat/<Chat GUID>/typing",
    { "<Chat GUID>": chatGuid },
  );

export const leaveChat = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/chat/<Chat GUID>/leave",
    { "<Chat GUID>": chatGuid },
  );

export const addParticipant = (
  client: BlueBubblesClient,
  chatGuid: string,
  address: string,
) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/chat/<Chat GUID>/participant",
    { "<Chat GUID>": chatGuid },
    { address },
  );

export const removeParticipant = (
  client: BlueBubblesClient,
  chatGuid: string,
  address: string,
) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/chat/<Chat GUID>/participant",
    { "<Chat GUID>": chatGuid },
    { address },
  );

export const setGroupIcon = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "POST",
    "/api/v1/chat/<Chat GUID>/icon",
    { "<Chat GUID>": chatGuid },
  );

export const removeGroupIcon = (client: BlueBubblesClient, chatGuid: string) =>
  client.fetchTemplated<ApiEnvelope>(
    "DELETE",
    "/api/v1/chat/<Chat GUID>/icon",
    { "<Chat GUID>": chatGuid },
  );
