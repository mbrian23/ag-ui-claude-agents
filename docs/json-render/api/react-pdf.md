<!-- source: https://json-render.dev/docs/api/react-pdf -->
# @json-render/react-pdf

PDF document renderer that transforms JSON specifications into PDFs using `@react-pdf/renderer`.

## Install

```
npm install @json-render/core @json-render/react-pdf
```

## Schema

Define a type-safe catalog with the PDF element schema:

```javascript
import { defineCatalog } from '@json-render/core';
import { schema, standardComponentDefinitions } from '@json-render/react-pdf';

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});
```

## Render Functions

Server-side functions for PDF generation:

```javascript
import { renderToBuffer, renderToStream, renderToFile } from '@json-render/react-pdf';

const buffer = await renderToBuffer(spec);
const stream = await renderToStream(spec);
await renderToFile(spec, './output.pdf');
```

### RenderOptions

| Option | Description |
|--------|-------------|
| `registry` | Custom component map (merged with standard components) |
| `includeStandard` | Include built-in standard components (default: `true`) |
| `state` | Initial state for dynamic prop resolution |

## defineRegistry

Create a type-safe component registry:

```javascript
import { defineRegistry } from '@json-render/react-pdf';
import { View, Text } from '@react-pdf/renderer';

const { registry } = defineRegistry(catalog, {
  components: {
    Badge: ({ props }) => (
      <View style={{ backgroundColor: props.color ?? '#e5e7eb', padding: 4 }}>
        <Text style={{ fontSize: 10 }}>{props.label}</Text>
      </View>
    ),
  },
});
```

## createRenderer

Standalone renderer component with state and action binding:

```javascript
import { createRenderer } from '@json-render/react-pdf';

const PDFRenderer = createRenderer(catalog, components);
```

## Renderer

Main component for rendering specs:

```javascript
interface RendererProps {
  spec: Spec | null;
  registry?: ComponentRegistry;
  includeStandard?: boolean;
  loading?: boolean;
  fallback?: ComponentRenderer;
}
```

## Standard Components

### Document Structure

**Document**: Top-level PDF wrapper with metadata (title, author, subject)

**Page**: Individual page with configurable size, orientation, and margins

### Layout

- **View**: Generic container with padding, margin, background, border, and flex alignment
- **Row**: Horizontal flex layout with optional wrapping
- **Column**: Vertical flex layout

### Content

- **Heading**: h1-h4 text with color and alignment
- **Text**: Body text with full styling control
- **Image**: URL-based images with dimensions and fit options
- **Link**: Hyperlinks with visible text

### Data

- **Table**: Typed columns with header styling and striped rows
- **List**: Ordered or unordered lists

### Decorative

- **Divider**: Horizontal line separator
- **Spacer**: Vertical empty space
- **PageNumber**: Current page with "{pageNumber}" and "{totalPages}" placeholders

## External Store (Controlled Mode)

Use `StateStore` for full state control:

```javascript
import { createStateStore } from "@json-render/react-pdf";

const store = createStateStore({ invoice: { total: 100 } });
store.set("/invoice/total", 200);
```

When a store is provided, inline state parameters are ignored.

## Server-Safe Import

Import schema without React dependencies:

```javascript
import { schema, standardComponentDefinitions } from '@json-render/react-pdf/server';
```

## Sub-path Exports

- `@json-render/react-pdf`: Full package
- `@json-render/react-pdf/server`: Schema and definitions only
- `@json-render/react-pdf/catalog`: Component definitions
- `@json-render/react-pdf/render`: Server-side functions only
