<!-- source: https://json-render.dev/docs/api/react-email -->
# @json-render/react-email

React Email renderer. Turn JSON specs into HTML or plain-text emails using `@react-email/components` and `@react-email/render`.

## Install

```
npm install @json-render/core @json-render/react-email @react-email/components @react-email/render
```

See the [React Email example](https://github.com/vercel-labs/json-render/tree/main/examples/react-email) for a full working example.

## schema

The email element schema for specs. Use with `defineCatalog` from core.

```javascript
import { defineCatalog } from '@json-render/core';
import { schema, standardComponentDefinitions } from '@json-render/react-email';

const catalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
});
```

## Render Functions

Server-side functions for producing email output. All accept a spec and optional `RenderOptions`.

```javascript
import { renderToHtml, renderToPlainText } from '@json-render/react-email';

const html = await renderToHtml(spec);

const plainText = await renderToPlainText(spec);
```

### RenderOptions

```
interface RenderOptions {
  registry?: ComponentRegistry;
  includeStandard?: boolean;  // default: true
  state?: Record<string, unknown>;
}
```

| Option | Description |
|--------|-------------|
| `registry` | Custom component map (merged with standard components) |
| `includeStandard` | Include built-in standard components (default: `true`) |
| `state` | Initial state for `$state` / `$cond` dynamic prop resolution |

## defineRegistry

Create a type-safe component registry from a catalog. Components receive `{ props, children, emit, bindings, loading }`.

```javascript
import { defineRegistry } from '@json-render/react-email';
import { Container, Heading, Text } from '@react-email/components';

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => (
      <Container style={{ padding: 16, backgroundColor: '#fff' }}>
        <Heading>{props.title}</Heading>
        {children}
      </Container>
    ),
  },
});

const html = await renderToHtml(spec, { registry });
```

## createRenderer

Create a standalone renderer component wired to state, actions, and validation (for interactive previews in the browser).

```javascript
import { createRenderer } from '@json-render/react-email';

const EmailRenderer = createRenderer(catalog, components);
```

## Renderer

The main component that renders a spec to React Email elements. Use inside `JSONUIProvider` when you need state, actions, or visibility.

```
interface RendererProps {
  spec: Spec | null;
  registry?: ComponentRegistry;
  includeStandard?: boolean;  // default: true
  loading?: boolean;
  fallback?: ComponentRenderer;
}
```

## Standard Components

### Document structure

| Component | Description |
|-----------|-------------|
| `Html` | Top-level email wrapper. Must be the root element. |
| `Head` | Email head section. Place inside Html. |
| `Body` | Email body wrapper. Place inside Html. |

### Layout

| Component | Description |
|-----------|-------------|
| `Container` | Constrains content width (e.g. max-width 600px). |
| `Section` | Groups related content. |
| `Row` | Horizontal layout row. |
| `Column` | Column within a Row. |

### Content

| Component | Description |
|-----------|-------------|
| `Heading` | Heading text (h1-h6). |
| `Text` | Body text paragraph. |
| `Link` | Hyperlink with text and href. |
| `Button` | Call-to-action button (link styled as button). |
| `Image` | Image from URL. |
| `Hr` | Horizontal rule separator. |

### Utility

| Component | Description |
|-----------|-------------|
| `Preview` | Preview text for inbox (inside Html). |
| `Markdown` | Renders markdown content as email-safe HTML. |

## Server-Safe Import

Import schema and catalog definitions without pulling in React or `@react-email/components`:

```javascript
import { schema, standardComponentDefinitions } from '@json-render/react-email/server';
```

## Sub-path Exports

| Export | Description |
|--------|-------------|
| `@json-render/react-email` | Full package: schema, renderer, components, render functions |
| `@json-render/react-email/server` | Schema and catalog definitions only (no React) |
| `@json-render/react-email/catalog` | Standard component definitions and types |
| `@json-render/react-email/render` | Server-side render functions only |

## Types

| Export | Description |
|--------|-------------|
| `ReactEmailSchema` | Schema type for email specs |
| `ReactEmailSpec` | Spec type for email documents |
| `RenderOptions` | Options for render functions |
| `ComponentContext` | Typed component render function context |
| `ComponentFn` | Component render function type |
| `StandardComponentDefinitions` | Type of the standard component definitions object |
| `StandardComponentProps<K>` | Inferred props type for a standard component by name |
