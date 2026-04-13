import type { Command } from "commander";
import {
  addConnectionOptions,
  maybePrint,
  withBlueBubblesDeps,
} from "~/lib/cli-helpers.js";
import {
  printFindMyDevices,
  printFindMyFriends,
  printKeyValue,
  printSuccess,
} from "~/lib/output.js";
import {
  getContactCard,
  getFindMyDevices,
  getFindMyFriends,
  getICloudAccount,
  modifyActiveAlias,
  refreshFindMyDevices,
  refreshFindMyFriends,
} from "~/lib/bluebubbles/icloud.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerICloudCommands(program: Command): void {
  const icloudCommand = program.command("icloud").description("iCloud resource operations");

  addConnectionOptions(
    icloudCommand.command("account").description("Fetch iCloud account metadata (GET /api/v1/icloud/account)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await getICloudAccount(client);
    maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
  }));

  addConnectionOptions(
    icloudCommand.command("contact").description("Fetch an iCloud contact card (GET /api/v1/icloud/contact)"),
  )
    .option("--address <string>", "Email or phone number")
    .action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions & { address?: string }) => {
      const result = await getContactCard(client, options.address);
      maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
    }));

  const findMyCommand = icloudCommand.command("findmy").description("FindMy resource operations");

  const devicesCommand = findMyCommand.command("devices").description("FindMy device operations");

  addConnectionOptions(
    devicesCommand.command("list").description("Fetch FindMy device locations (GET /api/v1/icloud/findmy/devices)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await getFindMyDevices(client);
    maybePrint(result.data, options, () => {
      if (!result.data || result.data.length === 0) {
        console.log("No devices found or FindMy not enabled.");
        return;
      }
      printFindMyDevices(result.data);
    });
  }));

  addConnectionOptions(
    devicesCommand.command("refresh").description("Refresh FindMy device locations (POST /api/v1/icloud/findmy/devices/refresh)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await refreshFindMyDevices(client);
    maybePrint(result.data, options, () => printSuccess(result.message ?? "FindMy devices refreshed.", false));
  }));

  const friendsCommand = findMyCommand.command("friends").description("FindMy friends operations");

  addConnectionOptions(
    friendsCommand.command("list").description("Fetch FindMy friend locations (GET /api/v1/icloud/findmy/friends)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await getFindMyFriends(client);
    maybePrint(result.data, options, () => {
      if (!result.data || result.data.length === 0) {
        console.log("No friends found or FindMy not enabled.");
        return;
      }
      printFindMyFriends(result.data);
    });
  }));

  addConnectionOptions(
    friendsCommand.command("refresh").description("Refresh FindMy friend locations (POST /api/v1/icloud/findmy/friends/refresh)"),
  ).action(withBlueBubblesDeps(({ client }) => async (options: CommandOverrides & OutputOptions) => {
    const result = await refreshFindMyFriends(client);
    maybePrint(result.data, options, () => printSuccess(result.message ?? "FindMy friends refreshed.", false));
  }));

  const aliasCommand = icloudCommand.command("alias").description("Manage active iMessage alias");

  addConnectionOptions(
    aliasCommand.command("set").description("Set the active alias (POST /api/v1/icloud/account/alias)"),
  )
    .argument("<email>", "The vetted iCloud alias to use")
    .action(withBlueBubblesDeps(({ client }) => async (email: string, options: CommandOverrides & OutputOptions) => {
      const result = await modifyActiveAlias(client, email);
      maybePrint(result.data, options, () => printSuccess(`Active alias set to: ${email}`, false));
    }));
}
