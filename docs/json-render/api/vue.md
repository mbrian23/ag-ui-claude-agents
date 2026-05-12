<!-- source: https://json-render.dev/docs/api/vue -->
# @json-render/vue

Vue 3 components, providers, and composables for rendering UI from JSON specifications.

## Providers

### StateProvider

Manages application state with two modes:

**Uncontrolled mode** uses `initialState` and `onStateChange`:
```vue
<StateProvider :initial-state="object" :on-state-change="fn">
  <!-- children -->
</StateProvider>
```

**Controlled mode** accepts an external `StateStore`:
```javascript
import { createStateStore } from "@json-render/vue";

const store = createStateStore({ count: 0 });
store.set("/count", 1); // Triggers Vue re-renders automatically
```

### ActionProvider

```vue
<ActionProvider :handlers="Record<string, ActionHandler>" :navigate="fn">
  <!-- children -->
</ActionProvider>
```

Handles user actions and navigation callbacks.

### VisibilityProvider

```vue
<VisibilityProvider>
  <!-- children -->
</VisibilityProvider>
```

Manages conditional visibility using state-based conditions (e.g., `{ "$state": "/path" }`).

### ValidationProvider

```vue
<ValidationProvider :custom-functions="Record<string, ValidationFunction>">
  <!-- children -->
</ValidationProvider>
```

Provides custom validation logic for form fields.

## defineRegistry

Creates a type-safe component registry from a catalog:

```javascript
import { defineRegistry } from "@json-render/vue";

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) =>
      h("div", { class: "card" }, [h("h3", null, props.title), children]),
    Button: ({ props, emit }) =>
      h("button", { onClick: () => emit("press") }, props.label),
  },
  actions: {
    submit: async (params) => { /* ... */ },
  },
});
```

## Components

### Renderer

```vue
<Renderer
  :spec="Spec"
  :registry="Registry"
  :loading="boolean"
  :fallback="Component"
/>
```

Renders UI specifications using the provided component registry.

### Component Props

Components receive a context object with:

```typescript
interface ComponentContext<P> {
  props: P;
  children?: VNode | VNode[];
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  loading?: boolean;
  bindings?: Record<string, string>;
}
```

Use `emit()` for simple events or `on()` for metadata access:

```javascript
Link: ({ props, on }) => {
  const click = on("click");
  return h("a", {
    href: props.href,
    onClick: (e: MouseEvent) => {
      if (click.shouldPreventDefault) e.preventDefault();
      click.emit();
    },
  }, props.label);
},
```

## Composables

### useStateStore

```javascript
const { state, get, set, update } = useStateStore();
// state is ShallowRef<StateModel> — use state.value
```

### useStateValue

```javascript
const value = useStateValue(path); // ComputedRef<T | undefined>
```

### useActions

```javascript
const { execute } = useActions();
```

### useAction

```javascript
const { execute, isLoading } = useAction(binding);
// isLoading: ComputedRef<boolean>
```

### useIsVisible

```javascript
const isVisible = useIsVisible(condition);
```

### useFieldValidation

```javascript
const {
  state,
  validate,
  touch,
  clear,
  errors,
  isValid,
} = useFieldValidation(path, config);
```

## Key Differences from React

Vue composables return reactive types (`ShallowRef`, `ComputedRef`) requiring `.value` access, whereas React returns plain values. For example, `useStateStore().state` is a `ShallowRef<StateModel>` in Vue but a plain object in React.
