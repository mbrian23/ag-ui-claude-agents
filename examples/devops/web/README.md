# DevOps demo — web

Next.js 16 client for the DevOps analyst agent. Consumes `agent-react`, `agent-pdf`, and `agent-core` from the workspace. The agent at `examples/devops/agent` answers data questions; this app surfaces them as inline widgets and PDF exports.

## Run

```bash
# from the repo root, with .env populated and the agent running
pnpm dev:devops:web        # http://localhost:3000
```

Override the agent URL with `NEXT_PUBLIC_AGENT_URL` (defaults to `http://localhost:8020/devops`).

## Where things live

| Concern | File |
|---|---|
| Mounts `<ChatShell>` with DevOps config | `src/components/chat-shell.tsx` |
| **The widget list (extension point)** | `src/components/widget-catalog.tsx` |
| Per-widget components (web + PDF + `toMarkdown`) | `src/components/widgets/*.tsx` |
| Recharts components (split for Next RSC) | `src/components/widgets/*-web.tsx` |
| PDF export route | `src/app/api/export/pdf/route.ts` (`createPdfRoute(...)`) |
| Agent URL config | `src/lib/config.ts` |

See `docs/wiring-a-new-app.md` at the repo root for the end-to-end recipe to build your own analogous app.

## Adding a widget

1. Build it: `widgets/<name>.tsx` exporting `defineWidget({...})`. Web renderer + PDF renderer + schema all required.
2. Recharts-using widgets need a split into `<name>-web.tsx` (`"use client"`) and `<name>.tsx` (the `defineWidget` call, no directive). See `packages/agent-core/README.md` for why.
3. Add the export to the array in `widget-catalog.tsx`.

Both `<ChatShell widgets>` and `createPdfRoute({ widgets })` read from the same list, so a new widget is picked up everywhere once it's in the catalog.
