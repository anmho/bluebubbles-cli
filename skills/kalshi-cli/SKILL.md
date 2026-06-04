# Kalshi CLI

Use this skill when the user wants to query Kalshi market data or run portfolio/order operations from the terminal.

## Scope

- Uses the official TypeScript SDK: `kalshi-typescript`
- Works through the local CLI package at `kalshi-cli/`
- Supports output modes:
  - default table
  - `-o wide`
  - `--json`

## Prerequisites

From repo root:

```bash
cd kalshi-cli
bun install
bun run build
```

Optional local install:

```bash
bun run install:system
```

## Authentication

Kalshi API authentication uses API key ID + RSA private key signing.

```bash
export KALSHI_API_KEY_ID="..."
export KALSHI_PRIVATE_KEY_PATH="$HOME/.kalshi/key.pem"
```

Or persist via config:

```bash
kalshi config set apiKeyId ...
kalshi config set privateKeyPath "$HOME/.kalshi/key.pem"
```

## Common commands

Public:

```bash
kalshi ping
kalshi exchange status
kalshi events list --limit 20
kalshi markets list --limit 20 -o wide
```

Authenticated:

```bash
kalshi portfolio balance
kalshi portfolio positions --limit 20
kalshi orders list --limit 20
kalshi account limits
```

## Validation

```bash
bun run check
bun run build
bun run test:commands
```

