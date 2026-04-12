export type ErrorKind =
  | "general"
  | "validation"
  | "auth"
  | "network"
  | "process"
  | "not-found";

const EXIT_CODES: Record<ErrorKind, number> = {
  general: 1,
  validation: 2,
  auth: 3,
  network: 4,
  process: 5,
  "not-found": 6,
};

export class CliError extends Error {
  readonly kind: ErrorKind;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(message: string, kind: ErrorKind = "general", details?: unknown) {
    super(message);
    this.name = "CliError";
    this.kind = kind;
    this.exitCode = EXIT_CODES[kind];
    this.details = details;
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  if (error instanceof Error) return new CliError(error.message, "general");
  return new CliError("Unexpected error", "general", error);
}
