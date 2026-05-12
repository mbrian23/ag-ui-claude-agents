# agent-pdf

Generic PDF route + react-pdf primitives for an `agent-core` widget catalog. Mounts each Widget's `renderPdf` into a json-render PDF registry and exposes a Next-friendly POST handler factory.

## What's in here

| Export | Purpose |
|---|---|
| `createPdfRoute({ widgets, ... })` | Returns a `POST` handler for `app/api/<...>/route.ts`. Body shape: `{ spec, text?, title? }` → returns `application/pdf`. |
| `buildPdfRegistry(widgets)` | Builds the json-render PDF component registry from a list of `Widget`s. The built-in `stack` slot is added automatically. |
| `defaultPageWrapper(spec, opts)` | Wraps a user spec in `Document` → `Page` → `Heading` → (optional `Text`) → user spec. Override via the `pageWrapper` option on `createPdfRoute`. |
| `PageWrapperOptions`, `CreatePdfRouteOptions`, `RateLimitConfig` | Types. |
| `agent-pdf/primitives` | Chart authoring helpers (`PALETTE`, `STATUS_COLOR`, `cardStyle`, `ChartCard`, `AxisGrid`, `plotArea`, `DEFAULT_FRAME`) plus re-exports of `View`, `Text`, `G`, `Path`, `Svg` from `@react-pdf/renderer`. Use these inside your widget's `renderPdf`. |

## Minimal example — Next App Router route

```ts
// app/api/export/pdf/route.ts
import { createPdfRoute } from "agent-pdf";
import { devopsWidgets } from "@/components/widget-catalog";

export const runtime = "nodejs";

export const POST = createPdfRoute({
  widgets: devopsWidgets,
  defaultTitle: "DevOps Dashboard",
});
```

That's the whole route. The handler validates the body, calls `buildPdfRegistry(widgets)` once at startup, renders via `@json-render/react-pdf`'s `renderToBuffer`, and streams the result back with proper `Content-Type` / `Content-Disposition` headers.

## `createPdfRoute` options

| Option | Default | Notes |
|---|---|---|
| `widgets` | — | Required. The same `Widget[]` you pass to `<ChatShell widgets>`. |
| `defaultTitle` | `"Export"` | Used when the request body omits `title`. |
| `maxBodyBytes` | `262144` (256 KB) | Hard cap; oversized bodies return 413. |
| `rateLimit` | `{ windowMs: 60000, max: 10 }` | In-process per-IP limiter, default 10 req / 60s. Pass `false` to disable. Pass `{ keyFor }` to swap the key function (for proxies, multi-tenant, etc.). |
| `pageWrapper` | `defaultPageWrapper` | Returns the wrapped spec. Override to change margins, headers, footers, etc. |

## Authoring `renderPdf` with the primitives

```tsx
// inside a defineWidget({ renderPdf: ... }) for a kpi tile
import { cardStyle } from "agent-pdf/primitives";
import { Text, View } from "@react-pdf/renderer";

(spec) => (
  <View style={cardStyle}>
    <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
      {spec.label}
    </Text>
    <Text style={{ fontSize: 22, color: "#0f172a" }}>{String(spec.value)}</Text>
  </View>
);
```

For charts, see how the demo's `BarChartPdf` uses `plotArea` + `AxisGrid` + `Rect`/`Svg`/`G` from primitives. Hand-drawn, but dependency-free past `@react-pdf/renderer`.

## Rate limiter notes

The default limiter is in-process: it keys on `x-forwarded-for[0]` → `x-real-ip` → `"unknown"` and stores recent timestamps per key. Every 256 calls it sweeps expired keys so a long-lived server can't accumulate one Map entry per IP forever. For multi-instance deployments swap to Redis / Upstash via the `keyFor` + custom-counter approach (open an issue if you want a pluggable backend on this package).

## Caveats

- Imports `@json-render/react-pdf/render` (server-only sub-path) instead of the main entry, which calls `React.createContext` at module load and trips Next's RSC restrictions.
- `@react-pdf/renderer` is a `peerDependency`. The host app picks the version.
- A widget's `renderPdf` is invoked synchronously inside `renderToBuffer`. Don't do I/O in `renderPdf` — fetch your data in the MCP tool and pass it as spec props.
- The `Document` / `Page` / `Heading` / `Text` / `Spacer` element types used by `defaultPageWrapper` are provided by `@json-render/react-pdf`'s `standardComponents`. Don't try to register them yourself.
