<!-- source: https://json-render.dev/docs/api/jotai -->
# @json-render/jotai

Jotai adapter for json-render's `StateStore` interface.

## Installation

```
npm install @json-render/jotai @json-render/core @json-render/react jotai
```

## jotaiStateStore

Create a `StateStore` backed by a Jotai atom.

```javascript
import { jotaiStateStore } from "@json-render/jotai";
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `atom` | `WritableAtom<StateModel, [StateModel], void>` | Yes | A writable atom holding the state model. |
| `store` | Jotai `Store` | No | The Jotai store instance. Defaults to a new store created internally. Pass your own to share state with `<Provider>`. |

### Example

```javascript
import { atom } from "jotai";
import { jotaiStateStore } from "@json-render/jotai";
import { StateProvider } from "@json-render/react";

const uiAtom = atom<Record<string, unknown>>({ count: 0 });
const store = jotaiStateStore({ atom: uiAtom });

<StateProvider store={store}>
  {/* json-render reads/writes go through Jotai */}
</StateProvider>
```

### Shared Jotai Store

If your app already uses a Jotai `<Provider>` with a custom store, pass it so both json-render and your components share the same state:

```javascript
import { atom, createStore } from "jotai";
import { Provider as JotaiProvider } from "jotai/react";
import { jotaiStateStore } from "@json-render/jotai";
import { StateProvider } from "@json-render/react";

const jStore = createStore();
const uiAtom = atom<Record<string, unknown>>({ count: 0 });
const store = jotaiStateStore({ atom: uiAtom, store: jStore });

<JotaiProvider store={jStore}>
  <StateProvider store={store}>
    {/* Both json-render and useAtom() see the same state */}
  </StateProvider>
</JotaiProvider>
```

## Re-exports

| Export | Source |
|--------|--------|
| `StateStore` | `@json-render/core` |
