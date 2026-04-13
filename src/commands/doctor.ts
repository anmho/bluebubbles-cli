import type { Command } from "commander";
import {
  addConnectionOptions,
  maybePrint,
  withConfig,
} from "~/lib/cli-helpers.js";
import {
  printDoctorChecks,
} from "~/lib/output.js";
import { runDoctor } from "~/lib/doctor.js";
import { OPENAPI_SPEC_URL } from "~/lib/constants.js";
import type { CommandOverrides, OutputOptions } from "~/lib/types.js";

export function registerDoctorCommands(program: Command): void {
  addConnectionOptions(program.command("doctor").description("Run BlueBubbles environment diagnostics")).action(
    async (options: CommandOverrides & OutputOptions & { config?: string }) => {
      const context = await withConfig(options);
      const checks = await runDoctor({
        config: context.config,
        configPath: context.configPath,
        statePath: context.statePath,
      });
      maybePrint(
        {
          checks,
          openapiSpecUrl: OPENAPI_SPEC_URL,
        },
        options,
        () => printDoctorChecks(checks),
      );
    },
  );
}
