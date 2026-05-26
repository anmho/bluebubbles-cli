import type { Command } from "commander";
import { spawn } from "node:child_process";
import { getCliVersion } from "~/lib/version.js";
import { printError, printSuccess } from "~/lib/output.js";
import { CliError } from "~/lib/errors.js";

const PACKAGE_NAME = "bluebubbles-cli";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

type LatestPackageInfo = {
  version: string;
  homepage?: string;
};

async function fetchLatestVersion(): Promise<LatestPackageInfo> {
  const response = await fetch(REGISTRY_URL, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`npm registry returned ${response.status} for ${REGISTRY_URL}`);
  }
  const body = (await response.json()) as LatestPackageInfo;
  if (!body.version) {
    throw new Error(`npm registry response missing 'version' for ${PACKAGE_NAME}`);
  }
  return body;
}

function compareSemver(a: string, b: string): number {
  const parse = (s: string) => s.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);
  if (aMaj !== bMaj) return (aMaj ?? 0) - (bMaj ?? 0);
  if (aMin !== bMin) return (aMin ?? 0) - (bMin ?? 0);
  return (aPatch ?? 0) - (bPatch ?? 0);
}

function runInstall(packageManager: "npm" | "bun" | "pnpm" | "yarn"): Promise<number> {
  const command =
    packageManager === "bun"
      ? ["bun", "add", "-g", `${PACKAGE_NAME}@latest`]
      : packageManager === "pnpm"
        ? ["pnpm", "add", "-g", `${PACKAGE_NAME}@latest`]
        : packageManager === "yarn"
          ? ["yarn", "global", "add", `${PACKAGE_NAME}@latest`]
          : ["npm", "install", "-g", `${PACKAGE_NAME}@latest`];
  return new Promise((resolve) => {
    const child = spawn(command[0]!, command.slice(1), { stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", () => resolve(1));
  });
}

export function registerUpdateCommands(program: Command): void {
  program
    .command("update")
    .description(`Update ${PACKAGE_NAME} to the latest version on npm`)
    .option("--check", "Only check for an available update; do not install")
    .option(
      "--package-manager <pm>",
      "Package manager to use: npm | bun | pnpm | yarn (default: npm)",
      "npm",
    )
    .action(async (options: { check?: boolean; packageManager?: string }) => {
      const current = getCliVersion();
      let latest: LatestPackageInfo;
      try {
        latest = await fetchLatestVersion();
      } catch (error) {
        printError(new CliError(error instanceof Error ? error.message : "Failed to query npm registry", "network"));
        process.exitCode = 1;
        return;
      }

      const cmp = compareSemver(current, latest.version);
      if (cmp >= 0) {
        printSuccess(
          `${PACKAGE_NAME} is up to date (installed ${current}, latest ${latest.version}).`,
          false,
        );
        return;
      }

      if (options.check) {
        printSuccess(
          `${PACKAGE_NAME} update available: ${current} → ${latest.version}. Run 'bluebubbles update' to install.`,
          false,
        );
        return;
      }

      const pm = (options.packageManager ?? "npm").toLowerCase();
      if (!["npm", "bun", "pnpm", "yarn"].includes(pm)) {
        printError(new CliError(`Unknown --package-manager '${pm}'. Use npm | bun | pnpm | yarn.`, "validation"));
        process.exitCode = 1;
        return;
      }

      printSuccess(
        `Updating ${PACKAGE_NAME} ${current} → ${latest.version} via ${pm}...`,
        false,
      );
      const exitCode = await runInstall(pm as "npm" | "bun" | "pnpm" | "yarn");
      if (exitCode !== 0) {
        printError(new CliError(`Update failed (exit ${exitCode}). Try a different --package-manager.`, "general"));
        process.exitCode = exitCode;
        return;
      }
      printSuccess(`Updated ${PACKAGE_NAME} to ${latest.version}.`, false);
    });
}
