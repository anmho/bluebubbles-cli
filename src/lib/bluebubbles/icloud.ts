import type { ApiEnvelope, BlueBubblesClient } from "~/lib/bluebubbles/client.js";

export const getICloudAccount = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any>>("/api/v1/icloud/account");

export const getContactCard = (client: BlueBubblesClient, address?: string) =>
  client.fetchTemplated<ApiEnvelope<any>>(
    "GET",
    "/api/v1/icloud/contact",
    {},
    undefined,
    { address },
  );

export const getFindMyDevices = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any>>("/api/v1/icloud/findmy/devices");

export const getFindMyFriends = (client: BlueBubblesClient) =>
  client.getFixed<ApiEnvelope<any>>("/api/v1/icloud/findmy/friends");

export const refreshFindMyDevices = (client: BlueBubblesClient) =>
  client.postFixed<ApiEnvelope<any>>("/api/v1/icloud/findmy/devices/refresh", {});

export const refreshFindMyFriends = (client: BlueBubblesClient) =>
  client.postFixed<ApiEnvelope<any>>("/api/v1/icloud/findmy/friends/refresh", {});

export const modifyActiveAlias = (client: BlueBubblesClient, alias: string) =>
  client.postFixed<ApiEnvelope>("/api/v1/icloud/account/alias" as any, { alias });
