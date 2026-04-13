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
bluebubbles contacts list
bluebubbles chats list -o wide
bluebubbles messages list --chat 'iMessage;+;chat123' -o wide
bluebubbles chats list -o json
```

Human-readable output (`columnify`) is the default:

```text
NAME            PHONE             EMAIL
Alex Rivera     +1-555-0100       alex@example.com
Taylor Kim      +1-555-0199       taylor@example.com
```

`messages list` uses the same default table style:

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
bluebubbles messages list --chat 'iMessage;+;chat123'
bluebubbles messages list --chat 'iMessage;+;chat123' -o wide
bluebubbles messages list --chat 'iMessage;+;chat123' --json
```

`-o wide` affects table output only. JSON output remains the full payload (`-o json` / `--json`).

Pagination defaults are conservative for message-heavy commands:

- `bluebubbles messages list` defaults to `--limit 50`
- `bluebubbles chats messages <guid>` defaults to `--limit 50`

## Query and filter examples

Get all messages for one conversation in pages:

```bash
bluebubbles messages list --chat 'iMessage;+;chat123' --limit 50 --offset 0 --json
bluebubbles messages list --chat 'iMessage;+;chat123' --limit 50 --offset 50 --json
bluebubbles messages list --chat 'iMessage;+;chat123' --limit 50 --offset 100 --json
```

Filter by date window (epoch seconds):

```bash
bluebubbles messages list --chat 'iMessage;+;chat123' --after 1710000000 --before 1710086400 --json
```

Common filters:

```bash
bluebubbles messages list --chat 'iMessage;+;chat123' --text 'invoice' --limit 50 --json
bluebubbles messages list --chat 'iMessage;+;chat123' --from '+15551234567' --not-from-me --json
bluebubbles messages list --chat 'iMessage;+;chat123' --from-me --has-attachments --json
```

Common filters are applied client-side to the returned page. Use `--where` for raw server-side filtering.

Advanced filtering via raw API `where` clauses:

```bash
bluebubbles messages list \
  --where '[{"statement":"message.text LIKE :q","args":{"q":"%hello%"}}]' \
  --limit 50 \
  --json
```

Conversation endpoint alternative:

```bash
bluebubbles chats messages 'iMessage;+;chat123' --limit 50 --offset 0 --json
bluebubbles chats messages 'iMessage;+;chat123' --after 1710000000 --before 1710086400 --json
```

## Command shape

```bash
bluebubbles ping
bluebubbles server info
bluebubbles server open
bluebubbles server status
bluebubbles server logs
bluebubbles server logs --source api
bluebubbles chats list
bluebubbles messages send --chat <guid> --message "hello"
bluebubbles messages schedule list
bluebubbles handle availability <address>
bluebubbles attachment download <guid>
bluebubbles contact query --address user@example.com
bluebubbles icloud account
```

Verbose diagnostics:

```bash
bluebubbles messages list --chat 'iMessage;+;chat123' --verbose
```

`--verbose` prints request/response diagnostics to stderr. You can also set `BLUEBUBBLES_VERBOSE=1`.

Request timeout defaults to `10000ms` and can be overridden with `BLUEBUBBLES_REQUEST_TIMEOUT_MS`.

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

Docs are served via Scalar and deployed to GitHub Pages.

```bash
bun run docs:dev
bun run docs:validate
```

GitHub Pages workflow publishes `scalar/index.html` at:

```text
https://anmho.github.io/bluebubbles-cli/
```

`test:commands` is local-only by design. It exercises all registered CLI commands and can skip unavailable API/local prerequisites in tolerant mode. It uses the same auth sources as normal CLI runs (`BLUEBUBBLES_*` env vars or persisted `bluebubbles config` values).

The API Reference tab renders from `docs/openapi.yaml`, which is a pinned copy of the official BlueBubbles OpenAPI source:

```text
https://raw.githubusercontent.com/Jish2/bluebubbles-sdk/main/openapi.yaml
```
