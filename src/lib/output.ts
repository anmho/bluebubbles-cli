import columnify from "columnify";
import type { CliError } from "~/lib/errors.js";
import type { ChatSummary, DoctorCheck, MessageSummary } from "~/lib/types.js";

type Row = Record<string, string>;
type ColumnSpec<T> = {
  name: string;
  value: (item: T) => unknown;
  maxWidth?: number;
};

const DEFAULT_COLUMN_WIDTH = 40;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0) return value;
  if (value.length <= maxWidth) return value;
  if (maxWidth <= 3) return value.slice(0, maxWidth);
  return `${value.slice(0, maxWidth - 3)}...`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function getPath(value: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = value;

  for (const part of parts) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10);
      if (Number.isNaN(index)) return undefined;
      current = current[index];
      continue;
    }

    const record = asRecord(current);
    if (!record) return undefined;
    current = record[part];
  }

  return current;
}

export function firstPath(value: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const found = getPath(value, path);
    if (found !== undefined && found !== null && String(found).trim() !== "") {
      return found;
    }
  }
  return undefined;
}

function toDisplay(value: unknown, maxWidth = DEFAULT_COLUMN_WIDTH): string {
  if (value == null) return "";

  if (Array.isArray(value)) {
    const rendered = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        const address = firstPath(item, ["address", "value", "id"]);
        if (address != null) return String(address);
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(", ");
    return truncateText(normalizeText(rendered), maxWidth);
  }

  if (typeof value === "object") {
    return truncateText(normalizeText(JSON.stringify(value)), maxWidth);
  }

  return truncateText(normalizeText(String(value)), maxWidth);
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

export function formatAge(value: unknown): string {
  const date = parseDate(value);
  if (!date) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const future = diffMs < 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  const render = (amount: number, unit: string) => `${amount}${unit}`;
  let base = "";

  if (seconds < 60) base = render(seconds, "s");
  else if (seconds < 3600) base = render(Math.floor(seconds / 60), "m");
  else if (seconds < 86400) base = render(Math.floor(seconds / 3600), "h");
  else if (seconds < 86400 * 30) base = render(Math.floor(seconds / 86400), "d");
  else if (seconds < 86400 * 365) base = render(Math.floor(seconds / (86400 * 30)), "mo");
  else base = render(Math.floor(seconds / (86400 * 365)), "y");

  return future ? `in ${base}` : base;
}

export function formatTimestamp(value: unknown): string {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "";
}

function columnifyRenderer(rows: Row[], columns: string[]): string {
  return columnify(rows, {
    columns,
    showHeaders: true,
    preserveNewLines: false,
    headingTransform: (heading: string) => heading.toUpperCase(),
    truncate: false,
    config: Object.fromEntries(columns.map((column) => [column, { minWidth: column.length }])),
  });
}

function renderRows(rows: Row[], columns: string[]): string {
  return columnifyRenderer(rows, columns);
}

export function printTableRows<T>(items: T[], columns: ColumnSpec<T>[]): void {
  const rows: Row[] = items.map((item) => {
    const row: Row = {};
    for (const column of columns) {
      row[column.name] = toDisplay(column.value(item), column.maxWidth ?? DEFAULT_COLUMN_WIDTH);
    }
    return row;
  });

  console.log(renderRows(rows, columns.map((column) => column.name)));
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printSuccess(data: unknown, json = false): void {
  if (json) {
    printJson({ ok: true, data });
    return;
  }

  if (typeof data === "string") {
    console.log(data);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

export function printError(error: CliError, json = false): void {
  if (json) {
    printJson({
      ok: false,
      error: {
        kind: error.kind,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  console.error(error.message);
}

export function printKeyValue(data: Record<string, unknown>): void {
  const rows = Object.entries(data).map(([key, value]) => ({ key, value: toDisplay(value, 100) }));
  console.log(renderRows(rows, ["key", "value"]));
}

export function printChats(chats: ChatSummary[]): void {
  printTableRows(chats, [
    { name: "guid", value: (chat) => chat.guid, maxWidth: 28 },
    { name: "name", value: (chat) => chat.displayName, maxWidth: 28 },
    { name: "identifier", value: (chat) => chat.chatIdentifier, maxWidth: 28 },
    {
      name: "participants",
      value: (chat) =>
        (chat.participants ?? [])
          .map((participant) => participant.address ?? "")
          .filter(Boolean)
          .join(", "),
      maxWidth: 32,
    },
    { name: "last_message", value: (chat) => chat.lastMessage?.text, maxWidth: 40 },
    { name: "age", value: (chat) => formatAge(chat.lastMessage?.dateCreated) },
  ]);
}

export function printMessages(messages: MessageSummary[]): void {
  printTableRows(messages, [
    { name: "guid", value: (message) => message.guid, maxWidth: 28 },
    { name: "from", value: (message) => (message.isFromMe ? "me" : message.handle?.address), maxWidth: 20 },
    { name: "text", value: (message) => message.text, maxWidth: 48 },
    { name: "age", value: (message) => formatAge(message.dateCreated) },
    { name: "chat", value: (message) => message.chats?.[0]?.guid, maxWidth: 28 },
  ]);
}

export function printDoctorChecks(checks: DoctorCheck[]): void {
  printTableRows(checks, [
    { name: "status", value: (check) => check.status.toUpperCase() },
    { name: "check", value: (check) => check.name, maxWidth: 28 },
    { name: "detail", value: (check) => check.detail, maxWidth: 60 },
  ]);
}

export function printAlerts(alerts: unknown[]): void {
  printTableRows(alerts, [
    { name: "id", value: (alert) => firstPath(alert, ["id"]) },
    { name: "type", value: (alert) => firstPath(alert, ["type"]), maxWidth: 12 },
    { name: "message", value: (alert) => firstPath(alert, ["value", "message"]), maxWidth: 80 },
    { name: "age", value: (alert) => formatAge(firstPath(alert, ["created", "createdAt", "dateCreated"])) },
    { name: "read", value: (alert) => (firstPath(alert, ["isRead"]) ? "yes" : "no") },
  ]);
}

function extractPrimary(list: unknown, path = "address"): string {
  if (!Array.isArray(list) || list.length === 0) return "";
  const first = firstPath(list[0], [path]);
  const firstText = first == null ? "" : String(first);
  if (list.length === 1) return firstText;
  return `${firstText} (+${list.length - 1})`;
}

export function printContacts(contacts: unknown[]): void {
  printTableRows(contacts, [
    { name: "name", value: (contact) => firstPath(contact, ["displayName", "firstName"]), maxWidth: 32 },
    { name: "phone", value: (contact) => extractPrimary(firstPath(contact, ["phoneNumbers"])), maxWidth: 24 },
    { name: "email", value: (contact) => extractPrimary(firstPath(contact, ["emails"])), maxWidth: 32 },
    { name: "source", value: (contact) => firstPath(contact, ["sourceType"]), maxWidth: 10 },
  ]);
}

export function printHandles(handles: unknown[]): void {
  printTableRows(handles, [
    { name: "address", value: (handle) => firstPath(handle, ["address", "handle.address"]), maxWidth: 32 },
    { name: "country", value: (handle) => firstPath(handle, ["country"]), maxWidth: 12 },
    { name: "id", value: (handle) => firstPath(handle, ["id", "originalROWID"]), maxWidth: 10 },
  ]);
}

export function printThemes(themes: unknown[]): void {
  printTableRows(themes, [
    { name: "name", value: (theme) => firstPath(theme, ["name", "id"]), maxWidth: 30 },
    { name: "updated", value: (theme) => formatAge(firstPath(theme, ["updated", "updatedAt", "created", "createdAt"])) },
  ]);
}

export function printScheduledMessages(items: unknown[]): void {
  printTableRows(items, [
    { name: "id", value: (item) => firstPath(item, ["id"]), maxWidth: 8 },
    { name: "type", value: (item) => firstPath(item, ["type"]), maxWidth: 16 },
    { name: "status", value: (item) => firstPath(item, ["status", "schedule.type"]), maxWidth: 14 },
    { name: "message", value: (item) => firstPath(item, ["payload.message"]), maxWidth: 40 },
    { name: "when", value: (item) => formatTimestamp(firstPath(item, ["scheduledFor"])), maxWidth: 28 },
    { name: "age", value: (item) => formatAge(firstPath(item, ["scheduledFor"])) },
  ]);
}

function formatCoordinates(value: unknown): string {
  const latitude = firstPath(value, ["location.latitude", "latitude", "lat"]);
  const longitude = firstPath(value, ["location.longitude", "longitude", "lon", "lng"]);
  if (latitude == null || longitude == null) return "";
  return `${latitude}, ${longitude}`;
}

function formatBattery(value: unknown): string {
  const batteryLevel = firstPath(value, ["batteryLevel", "battery.level"]);
  if (typeof batteryLevel !== "number") return "";
  if (batteryLevel <= 1) return `${Math.round(batteryLevel * 100)}%`;
  return `${Math.round(batteryLevel)}%`;
}

export function printFindMyDevices(devices: unknown[]): void {
  printTableRows(devices, [
    { name: "name", value: (device) => firstPath(device, ["name", "displayName", "title"]), maxWidth: 28 },
    { name: "model", value: (device) => firstPath(device, ["model", "deviceClass", "deviceModel"]), maxWidth: 20 },
    { name: "battery", value: (device) => formatBattery(device), maxWidth: 8 },
    { name: "location", value: (device) => formatCoordinates(device), maxWidth: 24 },
    { name: "age", value: (device) => formatAge(firstPath(device, ["location.timeStamp", "updated", "updatedAt"])) },
  ]);
}

export function printFindMyFriends(friends: unknown[]): void {
  printTableRows(friends, [
    { name: "name", value: (friend) => firstPath(friend, ["name", "displayName", "title"]), maxWidth: 28 },
    { name: "location", value: (friend) => formatCoordinates(friend), maxWidth: 24 },
    { name: "age", value: (friend) => formatAge(firstPath(friend, ["location.timeStamp", "updated", "updatedAt"])) },
  ]);
}

export function tailLines(contents: string, count: number): string {
  return contents.split(/\r?\n/).filter(Boolean).slice(-count).join("\n");
}
