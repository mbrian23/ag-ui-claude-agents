# AG-UI + Claude Agent SDK — pluggable libraries + DevOps demo

Reusable building blocks for natural-language data exploration over arbitrary domains:

- **`packages/agent-server`** — generic AG-UI HTTP/SSE server backed by the Claude Agent SDK. Skill-pluggable: drop in MCP tools + a system-prompt fragment, get a working agent.
- **`packages/agent-react`** — generic React `<ChatShell>` (chat input, persistence, abort/retry, markdown, copy, PDF export). Catalog-agnostic: pass it a list of widgets and it wires the rest.
- **`packages/agent-pdf`** — generic PDF route + react-pdf primitives. Mirrors a widget catalog into PDF-renderable form.
- **`packages/agent-core`** — shared widget definitions, spec validation, palette.

Plus one demo using all four:

- **`examples/devops`** — DevOps analyst agent over a mocked dataset (10 services / 600 deploys / 32 incidents / 240 PRs / 1.2k CI runs). User asks questions → agent renders inline widgets and can export to PDF.

## Quickstart

```bash
cp .env.example .env       # add ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL)
pnpm install

# terminal A
pnpm dev:devops:agent      # http://localhost:8020/devops

# terminal B
pnpm dev:devops:web        # http://localhost:3000
```

`.env` (workspace root) needs `ANTHROPIC_API_KEY` (native) **or** `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` (OpenRouter / proxy). With OpenRouter, `ANTHROPIC_BASE_URL` must be `https://openrouter.ai/api` — **no trailing `/v1`**.

Optional: set `GITHUB_TOKEN` to enable the demo's second skill (`mcp__devops__github_list_pull_requests`, shells out to the local `gh` CLI). Without it the demo runs with only the four mock-data DevOps tools.

Open `http://localhost:3000` and try:

- "What's our deploy frequency this month?" → KPI tile
- "Show deploys per service for the last 30 days" → bar chart
- "Plot weekly PR cycle time" → line chart
- "List open incidents" → table
- "How is each service doing right now?" → status grid
- "Give me a PDF of the current deploy frequency" → renders + auto-downloads PDF

## Architecture

```
Browser (examples/devops/web)
  └─ <ChatShell widgets={devopsWidgets} agentUrl=...>     (agent-react)
        └─ HttpAgent.runAgent({
              tools: [render_widget, export_pdf],
              context: [{description, value: catalog.prompt()}]
           }, subscriber)
        │   POST http://localhost:8020/devops    (AG-UI SSE)
        ▼
Agent (examples/devops/agent)
  └─ createAgentServer({ skills: [devopsSkill], baseSystemPrompt, ... })   (agent-server)
        │   - composes skill.systemPromptFragment into the system prompt
        │   - registers each skill's MCP tools
        │   - appends RunAgentInput.context to the system prompt every turn
        ▼
Claude Agent SDK
  └─ tools available:
       (skill MCP tools — devops here: list_services, list_incidents, query_metrics, summarize_period)
       render_widget(spec)                                  (frontend tool)
       export_pdf(title?)                                   (frontend tool)
```

### Frontend tool feedback loop (the missing AG-UI half)

The Claude Agent SDK halts after every frontend tool call and yields to the client. `agent-react`'s `ChatShell` runs a small loop: after each `runAgent`, push a `ToolMessage` (`role: "tool"`, `toolCallId`, short `content`) for every frontend call that fired, then call `runAgent` again. The loop ends when a turn produces no frontend tool calls (capped at 5 iterations).

### Catalog handshake (plug-in pattern)

The agent is **catalog-agnostic**. Every `runAgent` call ships the catalog's description (built via `catalog.prompt()` from json-render) in `RunAgentInput.context`. The `@ag-ui/claude-agent-sdk` adapter appends that to the system prompt. Swap the catalog in the example → the agent's prompt updates without touching agent code.

## Where things live

| Concern | Location |
|---|---|
| Generic server (HTTP / SSE / CORS / skill composition) | `packages/agent-server/src/{server,compose,skill}.ts` |
| Generic React shell (chat / persistence / abort / markdown / copy / PDF download) | `packages/agent-react/src/chat-shell.tsx` |
| Generic PDF route + primitives | `packages/agent-pdf/src/{route,registry,primitives}.tsx` |
| Widget definition + spec validation + palette | `packages/agent-core/src/{widget,spec,theme}.ts` |
| **DevOps skill (MCP tools + prompt fragment)** | `examples/devops/agent/src/skills/devops/` |
| DevOps server entry | `examples/devops/agent/src/server.ts` |
| Mock dataset + tests | `examples/devops/agent/src/data/{seed,store,types}.ts` + `store.test.ts` |
| **DevOps widget list (extension point)** | `examples/devops/web/src/components/widget-catalog.tsx` |
| Per-widget components (web + PDF in one file) | `examples/devops/web/src/components/widgets/*.tsx` |
| DevOps web `ChatShell` mount | `examples/devops/web/src/components/chat-shell.tsx` |
| DevOps PDF export route | `examples/devops/web/src/app/api/export/pdf/route.ts` |

## Adding things

### A new data source / tool to the DevOps skill

`examples/devops/agent/src/skills/devops/index.ts` aggregates the MCP tools and the prompt fragment. Add a new tool with `tool()` from `@anthropic-ai/claude-agent-sdk`, register it on the skill, and document it in the prompt fragment.

### A new widget type

Build the component (web + PDF flavors in one `defineWidget` call) under `examples/devops/web/src/components/widgets/your-widget.tsx`, then add it to the `devopsWidgets` array in `widget-catalog.tsx`. Both the web `<ChatShell>` and the `/api/export/pdf` route read from the same array.

### A whole new domain (different agent + dashboard)

Create a new `examples/<your-domain>/{agent,web}` pair using the same packages. The packages contain no DevOps-specific code.

## Chat features (in `agent-react`'s `ChatShell`)

- **Persisted thread + "New conversation"** — threadId and messages live in `localStorage` under a configurable key (DevOps uses `devops-dashboard.session.v1`). Reload preserves the conversation; the header button starts fresh.
- **Stop / Retry** — single `AbortController` per turn, threaded through every `runAgent` call in the feedback loop.
- **Markdown rendering** — `react-markdown` for assistant text; user input stays plain.
- **Copy as markdown** — per-message; serializes assistant text + each widget's data via the widget's `toMarkdown()` function.
- **Export PDF** — per-message button posts to the configured PDF route.
- **Agent-driven `export_pdf`** — model invokes the frontend tool after rendering widgets; bubble shows a status pill (`Preparing PDF…` / `PDF ready` / `PDF failed`).

## CORS / security

- Agent server: CORS allowlist via `ALLOWED_ORIGINS` env (comma-separated, default `http://localhost:3000`). `*` opts back into wide-open dev mode.
- PDF route: 256 KB body cap + simple in-process per-IP rate limit (10/min by default; configurable via `createPdfRoute({rateLimit})`). For multi-instance deployments swap to Redis / Upstash.

## Project layout

```
ag-ui-claude-agents/
├── packages/
│   ├── agent-core/              # widget defs + spec validation + palette
│   ├── agent-server/            # generic AG-UI server + skill composition
│   ├── agent-react/             # generic <ChatShell> + WidgetSurface + markdown
│   └── agent-pdf/               # generic PDF route + primitives + registry builder
├── examples/
│   └── devops/
│       ├── agent/
│       │   └── src/
│       │       ├── server.ts                  # createAgentServer({skills: [devopsSkill]})
│       │       ├── skills/devops/             # MCP tools + system-prompt fragment
│       │       └── data/                      # mock dataset + store.test.ts (vitest)
│       └── web/
│           └── src/
│               ├── app/page.tsx
│               ├── app/api/export/pdf/route.ts # createPdfRoute({widgets: devopsWidgets})
│               └── components/
│                   ├── chat-shell.tsx          # <GenericChatShell widgets={...}>
│                   ├── widget-catalog.tsx      # ⭐ devopsWidgets list
│                   └── widgets/                # per-widget defineWidget()
└── docs/json-render/            # local mirror of the json-render docs
```

## Caveats picked up the hard way

- `@json-render/react-pdf`'s main entry calls `React.createContext` at module top level and trips Next.js's RSC restrictions. `agent-pdf` imports from `@json-render/react-pdf/render` (server-only sub-path) instead.
- `catalog.validate()` from `@json-render/core` rejects elements that omit `visible`, even though the docs treat it as optional. We use `validateSpec` in `agent-core` for structural checks.
- Some models occasionally emit the `render_widget` `spec` arg as a JSON-encoded string instead of an object. `agent-react`'s `WidgetSurface` JSON.parses if it sees a string before validating.
- The Claude Agent SDK halts after every frontend tool call. `agent-react`'s `ChatShell` runs the feedback loop so multi-tool sequences (render → export) chain.

## Docs

| Doc | Audience |
|---|---|
| [`docs/wiring-a-new-app.md`](docs/wiring-a-new-app.md) | End-to-end recipe for building a new domain agent + dashboard from these four packages. |
| [`packages/agent-core/README.md`](packages/agent-core/README.md) | `defineWidget`, spec helpers, palette, tool-name constants. |
| [`packages/agent-server/README.md`](packages/agent-server/README.md) | `createAgentServer`, `defineSkill`, bash whitelist, env validation. |
| [`packages/agent-react/README.md`](packages/agent-react/README.md) | `<ChatShell>`, `<WidgetSurface>`, `<WidgetCard>`, markdown helpers. |
| [`packages/agent-pdf/README.md`](packages/agent-pdf/README.md) | `createPdfRoute`, `buildPdfRegistry`, chart primitives. |
| [`examples/devops/web/README.md`](examples/devops/web/README.md) | Demo-specific wiring notes. |

## Scripts

```bash
pnpm typecheck          # tsc --noEmit across all packages + examples
pnpm test               # vitest run across all packages + examples
pnpm dev:devops:agent   # examples/devops/agent
pnpm dev:devops:web     # examples/devops/web
```
