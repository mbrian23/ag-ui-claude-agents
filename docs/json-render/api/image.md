<!-- source: https://json-render.dev/docs/api/image -->
# @json-render/image

Image renderer that transforms JSON specifications into SVG and PNG images using Satori.

## Installation

```
npm install @json-render/core @json-render/image
```

For PNG output, add the optional peer dependency:

```
npm install @resvg/resvg-js
```

## Schema

Define your image catalog using the schema and standard components:

```javascript
import { defineCatalog } from '@json-render/core';
import { schema, standardComponentDefinitions } from '@json-render/image';

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});
```

## Render Functions

Server-side functions for generating output:

```javascript
import { renderToSvg, renderToPng } from '@json-render/image/render';

const svg = await renderToSvg(spec, { fonts });
const png = await renderToPng(spec, { fonts });
await writeFile('output.png', png);
```

### RenderOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts` | `SatoriOptions['fonts']` | `[]` | Font data for text rendering |
| `width` | `number` | Frame prop | Override output width |
| `height` | `number` | Frame prop | Override output height |
| `registry` | `Record<string, ComponentRenderer>` | `{}` | Custom components |
| `includeStandard` | `boolean` | `true` | Include built-in components |
| `state` | `Record<string, unknown>` | `{}` | Initial state |

## Standard Components

**Frame** - Root container defining image dimensions and background

**Box** - Generic container with padding, margin, borders, and flex alignment

**Row** - Horizontal flex layout with optional wrapping

**Column** - Vertical flex layout

**Heading** - Multi-level heading text (h1-h4)

**Text** - Body text with size, color, weight, and alignment options

**Image** - URL-based images with dimensions and fit modes

**Divider** - Horizontal line separator

**Spacer** - Vertical spacing element

## Imports

**Server-safe import** (without React/Satori):
```javascript
import { schema, standardComponentDefinitions } from '@json-render/image/server';
```
