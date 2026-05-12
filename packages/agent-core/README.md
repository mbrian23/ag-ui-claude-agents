# agent-core

Shared types and pure helpers used by `agent-server`, `agent-react`, and `agent-pdf`. Zero runtime dependency on React, Node, or the Claude Agent SDK.

## What's in here

| Export | Purpose |
|---|---|
| `defineWidget({...})` | Typed factory for a Widget. `render` (web) and `renderPdf` are **both required**; TypeScript rejects a widget missing either. `toMarkdown` is optional (used by the Copy button). |
| `Widget<TProps>` | Structural type for a registered widget. |
| `combineSpecs(specs[])` | Combine multiple json-render specs into one wrapped in a `stack`. Used by the chat shell's "Export PDF" / "Copy as markdown" paths when an assistant turn emits more than one widget. |
| `validateSpec`, `isNonEmptySpec`, `formatSpecIssues` | Re-exports from `@json-render/core`. |
| `slugify(string)` | Conservative `[^a-z0-9]+` → `-` slugger (falls back to `"export"`). Used for both PDF filenames and chat session ids. |
| `PALETTE`, `STATUS_COLOR` | Tailwind/recharts-friendly color tokens shared by web and PDF widgets. |
| `RENDER_WIDGET_TOOL_NAME`, `EXPORT_PDF_TOOL_NAME` | The two frontend tool name constants. Imported by `agent-server` (server-side allowlist) and `agent-react` (client-side AG-UI tool declarations). Don't hard-code these strings — drift between the two sides is a silent contract break. |

## Defining a widget

```tsx
import { defineWidget } from "agent-core";
import { markdownTable } from "agent-react";    // for the toMarkdown helper
import { View, Text } from "@react-pdf/renderer";
import { z } from "zod";
// Recharts and other browser-only libraries belong in a sibling
// "use client" file (see the widget-splitting note below).

const BarChartSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ key: z.string(), value: z.number() })),
});

export const barChartWidget = defineWidget({
  name: "bar_chart",
  description: "Vertical bars over a small categorical axis.",
  schema: BarChartSchema,
  render: (spec) => <BarChartWeb spec={spec} />,
  renderPdf: (spec) => (
    <View>
      <Text>{spec.title}</Text>
      {/* draw bars with @react-pdf/renderer SVG primitives */}
    </View>
  ),
  toMarkdown: (spec) => `**${spec.title}**\n\n${markdownTable(...)}`,
});
```

The factory's `render` and `renderPdf` params are inferred from the zod schema — no manual `as` casts in either function.

## Widget file splitting (Next.js gotcha)

Recharts (and most data-viz libs) need `"use client"`. If the file that calls `defineWidget` is itself `"use client"`, Next replaces every export — including the widget object — with a client reference when a server module imports it, and the widget object's `.name` reads as `""` on the server. The PDF route then chokes with `"agent-pdf: duplicate widget name ''"`.

Workaround used in the demo: split the recharts component into a sibling `*-web.tsx` (`"use client"`) and keep the `defineWidget` call in a no-directive file that imports it.

## Caveats

- `Widget.schema` is typed as plain `ZodType` (not `ZodType<TProps>`) because of variance issues with zod 4's generic constraints; `defineWidget` enforces the relationship between schema and renderer prop types at the factory call site.
- `combineSpecs` deep-renames every element id and rewrites every `children` array. Fine at PDF-export / markdown-copy time (cold path); not intended for hot rendering paths.
