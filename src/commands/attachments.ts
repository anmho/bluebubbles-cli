import type { Command } from "commander";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  addConnectionOptions,
  maybePrint,
  withBlueBubblesDeps,
} from "~/lib/cli-helpers.js";
import {
  printKeyValue,
  printSuccess,
} from "~/lib/output.js";
import {
  downloadAttachment,
  forceDownloadAttachment,
  getAttachment,
} from "~/lib/bluebubbles/attachment.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

async function saveResponse(
  response: Response,
  guid: string,
  outputPath?: string,
): Promise<string> {
  const filename =
    response.headers.get("content-disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
    guid;
  const destination = outputPath || path.join(process.cwd(), filename);
  const buffer = await response.arrayBuffer();
  await writeFile(destination, Buffer.from(buffer));
  return destination;
}

export function registerAttachmentCommands(program: Command): void {
  const attachmentCommand = program.command("attachment").description("Attachment resource operations");

  addConnectionOptions(
    attachmentCommand.command("get").description("Fetch attachment metadata (GET /api/v1/attachment/<GUID>)"),
  )
    .argument("<guid>", "Attachment GUID")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions) => {
      const result = await getAttachment(client, guid);
      maybePrint(result.data, options, () => printKeyValue(result.data ?? {}));
    }));

  addConnectionOptions(
    attachmentCommand.command("download").description("Download an attachment (GET /api/v1/attachment/<GUID>/download)"),
  )
    .argument("<guid>", "Attachment GUID")
    .option("--file <path>", "Local save destination path")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { file?: string }) => {
      const response = await downloadAttachment(client, guid);
      const destination = await saveResponse(response, guid, options.file);
      maybePrint({ path: destination }, options, () => printSuccess(`Downloaded to: ${destination}`, false));
    }));

  addConnectionOptions(
    attachmentCommand.command("force-download").description("Force download an attachment (GET /api/v1/attachment/<GUID>/download/force)"),
  )
    .argument("<guid>", "Attachment GUID")
    .option("--file <path>", "Local save destination path")
    .action(withBlueBubblesDeps(({ client }) => async (guid: string, options: CommandOverrides & OutputOptions & { file?: string }) => {
      const response = await forceDownloadAttachment(client, guid);
      const destination = await saveResponse(response, guid, options.file);
      maybePrint({ path: destination }, options, () => printSuccess(`Downloaded to: ${destination}`, false));
    }));
}
