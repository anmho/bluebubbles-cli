export interface CliConfig {
  baseUrl?: string;
  password?: string;
  appPath?: string;
  logPath?: string;
  launchArgs?: string[];
}

export interface ConfigContext {
  config: CliConfig;
  configPath: string;
  dataDir: string;
  statePath: string;
  defaultLogPath: string;
}

export interface RuntimeState {
  pid: number;
  appPath: string;
  executablePath: string;
  launchedAt: string;
  logPath: string;
  args: string[];
}

export type OutputFormat = "table" | "wide" | "json";

export interface OutputOptions {
  json?: boolean;
  output?: OutputFormat;
}

export interface CommandOverrides extends CliConfig {
  configPath?: string;
  verbose?: boolean;
}

export interface ChatSummary {
  guid?: string;
  displayName?: string;
  chatIdentifier?: string;
  participants?: Array<{ address?: string }>;
  lastMessage?: {
    text?: string | null;
    dateCreated?: number;
  };
}

export interface MessageSummary {
  guid?: string;
  text?: string | null;
  isFromMe?: boolean;
  dateCreated?: number;
  handle?: { address?: string } | null;
  attachments?: unknown[];
  chats?: Array<{ guid?: string; displayName?: string | null }>;
}

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}
