import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const SDK_OPENAPI_URL = "https://raw.githubusercontent.com/Jish2/bluebubbles-sdk/main/openapi.yaml";
const METHODS = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchOpenApi(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
  }
  const payload = await response.text();
  const parsed = parse(payload);
  if (!isRecord(parsed)) {
    throw new Error("OpenAPI payload is not an object.");
  }
  return parsed;
}

function patchResponses(spec: Record<string, unknown>): number {
  const paths = spec.paths;
  if (!isRecord(paths)) return 0;

  let patched = 0;
  for (const pathItem of Object.values(paths)) {
    if (!isRecord(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method) || !isRecord(operation)) continue;
      const responses = operation.responses;
      if (!isRecord(responses) || Object.keys(responses).length === 0) {
        operation.responses = { "200": { description: "Successful response" } };
        patched += 1;
      }
    }
  }
  return patched;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.resolve(scriptDir, "..", "docs", "openapi.yaml");

  const spec = await fetchOpenApi(SDK_OPENAPI_URL);
  const patchedCount = patchResponses(spec);
  const serialized = stringify(spec, { lineWidth: 0 });
  await writeFile(outPath, serialized, "utf8");

  console.log(`synced ${outPath} from ${SDK_OPENAPI_URL} (patched operations: ${patchedCount})`);
}

await main();
