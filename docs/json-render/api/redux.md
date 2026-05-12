<!-- source: https://json-render.dev/docs/api/redux -->
# @json-render/redux

Redux / Redux Toolkit adapter for json-render's `StateStore` interface.

## Installation

```
npm install @json-render/redux @json-render/core @json-render/react redux
# or with Redux Toolkit (recommended):
npm install @json-render/redux @json-render/core @json-render/react @reduxjs/toolkit
```

## reduxStateStore

Create a `StateStore` backed by a Redux store.

```javascript
import { reduxStateStore } from "@json-render/redux";
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `Store` | Yes | The Redux store instance. |
| `selector` | `(state: S) => StateModel` | No | Select the json-render slice from the Redux state tree. Defaults to `(state) => state`. |
| `dispatch` | `(nextState: StateModel, store: Store) => void` | Yes | Dispatch an action that replaces the selected slice with the next state. |

### Example

```javascript
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { reduxStateStore } from "@json-render/redux";
import { StateProvider } from "@json-render/react";

const uiSlice = createSlice({
  name: "ui",
  initialState: { count: 0 } as Record<string, unknown>,
  reducers: {
    replaceUiState: (_state, action) => action.payload,
  },
});

const reduxStore = configureStore({
  reducer: { ui: uiSlice.reducer },
});

const store = reduxStateStore({
  store: reduxStore,
  selector: (state) => state.ui,
  dispatch: (next, s) => s.dispatch(uiSlice.actions.replaceUiState(next)),
});

<StateProvider store={store}>
  {/* json-render reads/writes go through Redux */}
</StateProvider>
```

## Re-exports

| Export | Source |
|--------|--------|
| `StateStore` | `@json-render/core` |
