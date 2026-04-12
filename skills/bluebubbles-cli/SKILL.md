---
name: bluebubbles-cli
description: Operate the BlueBubbles terminal CLI for iMessage workflows and server administration. Use when tasks involve sending or querying messages/chats/handles/contacts/attachments, managing iCloud or server operations, running local server lifecycle commands, validating webhooks, or diagnosing connectivity with doctor/ping/config.
---

# bluebubbles-cli

Use this skill to perform BlueBubbles work through the `bluebubbles` CLI instead of direct SDK/database access unless explicitly requested.

## Instructions

1. Verify CLI availability before action.
Run `bluebubbles --help` and then the relevant `<resource> --help` command.

2. Prefer API-backed resource commands for runtime behavior.
Use these primary resources:
- `bluebubbles chat ...`
- `bluebubbles message ...`
- `bluebubbles handle ...`
- `bluebubbles attachment ...`
- `bluebubbles contact ...`
- `bluebubbles icloud ...`
- `bluebubbles server ...`
- `bluebubbles ping`
- `bluebubbles doctor`

3. Use local-process operations only for local lifecycle management.
Use `bluebubbles server local start|stop|restart|status|logs` for host process control.

4. Set or bootstrap credentials before API calls.
Use one of:
- `bluebubbles config set baseUrl <url>`
- `bluebubbles config set password <password>`
- `bluebubbles config sync` for local bootstrap from BlueBubbles server config on macOS.

5. Use output modes intentionally.
- Human-readable: `-o table` (default)
- Automation: `-o json` or `--json`
- Renderer selection: `--renderer columnify|compact`

6. Apply safe, scriptable command patterns.
- Query/list commands should prefer `--limit`, `--offset`, and `--sort` when available.
- For scripts, always use `--json` and parse deterministically.
- For interactive troubleshooting, use table output first, then rerun with JSON if needed.

7. Keep endpoint mapping visible in responses when useful.
Each command help includes endpoint mapping like `(GET /api/v1/...)`; surface it when explaining why a command is used.

8. Prefer minimal, reversible operations first.
- Start with read/list/get commands before update/delete actions.
- Confirm target GUIDs/addresses before mutating operations (send/edit/unsend/update/delete).

9. Webhook tooling is local utility work.
Use:
- `bluebubbles webhook validate [file]`
- `bluebubbles webhook serve`

10. Use this quick command selection map.
- Messaging: `chat`, `message`, `message schedule`
- Participants/identity: `handle`, `contact`, `icloud`
- Server/admin: `server info|logs|alert|update|restart|settings|theme|local`
- Diagnostics/config: `doctor`, `ping`, `config`
