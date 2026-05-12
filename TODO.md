# TODO — ag-ui-claude-agents

Cold-start brief for a new session. Read this first.

## What this repo is

A set of pluggable building blocks for AG-UI / Claude Agent SDK apps, plus one demo using them:

- **`packages/agent-server`** — generic HTTP/SSE server + skill composition. Each skill bundles MCP tools and a system-prompt fragment.
- **`packages/agent-react`** — generic React `<ChatShell>`: persistence, abort/retry, markdown, copy, PDF, AG-UI frontend-tool feedback loop.
- **`packages/agent-pdf`** — generic PDF route + react-pdf primitives + registry builder.
- **`packages/agent-core`** — shared widget definitions, spec validation, palette.
- **`examples/devops`** — DevOps analyst agent over a mocked dataset (10 services / 600 deploys / 32 incidents / 240 PRs / 1.2k CI runs). The end-to-end demo.

## Run it

```bash
pnpm install
pnpm dev:devops:agent   # terminal A → http://localhost:8020/devops
pnpm dev:devops:web     # terminal B → http://localhost:3000
```

`.env` (workspace root) needs `ANTHROPIC_API_KEY` (native) **or** `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` (OpenRouter / proxy). **Important**: with OpenRouter, `ANTHROPIC_BASE_URL` must be `https://openrouter.ai/api` — no trailing `/v1`. Claude Code's CLI appends `/v1/messages` itself; with `/v1` you get `/v1/v1/messages → 404 → "model not found"`.

## Where things live

| Concern | File |
|---|---|
| Generic HTTP / SSE / CORS / skill composition | `packages/agent-server/src/{server,compose,skill}.ts` |
| Generic React shell (chat / persistence / abort / markdown / copy / PDF) | `packages/agent-react/src/chat-shell.tsx` |
| Generic PDF route + primitives | `packages/agent-pdf/src/{route,registry,primitives}.tsx` |
| Widget definition + spec validation + palette | `packages/agent-core/src/{widget,spec,theme}.ts` |
| DevOps server entry (`createAgentServer({skills:[devopsSkill]})`) | `examples/devops/agent/src/server.ts` |
| DevOps skill (MCP tools + prompt fragment) | `examples/devops/agent/src/skills/devops/` |
| DevOps mock data + tests | `examples/devops/agent/src/data/{seed,store,types}.ts` + `store.test.ts` |
| DevOps web `ChatShell` mount | `examples/devops/web/src/components/chat-shell.tsx` |
| DevOps widget list (extension point) | `examples/devops/web/src/components/widget-catalog.tsx` |
| Per-widget components (web + PDF in one `defineWidget` call) | `examples/devops/web/src/components/widgets/*.tsx` |
| DevOps PDF export route (`createPdfRoute({widgets})`) | `examples/devops/web/src/app/api/export/pdf/route.ts` |
| Agent URL config | `examples/devops/web/src/lib/config.ts` (override with `NEXT_PUBLIC_AGENT_URL`) |

## Current state — what works

- All packages typecheck (`pnpm typecheck`) and the data store tests pass (`pnpm test`, 15/15).
- End-to-end verified for KPI / bar / line / table / status grid widgets, multi-widget `stack` responses, manual PDF export, agent-driven `export_pdf`, persistence across reload, Stop / Retry, markdown text rendering.
- Catalog handshake: every `runAgent` call ships `catalog.prompt()` in `RunAgentInput.context`; the adapter appends it to the system prompt. The agent has zero hard-coded widget knowledge — swap the catalog and the agent adapts.
- Frontend-tool feedback loop is wired in `agent-react`'s `ChatShell`: after each `runAgent`, push a `ToolMessage` for every frontend tool that fired, then call `runAgent` again. Loops until a turn produces no frontend calls (cap 5).

## How the demo flows

```
Browser (examples/devops/web)
  └─ <ChatShell widgets={devopsWidgets} agentUrl=...>          (agent-react)
        └─ HttpAgent.runAgent({
              tools: [render_widget, export_pdf],
              context: [{description, value: catalog.prompt()}]
           }, subscriber)
        │   POST http://localhost:8020/devops      (AG-UI SSE: text/event-stream)
        ▼
Agent (examples/devops/agent)
  └─ createAgentServer({skills: [devopsSkill], baseSystemPrompt, ...})  (agent-server)
        │   internally wraps ClaudeAgentAdapter (@ag-ui/claude-agent-sdk)
        │   appends RunAgentInput.context to the system prompt every turn
        ▼
Claude (via OpenRouter or native Anthropic)
  └─ tools available:
       skill MCP tools (devops: list_services / list_incidents / query_metrics / summarize_period)
       render_widget    (frontend tool — agent-react handles it client-side)
       export_pdf       (frontend tool — agent-react POSTs to /api/export/pdf)
```

## json-render docs are local

The [json-render](https://json-render.dev) documentation is mirrored under `docs/json-render/` (28 pages, including `api/core.md`, `api/react.md`, `api/react-pdf.md`, `streaming.md`, `ag-ui.md`). Read those before touching items 1 / 2 below.

---

## TODO (all 13 items shipped — kept here as a changelog / handover map)

### 1. ✅ Adopt json-render (Path A) — DONE
Tree shape `{root, elements}` chosen over flat `{type, spec}` (unlocks multi-widget responses in one tool call). Catalog at `examples/devops/web/src/components/widget-catalog.tsx`, mounted through `<Renderer>` in `widget-registry.tsx` via `WidgetSurface`. Existing per-widget Zod schemas became component `props` in the catalog. A `stack` slot component groups multi-widget responses.

Gotchas worth knowing if you touch this:
- `catalog.validate()` rejects elements that don't include `visible`, even though the doc claims it's optional. We use `validateSpec` from `@json-render/core` for structural checks instead.
- The model occasionally JSON-encodes the `spec` arg as a string. `WidgetSurface` JSON.parses if it sees a string before validating.

### 2. ✅ PDF export — DONE (charts: native react-pdf primitives)
Per-message "Export PDF" button **and** an agent-callable `export_pdf({title?})` frontend tool both work. Files:
- `examples/devops/web/src/lib/pdf/catalog.tsx` — `ComponentRegistry` keyed by the same widget names as the web catalog. Charts hand-drawn with `@react-pdf` `Svg`/`Rect`/`Polyline`/`Path`. Standard layout components (Document, Page, Heading, Text) come from `@json-render/react-pdf`'s `standardComponentDefinitions`, auto-merged at render time.
- `examples/devops/web/src/app/api/export/pdf/route.ts` — POST `{spec, text?, title?}`, wraps in Document/Page, returns `application/pdf`. **Imports from `@json-render/react-pdf/render`** (server-only sub-path) to dodge Next's RSC ban on top-level `createContext` in the main entry.
- `examples/devops/web/src/components/widget-markdown.ts` — pure markdown serializer used by the Copy button.

Multi-tool feedback loop (the missing half of the AG-UI frontend-tool contract) is now wired in `chat-shell.tsx`'s `send`: after each `runAgent`, push a `ToolMessage` (`role: "tool"`, `toolCallId`, short `content`) for every frontend tool that fired, then call `runAgent` again. Loops until a turn has no frontend tool calls, capped at 5 iterations.

### 3. ✅ Persist threadId + "New conversation" button — DONE
Persisted in `localStorage` (key `devops-dashboard.session.v1`) under `{threadId, messages, agentMessages}`. Loaded after mount in a `useEffect` to dodge SSR hydration mismatch. Header has a "New conversation" button that aborts any active run, clears localStorage, generates a fresh threadId, and rebuilds the HttpAgent.

### 4. ✅ Stop / Retry on chat runs — DONE
Single `AbortController` per turn, threaded through every `runAgent` call inside the multi-iteration loop. While running, Send becomes Stop. On error, an inline alert with Retry reruns the last user prompt. The 5-iteration cap is still in place as a backstop.

### 5. ✅ Render assistant text as markdown — DONE
Assistant text rendered via `react-markdown` inside a Tailwind prose container. User input still plain (`whitespace-pre-wrap`).

### 6. ✅ Eliminate prompt vs catalog drift — DONE (and made the agent pluggable)
The agent's `system.ts` no longer lists widget shapes. `widget-catalog.tsx` exports `catalogPromptBlock()` (calls `catalog.prompt(...)` from json-render). Each `runAgent` call ships that string in `RunAgentInput.context`; the `@ag-ui/claude-agent-sdk` adapter appends it to the system prompt automatically. Swap `widget-catalog.tsx` to a different catalog → the agent's prompt updates with no agent-side edits.

### 7. ✅ Tighten CORS + protect /api/export/pdf — DONE
Agent: `ALLOWED_ORIGINS` env (comma-separated, default `http://localhost:3000`). `*` opts back into wide-open dev mode. `Vary: Origin` set when echoing a specific origin.
Web export route: 256 KB body cap + simple in-process per-IP rate limit (10 / minute). For multi-instance deployments swap to Redis / Upstash.

### 8. ✅ Clean up `.env` model overrides — DONE
Removed `ANTHROPIC_DEFAULT_HAIKU/SONNET/OPUS_MODEL` and `ANTHROPIC_SMALL_FAST_MODEL` from `.env`. Only `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `MODEL`, and `PORT` remain.

### 9. ✅ Move/delete e2e screenshots from repo root — DONE
Repo root is clean. `.gitignore` now excludes `e2e-*.png` and `.playwright-mcp/` so future smoke runs stay out of version control.

### 10. ✅ Data store unit tests — DONE
`examples/devops/agent/src/data/store.test.ts` (vitest) — 15 tests covering record counts, determinism under seed 42, FK integrity (every event links to a real service id), 60-day window bounds, status/severity enums, `resolvedAt` ↔ `status` invariant, and \`rangeStartMs\` / \`withinRange\` / \`findService\` / \`dayKey\` / \`weekKey\` correctness. Run via \`pnpm --filter agent test\`.

### 11. ✅ README rewrite — DONE
Refreshed to reflect: direct `@ag-ui/client` `HttpAgent` (no CopilotKit), json-render catalog as the widget extension point, PDF route + agent-callable `export_pdf` tool, the catalog-handshake pattern, and the AG-UI frontend-tool feedback loop. Includes a "Caveats picked up the hard way" section.

### 12. ✅ PDF: loading affordance during agent-driven export — DONE
Per-message status pill (`Preparing PDF…` → `PDF ready · {title}` / `PDF failed`) driven by a `pdfStatus` field on the `ChatMessage`. The `export_pdf` branch in `chat-shell.tsx`'s `onToolCallEndEvent` flips state on dispatch, success, and error.

### 13. ✅ PDF: chart fidelity polish — DONE
Bar chart now uses palette colors per bar + value labels above. Line chart has a legend when more than one series and labels every nth x tick when n > 12. Pie chart legend includes both raw value and percent + a Total row. Charts also carry a vertical Y-axis label.

---

## What NOT to do

- Don't reintroduce CopilotKit. We removed it deliberately. The chat is built directly on `@ag-ui/client`.
- Don't re-add the `/api/copilotkit` Next.js proxy route — the browser hits the agent server directly. CORS is already permissive in dev.
- Don't change the AG-UI tool name `render_widget` without also updating `examples/devops/agent/src/prompts/system.ts` — the system prompt explicitly tells the model to call it.
- Don't add `mcp__ag_ui__ag_ui_update_state` back to `allowedTools` — it's blocked on purpose so the agent uses `render_widget` instead of trying to mutate shared state.
- Don't bypass zod validation in `WidgetRegistry`. The amber error card is the *intended* UX when the model emits a bad spec.

## Useful search anchors

- `examples/devops/agent/src/skills/devops/` — the DevOps skill (MCP tools + system-prompt fragment). **Extension point for new data tools.**
- `examples/devops/web/src/components/widget-catalog.tsx` — `devopsWidgets` array. **Extension point for new widget types** (read by both the web `<ChatShell>` and the PDF route).
- `packages/agent-react/src/chat-shell.tsx` — generic `<ChatShell>`: AG-UI client, frontend-tool feedback loop, persistence, abort, markdown, copy, PDF.
- `packages/agent-server/src/server.ts` + `compose.ts` — generic HTTP/SSE server and skill→prompt composition.
- `packages/agent-pdf/src/route.ts` — generic PDF route (`createPdfRoute`).

## Verification recipe

```bash
# All packages + examples
pnpm typecheck
pnpm test                            # vitest across the workspace

# Boot the DevOps demo
pnpm dev:devops:agent                # → http://localhost:8020/devops
pnpm dev:devops:web                  # → http://localhost:3000

# Smoke
curl http://localhost:8020/health    # → {"status":"healthy","route":"devops"}
```

In the browser, the canonical test prompts are:
- "How many services do we have? Show as a single KPI tile." → `kpi_tile`
- "Show deploys per service for the last 30 days as a bar chart." → `bar_chart`
- "List the open incidents in a table." → `table`
- "How is each service doing right now?" → `status_grid`

If any of those crash or render an amber error card, something regressed.
