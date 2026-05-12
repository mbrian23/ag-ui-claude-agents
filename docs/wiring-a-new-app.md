# Wiring a new app

End-to-end recipe for building a new domain agent + dashboard on these four packages. The DevOps demo under `examples/devops/` is a working reference — keep it open while you read this.

> Mental model: **server** owns data and prompts; **client** owns the catalog of UI widgets the agent is allowed to emit. The server is catalog-agnostic — the client ships its catalog description in `RunAgentInput.context` every turn. Swap the widgets, the agent's prompt updates without code changes on the server.

## 1. Workspace layout

The simplest setup adds one more `examples/<your-domain>/{agent,web}` pair to this repo. **Name the packages distinctly** — the DevOps demo uses bare `agent` and `web` only because it's the sole example. A second domain has to use `<domain>-agent` / `<domain>-web` (or similar) in `package.json` to avoid `pnpm --filter` collisions.

```
examples/
├── devops/
└── your-domain/
    ├── agent/                          # Node service
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── server.ts               # createAgentServer({skills: [...]})
    │       └── skills/
    │           └── yours/
    │               ├── index.ts        # defineSkill(...)
    │               ├── prompt.ts       # systemPromptFragment string
    │               └── tools/
    │                   └── *.ts        # tool(...) definitions
    └── web/                            # Next App Router
        ├── package.json
        ├── tsconfig.json
        ├── next.config.ts              # transpilePackages: [agent-core, ...]
        └── src/
            ├── app/
            │   ├── page.tsx            # <ChatShell ...>
            │   └── api/export/pdf/
            │       └── route.ts        # createPdfRoute({...})
            └── components/
                ├── chat-shell.tsx      # domain-specific <ChatShell> wrapper
                ├── widget-catalog.tsx  # the widget list ⭐
                └── widgets/
                    ├── my-widget.tsx
                    └── my-widget-web.tsx   # split for recharts/recharts-like libs
```

Add both paths to `pnpm-workspace.yaml` (already covered by `examples/*/*`). Both apps depend on the workspace packages via `"workspace:*"` ranges.

## 2. Define a widget (web + PDF in one shot)

A widget is one zod schema + one web renderer + one PDF renderer + an optional markdown serializer. Both renderers are **required** at compile time.

```tsx
// examples/your-domain/web/src/components/widgets/kpi.tsx
import { defineWidget } from "agent-core";
import { cardStyle } from "agent-pdf/primitives";
import { Text, View } from "@react-pdf/renderer";
import { z } from "zod";

export const KpiSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
});
export type KpiSpec = z.infer<typeof KpiSchema>;

export function KpiWeb({ spec }: { spec: KpiSpec }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium uppercase text-slate-500">{spec.label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">
        {spec.value} <span className="text-sm text-slate-500">{spec.unit}</span>
      </div>
    </div>
  );
}

export function KpiPdf({ spec }: { spec: KpiSpec }) {
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 9, color: "#64748b" }}>{spec.label}</Text>
      <Text style={{ fontSize: 22 }}>{String(spec.value)}</Text>
    </View>
  );
}

export const kpiWidget = defineWidget({
  name: "kpi",
  description: "Single big metric with an optional unit suffix.",
  schema: KpiSchema,
  render: (spec) => <KpiWeb spec={spec} />,
  renderPdf: (spec) => <KpiPdf spec={spec} />,
  toMarkdown: (spec) => `**${spec.label}**: ${spec.value}${spec.unit ? ` ${spec.unit}` : ""}`,
});
```

### Recharts / window-using libraries need a split

If your web component uses anything that reads `window`, `document`, or otherwise can't run server-side (recharts, chart.js, leaflet, etc.), it must live in a `"use client"` file. That file must be **separate** from the `defineWidget` call — see [widget file splitting](#why-the-split-for-recharts) below for the why. Pattern:

```
widgets/bar-chart.tsx        # no directive; schema, defineWidget, PDF renderer here
widgets/bar-chart-web.tsx    # "use client"; recharts component lives here
```

### Aggregate into a catalog

```ts
// examples/your-domain/web/src/components/widget-catalog.tsx
import { barChartWidget } from "./widgets/bar-chart";
import { kpiWidget } from "./widgets/kpi";

export const yourWidgets = [kpiWidget, barChartWidget /* , ... */] as const;
```

This list is the **single source of truth** for what the agent can emit. Both `<ChatShell>` and `createPdfRoute` read from it.

## 3. Define a skill (server side)

A skill bundles MCP tools, a system-prompt fragment, optional bash whitelist prefixes, and required/optional env vars.

```ts
// examples/your-domain/agent/src/skills/yours/tools/list-things.ts
import { tool } from "agent-server";
import { z } from "zod";

export const listThingsTool = tool(
  "list_things",
  "List things from the data source.",
  { limit: z.number().int().min(1).max(100).default(10) },
  async ({ limit }) => {
    const rows = await fetchYourData(limit);
    return { content: [{ type: "text" as const, text: JSON.stringify(rows) }] };
  }
);
```

```ts
// examples/your-domain/agent/src/skills/yours/prompt.ts
export const YOUR_PROMPT = `You are a helpful analyst.

# Data tools
- \`list_things({ limit })\` — list raw records.

# Workflow
1. Call \`list_things\` to fetch.
2. Render the result via the frontend \`render_widget\` tool — pick the smallest
   widget that answers the question (kpi / table / bar_chart / ...).

Refer to tools by their bare name (no \`mcp__\` prefix). The server adds the
namespace.`;
```

```ts
// examples/your-domain/agent/src/skills/yours/index.ts
import { defineSkill } from "agent-server";
import { listThingsTool } from "./tools/list-things.js";
import { YOUR_PROMPT } from "./prompt.js";

export const yourSkill = defineSkill({
  name: "yours",
  description: "Analyst over your data.",
  mcpTools: [listThingsTool],
  systemPromptFragment: YOUR_PROMPT,
  // Add only what your tools genuinely need:
  // allowedBashPrefixes: ["gh "],
  // requiredEnv: ["YOUR_API_TOKEN"],
});
```

### Skill prompt fragments: refer to tools by bare name

`agent-server` namespaces every tool to `mcp__<mcpName>__<tool>` where `mcpName` is configured on the host server (default `"tools"`). A skill that hardcodes `mcp__yours__list_things` breaks when reused in a server with a different `mcpName`. Always write `list_things` in the prompt — the model resolves the prefix from the tool list.

## 4. Agent entry

```ts
// examples/your-domain/agent/src/server.ts
import { createAgentServer } from "agent-server";
import { yourSkill } from "./skills/yours/index.js";

const BASE_PROMPT =
  "You are an analyst. Always answer with the `render_widget` frontend tool.";

function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN.");
    process.exit(1);
  }

  const { server, port, route } = createAgentServer({
    agentId: "your_agent",
    model: process.env.MODEL ?? "claude-sonnet-4-6",
    baseSystemPrompt: BASE_PROMPT,
    mcpName: "yours",
    skills: [yourSkill],
    route: "yours",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(","),
  });

  server.listen(port, () => {
    console.log(`agent listening at http://localhost:${port}/${route}`);
  });
}

main();
```

`package.json` script:

```json
"dev": "tsx --env-file-if-exists=../../../.env --watch src/server.ts"
```

Note the `../../../.env` — three levels up to the workspace root from `examples/<domain>/agent/`.

## 5. Web app

### Package deps

```jsonc
// examples/your-domain/web/package.json
{
  "name": "your-domain-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "agent-core": "workspace:*",
    "agent-react": "workspace:*",
    "agent-pdf": "workspace:*",
    "@react-pdf/renderer": "^4.5.1",
    "next": "^16",
    "react": "^19",
    "react-dom": "^19",
    "recharts": "^3",   // only if you build chart widgets
    "zod": "^4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

Agent app: `package.json` only needs `agent-server: workspace:*` plus `tsx`, `typescript`, `vitest`, `zod`, and `@anthropic-ai/claude-agent-sdk` (which `agent-server` re-exports `tool` from for convenience).

The web app's `<ChatShell>` ships Tailwind classes — `tailwindcss` must be configured in the host app, or override the components.

### Mount `<ChatShell>`

```tsx
// examples/your-domain/web/src/components/chat-shell.tsx
"use client";
import { ChatShell as GenericChatShell } from "agent-react";
import { yourWidgets } from "./widget-catalog";

export function ChatShell() {
  return (
    <GenericChatShell
      agentUrl={process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8020/yours"}
      agentId="your_agent"
      widgets={yourWidgets}
      title="Your Dashboard"
      subtitle="Ask anything about your data."
      storageKey="your-domain.session.v1"
      pdfDefaultTitle="Your Report"
    />
  );
}
```

```tsx
// examples/your-domain/web/src/app/page.tsx
import { ChatShell } from "@/components/chat-shell";

export default function Home() {
  return (
    <div className="flex h-screen w-screen">
      <ChatShell />
    </div>
  );
}
```

### PDF route

```ts
// examples/your-domain/web/src/app/api/export/pdf/route.ts
import { createPdfRoute } from "agent-pdf";
import { yourWidgets } from "@/components/widget-catalog";

export const runtime = "nodejs";

export const POST = createPdfRoute({
  widgets: yourWidgets,
  defaultTitle: "Your Report",
});
```

That's the entire PDF route. The body shape is `{ spec, text?, title? }`, returned as `application/pdf`.

### `next.config.ts` must transpile the workspace packages

```ts
// examples/your-domain/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["agent-core", "agent-react", "agent-pdf"],
};

export default nextConfig;
```

Without this, Next's Turbopack treats our packages as opaque ESM and fails on extensionless internal imports.

## 6. Env

```
# .env at workspace root
ANTHROPIC_AUTH_TOKEN=...
ANTHROPIC_BASE_URL=https://openrouter.ai/api    # if using OpenRouter; no trailing /v1
MODEL=anthropic/claude-haiku-4.5                 # optional
ALLOWED_ORIGINS=http://localhost:3000            # optional

# Skill-specific (declared in defineSkill({ requiredEnv: [...] })):
YOUR_API_TOKEN=...
```

## 7. Run it

```bash
pnpm install
# terminal A
pnpm --filter your-agent dev
# terminal B
pnpm --filter your-web dev
```

Open `http://localhost:3000` and try a prompt. The chat shell shows a "Building widget…" placeholder while the agent streams arg deltas, then mounts the widget when the tool call completes.

## 8. Verify the wiring

A few one-shot checks that catch the most common breakages:

- `pnpm -r typecheck` should be green. The `@ts-expect-error` in `packages/agent-core/src/__type_checks__/widget.check.ts` proves a widget missing `renderPdf` fails to compile.
- `curl http://localhost:8020/health` returns `{ "status": "healthy", "route": "yours" }`.
- `curl -X POST http://localhost:8020/yours -H "content-type: application/json" -d '{"runId":"r","threadId":"t","messages":[],"tools":[],"context":[],"forwardedProps":{},"state":{}}' --max-time 4 | grep -o "mcp__yours__[a-z_]*" | sort -u` lists your tool names. If it doesn't, your skill didn't register — check for tool-name collisions across skills.
- `curl -X POST http://localhost:3000/api/export/pdf -H "content-type: application/json" -d '{"title":"smoke","spec":{"root":"k","elements":{"k":{"type":"kpi","props":{"label":"x","value":1},"children":[]}}}}' -o /tmp/smoke.pdf && file /tmp/smoke.pdf` should report a valid PDF. If you see `"duplicate widget name ''"`, see [widget file splitting](#why-the-split-for-recharts) below.

## Why the split for recharts?

If a widget file is `"use client"`, **every export from that file** — including the plain JS widget object returned by `defineWidget` — becomes a "client reference" when imported by a server module. The widget object's `.name` field reads as the empty string server-side, so `buildPdfRegistry` sees six widgets all named `""` and throws `duplicate widget name ''`.

Fix: keep the `defineWidget(...)` call in a no-directive file. Put any recharts (or other window-using) component in a sibling `*-web.tsx` with `"use client"`. The no-directive file imports the web component as a typed reference; the server gets the real widget object with the literal name, and the client bundle still renders the recharts component because it traverses the `"use client"` boundary at the right place.

Pure-JSX widgets (KPI tiles, layout cards, tables, status grids) don't need the split — they have no client-only APIs and can live in one file with no directive.

## Adding a second skill

Drop another `defineSkill` into the `skills` array. Common patterns:

- **GitHub via `gh` CLI** — `requiredEnv: ["GITHUB_TOKEN"]`, MCP tool shells out via `execFile` from `node:child_process`. The CLI reads `GH_TOKEN`/`GITHUB_TOKEN` from `process.env` automatically. See `examples/devops/agent/src/skills/github/index.ts`.
- **Jira / HTTP API** — `requiredEnv: ["JIRA_HOST", "JIRA_TOKEN"]`, MCP tool calls `fetch` with the bearer header.
- **Bash whitelist (rare)** — only add `allowedBashPrefixes` if you genuinely want the model to script a shell utility ad-hoc. Most data-fetch skills are cleaner as one MCP tool per query shape.

Tool-name collisions across skills throw at startup. Either rename or split into separate servers with different `route`s.

## Caveats / gotchas

- **PDF parity is checked by TS** — `defineWidget` rejects a widget missing `renderPdf` at compile time. A widget with a broken-but-present `renderPdf` will fail at PDF-export time with the underlying react-pdf error.
- **The system prompt is composed once at boot** — skill `systemPromptFragment`s are joined into `baseSystemPrompt` when `createAgentServer` runs. The per-turn `RunAgentInput.context` (catalog prompt block from the client) is appended to the system prompt each turn by the adapter. Two complementary places to drop instructions.
- **Streaming PDFs are not implemented** — `createPdfRoute` buffers the whole document and returns it in one shot. Fine for hundreds of widgets; not for thousands.
- **No AG-UI endpoint auth** — only CORS allowlisting. If skills can read sensitive data, add bearer-token auth before non-localhost deploys.
- **localStorage persistence is per-browser** — `ChatShell` is single-tenant. Multi-user setups need a server-side thread store and `agent.threadId` plumbing changes.
