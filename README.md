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
bluebubbles chat list -o json
bluebubbles contact list --renderer columnify
```

## Command shape

```bash
bluebubbles ping
bluebubbles server info
bluebubbles server local status
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
bun run docs:dev
bun run docs:validate
```

`test:commands` is local-only by design. It exercises all registered CLI commands and can skip unavailable API/local prerequisites in tolerant mode.

The API Reference tab renders from `docs/openapi.yaml`, which is a pinned copy of the official BlueBubbles OpenAPI source:

```text
https://raw.githubusercontent.com/Jish2/bluebubbles-sdk/main/openapi.yaml
```
