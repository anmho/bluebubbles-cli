# bluebubbles-cli

`bluebubbles-cli` is a Bun-first BlueBubbles CLI with a curated, resource-oriented command tree for terminal use.

It is not positioned as a full endpoint browser. The CLI keeps the common resource flows prominent, removes low-value surface area like `fcm`, `mac`, and web-only commands, and shows the API endpoint mapping in command help and docs.

## Install

```bash
npm install -g bluebubbles-cli
```

From source:

```bash
bun install
bun run build
bun link
```

## Development

```bash
bun run check
bun test
bun run test:commands
bun run build
```

Run from source:

```bash
bun run dev -- --help
```

Output controls:

```bash
bluebubbles contact list
bluebubbles chat list -o json
```

Human-readable output (`columnify`) is the default:

```text
NAME            PHONE             EMAIL
Alex Rivera     +1-555-0100       alex@example.com
Taylor Kim      +1-555-0199       taylor@example.com
```

`message list` uses the same default table style:

```text
GUID                        FROM       TEXT                          AGE   CHAT
4b2f...e91                  me         hello from bluebubbles        2m    iMessage;+;chat123
9aa1...77c                  +1555...   sounds good, see you soon     8m    iMessage;+;chat123
```

JSON output is available with `-o json` or `--json`:

```json
{
  "ok": true,
  "data": [
    {
      "displayName": "Alex Rivera",
      "phoneNumbers": [{ "address": "+1-555-0100" }],
      "emails": [{ "address": "alex@example.com" }]
    }
  ]
}
```

For messages:

```bash
bluebubbles message list --chat 'iMessage;+;chat123'
bluebubbles message list --chat 'iMessage;+;chat123' --json
```

## Command shape

```bash
bluebubbles ping
bluebubbles server info
bluebubbles server status
bluebubbles server logs
bluebubbles server logs --source api
bluebubbles chat list
bluebubbles message send --chat <guid> --message "hello"
bluebubbles message schedule list
bluebubbles handle availability <address>
bluebubbles attachment download <guid>
bluebubbles contact query --address user@example.com
bluebubbles icloud account
```

## Configuration

Persist config:

```bash
bluebubbles config set baseUrl http://localhost:1234
bluebubbles config set password your-server-password
```

Or use environment variables:

```bash
export BLUEBUBBLES_BASE_URL=http://localhost:1234
export BLUEBUBBLES_PASSWORD=your-server-password
```

If your password contains shell-special characters (for example `#`), quote it:

```bash
export BLUEBUBBLES_PASSWORD='your#server#password'
```

## Docs

Mintlify is configured through the local `mint` dev dependency.

```bash
bun run docs:sync-openapi
bun run docs:dev
bun run docs:validate
```

`test:commands` is local-only by design. It exercises all registered CLI commands and can skip unavailable API/local prerequisites in tolerant mode.

The API Reference tab renders from `docs/openapi.yaml`, which is a pinned copy of the official BlueBubbles OpenAPI source:

```text
https://raw.githubusercontent.com/Jish2/bluebubbles-sdk/main/openapi.yaml
```
