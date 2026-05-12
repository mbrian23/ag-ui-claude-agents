# agent-react

React / Next-side runtime for an agent built on `agent-server`. Builds a json-render registry from your widgets, mounts `<WidgetSurface>`, and drives the AG-UI client loop in `<ChatShell>`.

## What's in here

| Export | Purpose |
|---|---|
| `<ChatShell agentUrl agentId widgets ...>` | Batteries-included chat UI. Persists threads in `localStorage`, handles abort/retry, streams assistant text via `react-markdown`, runs the AG-UI frontend-tool feedback loop, and optionally calls a PDF route. |
| `<WidgetSurface spec registry knownTypes>` | Mounts a json-render spec, validates it, shows a structured error card for bad input. |
| `<WidgetCard title>` | Simple white card frame for web widget bodies. Mirrors `ChartCard` from `agent-pdf/primitives`. |
| `buildWebRegistry(widgets)` | Returns `{ registry, componentNames, knownTypes, catalogPromptBlock }` from a list of `Widget`s. The built-in `stack` slot is added automatically. (Used internally by `<ChatShell>`; exported in case you want to mount a `<WidgetSurface>` outside the shell.) |
| `createSpecMarkdownRenderer(widgets)` | Returns `{ specToMarkdown, messageToMarkdown }` that dispatches to each widget's optional `toMarkdown`. |
| `markdownTable(columns, rows)` | GitHub-flavored pipe-table helper for widget `toMarkdown` implementations. |
| `EXPORT_PDF_TOOL_NAME`, `RENDER_WIDGET_TOOL_NAME` | Re-exported from `agent-core` (single source of truth). |

## Minimal example

```tsx
"use client";
import { ChatShell } from "agent-react";
import { devopsWidgets } from "./widget-catalog";   // your Widget[] list

export function MyDashboard() {
  return (
    <ChatShell
      agentUrl="http://localhost:8020/devops"
      agentId="devops_dashboard"
      widgets={devopsWidgets}
      title="DevOps Dashboard"
      subtitle="Ask about deploys, PRs, incidents, services, CI runs."
      placeholderHints={[
        "What's our deploy frequency this month?",
        "List open incidents.",
      ]}
      storageKey="devops-dashboard.session.v1"
      pdfDefaultTitle="DevOps Dashboard"
      // pdfRoute defaults to "/api/export/pdf"; pass false to disable PDF entirely.
    />
  );
}
```

## `ChatShell` props

| Prop | Default | Notes |
|---|---|---|
| `agentUrl` | — | Full URL to the AG-UI server route, e.g. `http://localhost:8020/devops`. |
| `agentId` | — | Must match the server's `agentId`. |
| `widgets` | — | List of widgets from `defineWidget`. The Stack slot is added automatically. |
| `title` | `"Assistant"` | Header. |
| `subtitle` | — | One-liner under the title. |
| `placeholderHints` | — | Empty-state suggestions, shown until the user sends. |
| `storageKey` | `"agent-react.session.v1"` | localStorage key for thread persistence. |
| `pdfDefaultTitle` | `"Export"` | Title used for the manual Export-PDF button and as the agent's hint. |
| `pdfRoute` | `"/api/export/pdf"` | URL the PDF POST goes to. `false` disables PDF (drops the tool + rule + button). |
| `catalogRules` | `[]` | Extra rules appended to the per-turn catalog prompt block. |
| `maxIterations` | `5` | Cap on agent ↔ client roundtrips per user prompt. |

## Frontend tool feedback loop

The Claude Agent SDK halts after every frontend tool call and yields back to the client. `ChatShell` runs a small loop: after each `runAgent`, push a `ToolMessage` for every `render_widget` / `export_pdf` call that fired, then call `runAgent` again. The loop ends when a turn produces no frontend tool calls (or after `maxIterations`).

## Catalog handshake

`buildWebRegistry` returns a `catalogPromptBlock(extraRules?)` function. `ChatShell` calls it every turn and ships the result in `RunAgentInput.context`. The `@ag-ui/claude-agent-sdk` adapter on the server appends it to the system prompt. Net effect: the agent always knows which widget types it's allowed to emit, even though `agent-server` doesn't reference any specific catalog. Swap your widget list → the agent's per-turn prompt updates without touching agent code.

## Persistence

`ChatShell` writes `{ threadId, messages, agentMessages }` to `localStorage` under the configured `storageKey`. It only writes when idle — saves are suppressed while a turn is streaming, then flushed when `running` flips back to false. This avoids serializing the entire history on every token.

## Building widgets

See `agent-core`'s README for `defineWidget`. The widget's `render` runs in the client bundle (via `WidgetSurface` → json-render's `Renderer`); `renderPdf` runs server-side inside `createPdfRoute` from `agent-pdf`. `toMarkdown` runs in both contexts (Copy button + PDF route are both fine with it).

## Caveats

- `ChatShell` requires `"use client"` in the calling file when imported into a Next App Router project.
- The Tailwind classes in `<ChatShell>` and `<WidgetCard>` expect a `tailwindcss` config in the host app. Replace the components or override classes if you use a different style system.
- A failure inside an agent-driven `export_pdf` is reported in two places: the per-message `pdfStatus` badge and the global error pill. Both clear when you start a new conversation.
