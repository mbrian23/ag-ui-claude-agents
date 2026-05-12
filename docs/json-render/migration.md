<!-- source: https://json-render.dev/docs/migration -->
# Migration Guide

This documentation covers breaking changes in v0.6.0 and how to update your code.

## State Provider

`DataProvider` has been renamed to `StateProvider` with changed props.

**Before:**
```javascript
import { DataProvider } from "@json-render/react";

<DataProvider data={myData} getValue={getter} setValue={setter}>
  {children}
</DataProvider>
```

**After:**
```javascript
import { StateProvider } from "@json-render/react";

<StateProvider initialState={myData} onStateChange={(path, value) => console.log(path, value)}>
  {children}
</StateProvider>
```

Key changes:
- `DataProvider` → `StateProvider`
- `data` prop → `initialState` prop
- `getValue` / `setValue` props removed (use `useStateStore()` hook)
- `useData` → `useStateStore`
- `useDataValue` → `useStateValue`
- `useDataBinding` → `useStateBinding` (deprecated; use `useBoundProp` instead)

## Dynamic Expressions

All dynamic value expressions now use `$state`, `$item`, and `$index`.

**Before:**
```json
{
  "type": "Text",
  "props": {
    "label": { "$path": "/user/name" },
    "count": { "$data": "/items/length" }
  }
}
```

**After:**
```json
{
  "type": "Text",
  "props": {
    "label": { "$state": "/user/name" },
    "count": { "$state": "/items/length" }
  }
}
```

Inside repeat scopes, use `$item` and `$index`:

```json
{
  "type": "Card",
  "props": {
    "title": { "$item": "name" },
    "subtitle": { "$index": true }
  }
}
```

## Two-Way Binding

Form components no longer use `valuePath` / `statePath` props. Instead, use `$bindState` expressions on the value prop and `useBoundProp` in your registry.

**Before (catalog):**
```javascript
Input: {
  props: z.object({
    label: z.string(),
    valuePath: z.string(),
    placeholder: z.string().optional(),
  }),
}
```

**Before (spec):**
```json
{
  "type": "Input",
  "props": { "label": "Email", "valuePath": "/form/email" }
}
```

**Before (registry):**
```javascript
Input: ({ props }) => {
  const [value, setValue] = useStateBinding(props.valuePath);
  return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
}
```

**After (catalog):**
```javascript
Input: {
  props: z.object({
    label: z.string(),
    value: z.string().optional(),
    placeholder: z.string().optional(),
  }),
}
```

**After (spec):**
```json
{
  "type": "Input",
  "props": { "label": "Email", "value": { "$bindState": "/form/email" } }
}
```

**After (registry):**
```javascript
Input: ({ props, bindings }) => {
  const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
  return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
}
```

Use `$bindItem` inside repeat scopes to bind to a field on the current item:

```json
{
  "type": "Checkbox",
  "props": { "checked": { "$bindItem": "completed" } }
}
```

## Visibility Conditions

Visibility conditions now use `$state`, `$and`, and `$or`.

**Before:**
```json
{ "path": "/isAdmin" }
{ "eq": [{ "path": "/role" }, "admin"] }
{ "and": [{ "path": "/isAdmin" }, { "path": "/feature" }] }
{ "or": [{ "path": "/roleA" }, { "path": "/roleB" }] }
```

**After:**
```json
{ "$state": "/isAdmin" }
{ "$state": "/role", "eq": "admin" }
{ "$and": [{ "$state": "/isAdmin" }, { "$state": "/feature" }] }
{ "$or": [{ "$state": "/roleA" }, { "$state": "/roleB" }] }
```

Use an array as shorthand for `$and`:

```json
[{ "$state": "/isAdmin" }, { "$state": "/feature" }]
```

Inside repeat scopes, use `$item` and `$index`:

```json
{ "$item": "isActive" }
{ "$index": true, "eq": 0 }
```

## Event System

Components now use `emit` to fire named events. `onAction` has been removed.

**Before:**
```javascript
Button: ({ props, onAction }) => (
  <button onClick={() => onAction?.("press")}>{props.label}</button>
)
```

**After:**
```javascript
Button: ({ props, emit }) => (
  <button onClick={() => emit("press")}>{props.label}</button>
)
```

`emit` is always defined (never `undefined`), so optional chaining is not needed.

## Actions Context

`dispatch` has been renamed to `execute`, and the provider prop has been renamed from `actionHandlers` to `handlers`.

**Before:**
```javascript
const { dispatch } = useActions();
dispatch({ action: "submit", params: {} });

<ActionProvider actionHandlers={myHandlers}>
```

**After:**
```javascript
const { execute } = useActions();
execute({ action: "submit", params: {} });

<ActionProvider handlers={myHandlers}>
```

## Repeat / List Rendering

The `repeat` field now uses `statePath` instead of `path`.

**Before:**
```json
{
  "type": "Column",
  "repeat": { "path": "/todos", "key": "id" },
  "children": ["todo-item"]
}
```

**After:**
```json
{
  "type": "Column",
  "repeat": { "statePath": "/todos", "key": "id" },
  "children": ["todo-item"]
}
```

## Catalog Creation

`createCatalog` and `generateSystemPrompt` have been replaced by `defineSchema` + `defineCatalog`.

**Before:**
```javascript
import { createCatalog, generateSystemPrompt } from "@json-render/core";

const catalog = createCatalog({
  name: "my-app",
  components: { /* ... */ },
  actions: { /* ... */ },
});

const prompt = generateSystemPrompt(catalog);
```

**After:**
```javascript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";

const catalog = defineCatalog(schema, {
  components: { /* ... */ },
  actions: { /* ... */ },
});

const prompt = catalog.prompt();

// Inline mode prompt (formerly "chat")
const inlinePrompt = catalog.prompt({ mode: "inline" });
```

## Generation Modes

Generation mode values passed to `catalog.prompt()` have been renamed:

- `"generate"` is now `"standalone"`
- `"chat"` is now `"inline"`

The old names are accepted as deprecated aliases.

**Before:**
```javascript
const prompt = catalog.prompt({ mode: "generate" });
const chatPrompt = catalog.prompt({ mode: "chat" });
```

**After:**
```javascript
const prompt = catalog.prompt({ mode: "standalone" });
const inlinePrompt = catalog.prompt({ mode: "inline" });
```

The default mode is `"standalone"`, which behaves identically to the previous `"generate"` default.

## Validation

`ValidationCheck` now uses `type` instead of `fn`, `ValidationProvider` uses `customFunctions` instead of `functions`, and `useFieldValidation` takes a config object instead of a checks array.

**Before:**
```json
{ "fn": "required", "message": "Required" }
{ "fn": "minLength", "args": { "length": 8 }, "message": "Too short" }
```

**After:**
```json
{ "type": "required", "message": "Required" }
{ "type": "minLength", "args": { "min": 8 }, "message": "Too short" }
```

Key changes:
- `{ fn: "required" }` → `{ type: "required" }`
- `ValidationProvider functions={...}` → `ValidationProvider customFunctions={...}`
- `useFieldValidation(path, checks)` → `useFieldValidation(path, config)` where config is `{ checks, validateOn? }`

## Visibility Provider

The `auth` prop has been removed from `VisibilityProvider`. Auth state should be modeled as regular state.

**Before:**
```javascript
<VisibilityProvider auth={{ isSignedIn: true, role: "admin" }}>

{ "auth": "signedIn" }
```

**After:**
```javascript
<StateProvider initialState={{ auth: { isSignedIn: true, role: "admin" } }}>
  <VisibilityProvider>

{ "$state": "/auth/isSignedIn" }
```

## Codegen

`traverseTree` has been renamed to `traverseSpec`, `SpecVisitor` to `TreeVisitor`, and the visitor callback now receives a `key` parameter.

**Before:**
```javascript
import { traverseTree } from "@json-render/codegen";

traverseTree(tree, (element) => {
  // ...
});
```

**After:**
```javascript
import { traverseSpec } from "@json-render/codegen";

traverseSpec(spec, (element, key) => {
  // ...
});
```

## Action Params

Action params in specs now use `statePath` instead of `path`.

**Before:**
```json
{
  "on": {
    "press": { "action": "setState", "params": { "path": "/count", "value": 0 } }
  }
}
```

**After:**
```json
{
  "on": {
    "press": { "action": "setState", "params": { "statePath": "/count", "value": 0 } }
  }
}
```

## Removed Exports

The following exports have been removed from `@json-render/core`:

| Removed | Replacement |
|---------|-------------|
| `createCatalog` | `defineCatalog(schema, config)` |
| `generateCatalogPrompt` | `catalog.prompt()` |
| `generateSystemPrompt` | `catalog.prompt()` |
| `ComponentDefinition` | Use catalog component config directly |
| `CatalogConfig` | Use `defineCatalog` parameters |
| `SystemPromptOptions` | Use `PromptOptions` |
| `LogicExpression` | Use `VisibilityCondition` |
| `AuthState` | Model auth as regular state (e.g. `/auth/isSignedIn`) |
| `evaluateLogicExpression` | Use `evaluateVisibility` |
| `createRendererFromCatalog` | Use `defineRegistry` |
| `traverseTree` (codegen) | Use `traverseSpec` |
