<!-- source: https://json-render.dev/docs/directives -->
# Directives

## Overview

A directive is a user-defined dynamic value expression with a `$`-prefixed name, Zod schema for validation, and a resolver function. They enable custom transformations like formatting, math operations, and string manipulation without modifying core functionality.

Example usage:
```json
{
  "type": "Text",
  "props": {
    "text": {
      "$format": "currency",
      "value": { "$state": "/cart/total" },
      "currency": "USD"
    }
  },
  "children": []
}
```

## Defining a Directive

Use `defineDirective` from `@json-render/core`:

```javascript
import { defineDirective, resolvePropValue } from '@json-render/core';
import { z } from 'zod';

const doubleDirective = defineDirective({
  name: '$double',
  description: 'Double a numeric value.',
  schema: z.object({
    $double: z.unknown(),
  }),
  resolve(value, ctx) {
    const resolved = resolvePropValue(value.$double, ctx);
    return (resolved as number) * 2;
  },
});
```

The `description` field is optional and provides behavioral context beyond what the Zod schema expresses.

## Wiring Directives

### Runtime

```javascript
import { JSONUIProvider, Renderer } from '@json-render/react';
import { standardDirectives } from '@json-render/directives';

<JSONUIProvider registry={registry} directives={standardDirectives}>
  <Renderer spec={spec} registry={registry} />
</JSONUIProvider>
```

Or with `createRenderer`:

```javascript
const MyRenderer = createRenderer(catalog, components);

<MyRenderer spec={spec} directives={directives} />
```

All four renderers (React, Vue, Svelte, Solid) accept the `directives` prop on their provider and `createRenderer` output.

### Prompt Generation

```javascript
const prompt = catalog.prompt({ directives });
```

Each directive's schema appears in the "CUSTOM DYNAMIC VALUES" section of the system prompt, with the optional `description` providing inline behavioral context.

## Pre-built Directives

The `@json-render/directives` package provides ready-to-use directives:

```javascript
import { standardDirectives, createI18nDirective } from '@json-render/directives';
```

`standardDirectives` includes `$format`, `$math`, `$concat`, `$count`, `$truncate`, `$pluralize`, and `$join`. Add factory directives by spreading:

```javascript
const directives = [...standardDirectives, createI18nDirective(config)];
```

## Composition

Directives compose naturally. Each resolver calls `resolvePropValue` on its inputs, enabling directives to wrap other directives or built-in expressions:

```json
{
  "$format": "currency",
  "value": {
    "$math": "multiply",
    "a": { "$state": "/price" },
    "b": { "$state": "/qty" }
  },
  "currency": "USD"
}
```

This resolves inside-out: `$state` reads from state, `$math` multiplies the values, and `$format` formats the result as currency.

## Built-in Precedence

Built-in expressions (`$state`, `$computed`, `$cond`, `$template`, etc.) always take precedence over custom directives. `defineDirective` throws if you attempt to register a conflicting name.
