<!-- source: https://json-render.dev/docs/devtools -->
# Devtools

A drop-in inspector panel for any json-render app. See the spec tree, edit state inline, watch dispatched actions, follow stream patches live, browse your catalog, and pick DOM elements to map them back to spec keys.

Production-safe: the component tree-shakes to a null render when `NODE_ENV === "production"`.

## Install

Pick the adapter that matches your renderer.

### React

```bash
npm install @json-render/devtools @json-render/devtools-react
```

### Vue

```bash
npm install @json-render/devtools @json-render/devtools-vue
```

### Svelte

```bash
npm install @json-render/devtools @json-render/devtools-svelte
```

### Solid

```bash
npm install @json-render/devtools @json-render/devtools-solid
```

## Quick Start

Drop `<JsonRenderDevtools />` anywhere inside your existing `<JSONUIProvider>` (or the equivalent provider tree).

```javascript
// React
import { JsonRenderDevtools } from "@json-render/devtools-react";

<JSONUIProvider registry={registry} handlers={handlers}>
  <Renderer spec={spec} registry={registry} />
  <JsonRenderDevtools spec={spec} catalog={catalog} />
</JSONUIProvider>
```

That's it. A floating toggle appears in the bottom-right corner. Click it, or press Ctrl/Cmd + Shift + J, to open the drawer.

### Chat apps (AI SDK)

When you're using `@ai-sdk/react`'s `useChat`, pass the `messages` prop so the Stream tab captures spec patches as they arrive:

```javascript
<JsonRenderDevtools
  spec={spec}
  catalog={catalog}
  messages={messages}
/>
```

## Panels

| Tab | What it shows |
|-----|---------------|
| **Spec** | Element tree rooted at `spec.root`. Expand to walk children. Selecting an element fills a detail pane with its full props, visibility condition, event bindings, watchers, and any issues reported by `validateSpec`. |
| **State** | Every leaf path in the state model listed via `flattenToPointers`. Click a value to edit inline — writes go through `store.set`, so conditional elements and computed props re-evaluate immediately. |
| **Actions** | Timeline of dispatched actions: name, params, result or error, duration. Newest first. Expand a row for the full JSON payload. |
| **Stream** | Patches, text chunks, token usage, and lifecycle markers from the AI generation stream. Grouped by generation. |
| **Catalog** | Components and actions declared in your catalog with prop chips and type hints. |
| **Pick** | Click any element in the page to surface its entry in the Spec tab. Works because the renderer transparently tags each element with `data-jr-key` while devtools is mounted. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spec` | `Spec \| null` | `null` | The spec currently being rendered. |
| `catalog` | `Catalog \| null` | `null` | Catalog definition — required for the Catalog panel. |
| `messages` | `UIMessage[]` | `undefined` | AI SDK `useChat` messages. Scanned for spec data parts and streamed into the Stream panel. |
| `initialOpen` | `boolean` | `false` | Start the drawer open. |
| `position` | `"bottom-right" \| "bottom-left" \| "right"` | `"bottom-right"` | Floating toggle button position. |
| `hotkey` | `string \| false` | `"mod+shift+j"` | Keyboard shortcut. Use `mod` for Cmd on macOS / Ctrl elsewhere. Pass `false` to disable. |
| `bufferSize` | `number` | `500` | Max events retained in the ring buffer. |
| `onEvent` | `(evt: DevtoolsEvent) => void` | `undefined` | Optional tap — fires for every event as it is recorded. Useful for forwarding to analytics. |

## Production Safety

The component renders `null` when `process.env.NODE_ENV === "production"`. Bundlers fold the constant check so the panel's code tree-shakes out of production builds.

If you want extra certainty, gate the import behind an env check:

```javascript
import dynamic from "next/dynamic";

const JsonRenderDevtools = dynamic(
  () =>
    import("@json-render/devtools-react").then((m) => ({
      default: m.JsonRenderDevtools,
    })),
  { ssr: false, loading: () => null },
);
```

## Advanced

### Imperative controls

Use `useJsonRenderDevtools()` (React adapter only) to open / close the panel or record custom events from anywhere in the app:

```javascript
import { useJsonRenderDevtools } from "@json-render/devtools-react";

function DebugButton() {
  const devtools = useJsonRenderDevtools();
  return (
    <button onClick={() => devtools?.toggle()}>Toggle devtools</button>
  );
}
```

### Server-side stream tap

Capture stream events before they reach the client. Useful for server logs:

```javascript
import { tapJsonRenderStream } from "@json-render/devtools";

const tapped = tapJsonRenderStream(
  result.toUIMessageStream(),
  serverEventStore,
);
writer.merge(pipeJsonRender(tapped));
```

The `@json-render/devtools` core package exports `tapJsonRenderStream` and `tapYamlStream` for this pattern.
