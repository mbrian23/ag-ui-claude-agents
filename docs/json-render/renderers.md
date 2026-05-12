<!-- source: https://json-render.dev/docs/renderers -->
# Renderers

json-render supports multiple output targets. Each renderer takes the same core concept — a JSON spec constrained to a catalog — and renders it natively on a different platform or into a different format.

All renderers share the same workflow:

1. Define a catalog with `defineCatalog`
2. AI generates a JSON spec
3. The renderer turns the spec into platform-native output

| Renderer | Package | Output |
|----------|---------|--------|
| React | `@json-render/react` | React component tree |
| Vue | `@json-render/vue` | Vue 3 component tree |
| Svelte | `@json-render/svelte` | Svelte 5 component tree |
| Solid | `@json-render/solid` | SolidJS component tree |
| shadcn/ui | `@json-render/shadcn` | Pre-built Radix UI + Tailwind components (uses React renderer) |
| React Native | `@json-render/react-native` | Native mobile views |
| Image | `@json-render/image` | SVG / PNG (via Satori) |
| React PDF | `@json-render/react-pdf` | PDF documents |
| Remotion | `@json-render/remotion` | Video compositions |
| Ink | `@json-render/ink` | Terminal UI (via Ink) |

## React

Render specs as React component trees in the browser. Supports data binding, streaming, actions, validation, visibility, and computed values.

```javascript
import { defineRegistry, Renderer } from "@json-render/react";
import { schema } from "@json-render/react/schema";

const { registry } = defineRegistry(catalog, { components });
<Renderer spec={spec} registry={registry} />;
```

Use `StateProvider`, `VisibilityProvider`, and `ActionProvider` for full interactivity.

## Vue

Vue 3 renderer with full feature parity with React: data binding, visibility, actions, validation, repeat scopes, and streaming.

```javascript
import { defineRegistry, Renderer } from "@json-render/vue";
import { schema } from "@json-render/vue/schema";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) =>
      h("div", { class: "card" }, [h("h3", null, props.title), children]),
  },
});
```

Uses composables instead of React hooks.

## Svelte

Svelte 5 renderer with runes-compatible context helpers, visibility conditions, actions, and streaming support.

```javascript
import { defineRegistry, Renderer } from "@json-render/svelte";
import { schema } from "@json-render/svelte/schema";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => /* Svelte snippet */,
  },
});
```

## Solid

SolidJS renderer with fine-grained reactivity, state bindings, validation, visibility, and event-driven actions.

```javascript
import { defineRegistry, Renderer } from "@json-render/solid";
import { schema } from "@json-render/solid/schema";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: (renderProps) => <div>{renderProps.children}</div>,
  },
});

<Renderer spec={spec} registry={registry} />;
```

## shadcn/ui

36 pre-built components using Radix UI and Tailwind CSS. Built on top of `@json-render/react` — no custom renderer needed.

```javascript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { defineRegistry, Renderer } from "@json-render/react";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { shadcnComponents } from "@json-render/shadcn";

const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Button: shadcnComponentDefinitions.Button,
  },
});

const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Button: shadcnComponents.Button,
  },
});
```

## React Native

Render specs as native mobile views. Includes 25+ standard components and standard action definitions.

```javascript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react-native/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/react-native/catalog";
import { defineRegistry, Renderer } from "@json-render/react-native";

const catalog = defineCatalog(schema, {
  components: { ...standardComponentDefinitions },
  actions: standardActionDefinitions,
});

const { registry } = defineRegistry(catalog, { components: {} });
<Renderer spec={spec} registry={registry} />;
```

## Image

Generate SVG and PNG images from JSON specs using Satori. Ideal for OG images, social cards, and banners.

```javascript
import { renderToSvg, renderToPng } from "@json-render/image/render";

const svg = await renderToSvg(spec, { fonts });
const png = await renderToPng(spec, { fonts });
```

Nine standard components: Frame, Box, Row, Column, Heading, Text, Image, Divider, Spacer. PNG output requires `@resvg/resvg-js` as an optional peer dependency.

## React PDF

Generate PDF documents from JSON specs using `@react-pdf/renderer`. Render to buffer, stream, or file.

```javascript
import {
  renderToBuffer,
  renderToStream,
  renderToFile,
} from "@json-render/react-pdf";

const buffer = await renderToBuffer(spec);
const stream = await renderToStream(spec);
await renderToFile(spec, "./output.pdf");
```

Standard components include Document, Page, View, Row, Column, Heading, Text, Image, Table, List, Divider, Spacer, Link, and PageNumber.

## Remotion

Turn JSON timeline specs into video compositions with Remotion.

```javascript
import { Player } from "@remotion/player";
import { Renderer } from "@json-render/remotion";

<Player
  component={Renderer}
  inputProps={{ spec }}
  durationInFrames={spec.composition.durationInFrames}
  fps={spec.composition.fps}
  compositionWidth={spec.composition.width}
  compositionHeight={spec.composition.height}
/>;
```

Uses a timeline spec format with compositions, tracks, and clips. Includes standard components (TitleCard, TypingText, ImageSlide, etc.), transitions (fade, slide, zoom, wipe), and effects.

## Ink (Terminal)

Render specs as terminal UIs using Ink. Multiple standard components including tables, progress bars, spinners, tabs, multi-select, and interactive inputs with Tab-cycling focus.

```javascript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/ink/schema";
import {
  standardComponentDefinitions,
  standardActionDefinitions,
} from "@json-render/ink/catalog";
import { defineRegistry, Renderer } from "@json-render/ink";

const catalog = defineCatalog(schema, {
  components: { ...standardComponentDefinitions },
  actions: standardActionDefinitions,
});

const { registry } = defineRegistry(catalog, { components: {} });
<Renderer spec={spec} registry={registry} />;
```

## Custom Renderers

You can build your own renderer for any output target. See the Custom Schema & Renderer guide for how to define a custom schema and wire it to your own rendering logic.
