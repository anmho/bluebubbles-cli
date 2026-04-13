import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { CliError } from "~/lib/errors.js";
import type { OutputOptions } from "~/lib/types.js";

type BlueBubblesWebhookPayload = {
  type: string;
  [key: string]: unknown;
};

function isBlueBubblesWebhookPayload(value: unknown): value is BlueBubblesWebhookPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as { type?: unknown };
  return typeof payload.type === "string" && payload.type.trim().length > 0;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function validateWebhookPayload(filePath?: string): Promise<unknown> {
  const raw = filePath ? await readFile(filePath, "utf8") : await readStdin();
  const payload = JSON.parse(raw);

  if (!isBlueBubblesWebhookPayload(payload)) {
    throw new CliError("Input is not a valid BlueBubbles webhook payload.", "validation", payload);
  }

  return payload;
}

export async function serveWebhookReceiver(input: {
  port: number;
  routePath: string;
  output: OutputOptions;
}): Promise<void> {
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== input.routePath) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }

    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!isBlueBubblesWebhookPayload(payload)) {
        throw new CliError("Invalid BlueBubbles webhook payload.", "validation");
      }

      if (input.output.json) {
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log(`[${new Date().toISOString()}] ${payload.type}`);
      }

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, eventType: payload.type }));
    } catch (error) {
      const cliError = error instanceof CliError ? error : new CliError("Invalid JSON payload.", "validation");
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: false,
          error: cliError.message,
        }),
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(input.port, () => {
      if (input.output.json) {
        console.log(
          JSON.stringify(
            {
              ok: true,
              data: {
                port: input.port,
                path: input.routePath,
              },
            },
            null,
            2,
          ),
        );
      } else {
        console.log(`Listening for BlueBubbles webhooks on http://127.0.0.1:${input.port}${input.routePath}`);
      }
    });
  });
}
