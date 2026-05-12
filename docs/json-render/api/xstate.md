<!-- source: https://json-render.dev/docs/api/xstate -->
# @json-render/xstate

The `@json-render/xstate` package provides an XState Store adapter for json-render's `StateStore` interface, requiring `@xstate/store` v3 or later.

## Installation

```
npm install @json-render/xstate @json-render/core @json-render/react @xstate/store
```

## xstateStoreStateStore

This function creates a state store implementation backed by an `@xstate/store` atom.

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `atom` | `Atom<StateModel>` | Yes | An `@xstate/store` atom (from `createAtom`) holding the json-render state model. |

### Example

```javascript
import { createAtom } from "@xstate/store";
import { xstateStoreStateStore } from "@json-render/xstate";
import { StateProvider } from "@json-render/react";

const uiAtom = createAtom({ count: 0 });
const store = xstateStoreStateStore({ atom: uiAtom });

<StateProvider store={store}>
  {/* json-render reads/writes go through @xstate/store */}
</StateProvider>
```

## Re-exports

| Export | Source |
|--------|--------|
| `StateStore` | `@json-render/core` |
