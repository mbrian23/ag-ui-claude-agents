<!-- source: https://json-render.dev/docs/api/directives -->
# @json-render/directives

Pre-built custom directives for `@json-render/core`. Drop them into your catalog and renderer to add formatting, math, string manipulation, and i18n.

## Install

```bash
npm install @json-render/directives
```

## Quick Start

```javascript
import { standardDirectives } from '@json-render/directives';

// Wire into prompt generation
const prompt = catalog.prompt({ directives: standardDirectives });

// Wire into the renderer
<JSONUIProvider spec={spec} directives={standardDirectives}>
  ...
</JSONUIProvider>
```

To add factory directives like `createI18nDirective`, spread the array:

```javascript
import { standardDirectives, createI18nDirective } from '@json-render/directives';

const directives = [...standardDirectives, createI18nDirective(config)];
```

## Directives

### `$format` — Locale-aware value formatting

Formats values using `Intl` formatters. Supports `date`, `currency`, `number`, and `percent`.

```json
{ "$format": "currency", "value": { "$state": "/cart/total" }, "currency": "USD" }
{ "$format": "date", "value": { "$state": "/user/createdAt" } }
{ "$format": "number", "value": 1234567, "notation": "compact" }
{ "$format": "percent", "value": 0.75 }
```

Relative dates are also supported:

```json
{ "$format": "date", "value": { "$state": "/post/createdAt" }, "style": "relative" }
```

This returns strings like `"3h ago"`, `"2d from now"`, or `"just now"`.

| Field | Type | Description |
|-------|------|-------------|
| `$format` | `"date" \| "currency" \| "number" \| "percent"` | Format type. |
| `value` | `unknown` | Value to format. Accepts any dynamic expression. |
| `locale` | `string` | Optional. Locale for formatting (e.g. `"en-US"`). |
| `currency` | `string` | Optional. Currency code for `"currency"` format. Default: `"USD"`. |
| `notation` | `string` | Optional. Notation for `"number"` format (e.g. `"compact"`). |
| `style` | `string` | Optional. Set to `"relative"` for relative date formatting. |
| `options` | `Record<string, unknown>` | Optional. Extra `Intl` formatter options. |

### `$math` — Arithmetic operations

Performs arithmetic on one or two operands. Operands accept any dynamic expression.

```json
{ "$math": "add", "a": { "$state": "/subtotal" }, "b": { "$state": "/tax" } }
{ "$math": "round", "a": 3.7 }
```

| Field | Type | Description |
|-------|------|-------------|
| `$math` | `"add" \| "subtract" \| "multiply" \| "divide" \| "mod" \| "min" \| "max" \| "round" \| "floor" \| "ceil" \| "abs"` | Operation to perform. |
| `a` | `unknown` | First operand. Defaults to `0` if missing. |
| `b` | `unknown` | Second operand (binary ops only). Defaults to `0` if missing. |

Unary operations (`round`, `floor`, `ceil`, `abs`) only use `a`. Division by zero returns `0`.

### `$concat` — String concatenation

Concatenates multiple values into a single string. Each element is resolved then joined.

```json
{ "$concat": [{ "$state": "/user/firstName" }, " ", { "$state": "/user/lastName" }] }
```

| Field | Type | Description |
|-------|------|-------------|
| `$concat` | `unknown[]` | Array of values to concatenate. Each is resolved, converted to string, and joined. |

### `$count` — Array/string length

Returns the length of an array or string. Returns `0` for other types.

```json
{ "$count": { "$state": "/cart/items" } }
```

| Field | Type | Description |
|-------|------|-------------|
| `$count` | `unknown` | Value to count. Accepts arrays and strings. |

### `$truncate` — Text truncation

Truncates text to a maximum length with a configurable suffix.

```json
{ "$truncate": { "$state": "/post/body" }, "length": 140, "suffix": "..." }
```

| Field | Type | Description |
|-------|------|-------------|
| `$truncate` | `unknown` | Value to truncate. |
| `length` | `number` | Optional. Max character length. Default: `100`. |
| `suffix` | `string` | Optional. Suffix to append when truncated. Default: `"..."`. |

### `$pluralize` — Singular/plural forms

Selects a singular, plural, or zero form based on a count.

```json
{ "$pluralize": { "$state": "/cart/itemCount" }, "one": "item", "other": "items", "zero": "no items" }
```

Output: `"3 items"`, `"1 item"`, or `"no items"`.

| Field | Type | Description |
|-------|------|-------------|
| `$pluralize` | `unknown` | Count value. Accepts dynamic expressions. |
| `one` | `string` | Singular form label. |
| `other` | `string` | Plural form label. |
| `zero` | `string` | Optional. Label for count of zero. If omitted, uses `"0 <other>"`. |

### `$join` — Join array elements

Joins array elements with a separator string.

```json
{ "$join": { "$state": "/tags" }, "separator": ", " }
```

| Field | Type | Description |
|-------|------|-------------|
| `$join` | `unknown` | Array to join. Non-array values are converted to string. |
| `separator` | `string` | Optional. Separator between elements. Default: `", "`. |

### `createI18nDirective` — Internationalization

Factory function that creates a `$t` directive for translations with `{{param}}` interpolation.

```javascript
import { createI18nDirective } from '@json-render/directives';

const tDirective = createI18nDirective({
  locale: 'en',
  messages: {
    en: { "greeting": "Hello, {{name}}!", "checkout.submit": "Place Order" },
    es: { "greeting": "Hola, {{name}}!", "checkout.submit": "Realizar Pedido" },
  },
  fallbackLocale: 'en',
});
```

Usage in specs:

```json
{ "$t": "checkout.submit" }
{ "$t": "greeting", "params": { "name": { "$state": "/user/name" } } }
```

#### `I18nConfig`

| Field | Type | Description |
|-------|------|-------------|
| `$t` | `string` | Translation key. |
| `params` | `Record<string, unknown>` | Optional. Interpolation parameters. Values accept dynamic expressions. |
| `locale` | `string` | Current locale (e.g. `"en"`). |
| `messages` | `Record<string, Record<string, string>>` | Map of locale to key-value translation pairs. |
| `fallbackLocale` | `string` | Optional. Fallback locale when a key is missing in the current locale. |

## Composition

Directives compose naturally. Each resolver calls `resolvePropValue` on its inputs, so you can nest directives:

```json
{
  "$format": "currency",
  "value": { "$math": "multiply", "a": { "$state": "/price" }, "b": { "$state": "/qty" } },
  "currency": "USD"
}

{
  "$pluralize": { "$count": { "$state": "/items" } },
  "one": "item",
  "other": "items"
}
```
