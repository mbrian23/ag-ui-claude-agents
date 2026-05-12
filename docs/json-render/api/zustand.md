<!-- source: https://json-render.dev/docs/api/zustand -->
# @json-render/zustand

Zustand adapter for json-render's `StateStore` interface.

Requires Zustand v5+. Zustand v4 is not supported due to breaking API changes in the vanilla store interface.

## Installation

```
npm install @json-render/zustand @json-render/core @json-render/react zustand
```

## zustandStateStore

Create a `StateStore` backed by a Zustand vanilla store.

```javascript
import { zustandStateStore } from "@json-render/zustand";
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `StoreApi<S>` | Yes | A Zustand vanilla store (from `createStore` in `zustand/vanilla`). |
| `selector` | `(state: S) => StateModel` | No | Select the json-render slice from the store state. Defaults to the entire state. |
| `updater` | `(nextState: StateModel, store: StoreApi<S>) => void` | No | Apply a state change back to the store. Defaults to a shallow merge. |

### Example

```javascript
import { createStore } from "zustand/vanilla";
import { zustandStateStore } from "@json-render/zustand";
import { StateProvider } from "@json-render/react";

const bearStore = createStore(() => ({
  count: 0,
  name: "Bear",
}));

const store = zustandStateStore({ store: bearStore });

<StateProvider store={store}>
  {/* json-render reads/writes go through Zustand */}
</StateProvider>
```

### Nested Slice

```javascript
const appStore = createStore(() => ({
  ui: { count: 0 },
  auth: { token: null },
}));

const store = zustandStateStore({
  store: appStore,
  selector: (s) => s.ui,
  updater: (next, s) => s.setState({ ui: next }),
});
```

## Re-exports

| Export | Source |
|--------|--------|
| `StateStore` | `@json-render/core` |
