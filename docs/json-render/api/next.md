<!-- source: https://json-render.dev/docs/api/next -->
# @json-render/next

Next.js renderer. JSON becomes full Next.js applications with routes, layouts, metadata, and SSR.

## Installation

```
npm install @json-render/core @json-render/react @json-render/next
```

## schema

The Next.js app schema for multi-page specs. Use with `defineCatalog` from core.

```javascript
import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/next/server';
import { z } from 'zod';

const catalog = defineCatalog(schema, {
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      description: 'Card container',
    },
    NavBar: {
      props: z.object({ links: z.array(z.object({ href: z.string(), label: z.string() })) }),
      description: 'Navigation bar',
    },
  },
  actions: {},
});
```

## createNextApp

Create all exports needed for a Next.js `[[...slug]]` catch-all route.

```javascript
import { createNextApp } from '@json-render/next/server';

const { Page, generateMetadata, generateStaticParams } = createNextApp({
  spec: myAppSpec,
  loaders: {
    loadPost: async ({ slug }) => {
      const post = await db.post.findUnique({ where: { slug } });
      return { post };
    },
  },
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `spec` | `NextAppSpec \| (() => NextAppSpec \| Promise<NextAppSpec>)` | The application spec (static or dynamic) |
| `loaders` | `Record<string, LoaderFn>` | Server-side data loaders keyed by name |

### Returns

| Export | Description |
|--------|-------------|
| `Page` | Async Server Component for `page.tsx` |
| `generateMetadata` | Metadata generator for Next.js SEO |
| `generateStaticParams` | Static params for pre-rendering at build time |

## NextAppSpec

The top-level spec defining an entire Next.js application.

```javascript
interface NextAppSpec {
  metadata?: NextMetadata;
  routes: Record<string, NextRouteSpec>;
  layouts?: Record<string, Spec>;
  state?: Record<string, unknown>;
}
```

### Route Patterns

Routes use Next.js URL conventions:

| Pattern | Example Match | Params |
|---------|---------------|--------|
| `/` | `/` | `{}` |
| `/about` | `/about` | `{}` |
| `/blog/[slug]` | `/blog/hello` | `{ slug: "hello" }` |
| `/docs/[...path]` | `/docs/a/b/c` | `{ path: ["a","b","c"] }` |
| `/app/[[...path]]` | `/app` or `/app/x/y` | `{ path: [] }` or `{ path: ["x","y"] }` |

## NextAppProvider

Client component that provides the component registry and action handlers to all pages.

```javascript
import { NextAppProvider } from '@json-render/next';

export default function Layout({ children }) {
  return (
    <NextAppProvider registry={registry} handlers={handlers}>
      {children}
    </NextAppProvider>
  );
}
```

## Built-in Components

### Slot

Placeholder in layouts where page content is rendered. Every layout MUST include a Slot.

```json
{ "type": "Slot", "props": {}, "children": [] }
```

### Link

Client-side navigation wrapping `next/link`.

```json
{ "type": "Link", "props": { "href": "/about" }, "children": ["link-text"] }
```

## Built-in Actions

| Action | Params | Description |
|--------|--------|-------------|
| `setState` | `{ statePath, value }` | Update a value in state |
| `pushState` | `{ statePath, value, clearStatePath? }` | Append to array in state |
| `removeState` | `{ statePath, index }` | Remove from array by index |
| `navigate` | `{ href }` | Client-side navigation |

## Server Utilities

### matchRoute

Match a pathname against a spec's routes.

```javascript
import { matchRoute } from '@json-render/next/server';

const matched = matchRoute(spec, '/blog/hello-world');
// { route: NextRouteSpec, pattern: '/blog/[slug]', params: { slug: 'hello-world' } }
```

### resolveMetadata

Resolve merged metadata for a route.

```javascript
import { resolveMetadata } from '@json-render/next/server';

const metadata = resolveMetadata(spec, matchedRoute?.route);
```

### slugToPath

Convert catch-all slug array to pathname.

```javascript
import { slugToPath } from '@json-render/next/server';

slugToPath(undefined);          // "/"
slugToPath(['blog', 'hello']);  // "/blog/hello"
```

## Entry Points

| Import | Contents |
|--------|----------|
| `@json-render/next` | Client components (NextAppProvider, PageRenderer, Link) |
| `@json-render/next/server` | Server utilities (createNextApp, matchRoute, schema) |
