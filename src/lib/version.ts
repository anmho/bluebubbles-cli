import { createRequire } from "node:module";

type PackageMetadata = {
  version?: string;
};

const require = createRequire(import.meta.url);

export function getCliVersion(): string {
  try {
    const pkg = require("../../package.json") as PackageMetadata;
    if (typeof pkg.version === "string" && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    // Fall through to environment/fallback.
  }

  return process.env.npm_package_version ?? "0.0.0-dev";
}
