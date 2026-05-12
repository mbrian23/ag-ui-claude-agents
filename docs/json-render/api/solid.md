<!-- source: https://json-render.dev/docs/api/solid -->
# @json-render/solid

SolidJS components, providers, and hooks for rendering json-render specs.

## Installation

```bash
npm install @json-render/core @json-render/solid
```

Peer dependencies: `solid-js ^1.9.0` and `zod ^4.0.0`.

```bash
npm install solid-js zod
```

## Providers

### StateProvider

```jsx
<StateProvider
  initialState={{}}
  onStateChange={(changes) => console.log(changes)}
>
  {/* children */}
</StateProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `store` | `StateStore` | External store (controlled mode). When provided, `initialState` and `onStateChange` are ignored. |
| `initialState` | `Record<string, unknown>` | Initial state model for uncontrolled mode. |
| `onStateChange` | `(changes: Array<{ path: string; value: unknown }>) => void` | Called for uncontrolled state updates. |

### ActionProvider

```jsx
<ActionProvider
  handlers={{ submit: async (params) => {} }}
  navigate={(path) => {}}
>
  {/* children */}
</ActionProvider>
```

### VisibilityProvider

```jsx
<VisibilityProvider>{/* children */}</VisibilityProvider>
```

### ValidationProvider

```jsx
<ValidationProvider customFunctions={{ custom: (value) => Boolean(value) }}>
  {/* children */}
</ValidationProvider>
```

### JSONUIProvider

Combined provider wrapper for state, visibility, validation, and actions.

```jsx
<JSONUIProvider
  registry={registry}
  initialState={{}}
  handlers={handlers}
  validationFunctions={validationFunctions}
>
  <Renderer spec={spec} registry={registry} />
</JSONUIProvider>
```

## defineRegistry

Create a typed component registry and action helpers from a catalog.

```jsx
const { registry, handlers, executeAction } = defineRegistry(catalog, {
  components: {
    Card: (renderProps) => <div>{renderProps.children}</div>,
    Button: (renderProps) => (
      <button onClick={() => renderProps.emit("press")}>
        {renderProps.element.props.label as string}
      </button>
    ),
  },
  actions: {
    submit: async (params, setState, state) => {
      // custom action logic
    },
  },
});
```

## Components

### Renderer

```jsx
<Renderer spec={spec} registry={registry} loading={false} />
```

Renders a `Spec` tree using your registry.

### createRenderer

Build an app-level renderer from catalog + components:

```jsx
const AppRenderer = createRenderer(catalog, {
  Card: (renderProps) => <div>{renderProps.children}</div>,
});

<AppRenderer spec={spec} state={{}} onAction={(name, params) => {}} />;
```

## Hooks

- `useStateStore()`
- `useStateValue(path)` - returns an accessor
- `useStateBinding(path)` - returns `[Accessor<T | undefined>, setValue]`
- `useVisibility()` / `useIsVisible(condition)`
- `useActions()` / `useAction(binding)`
- `useValidation()` / `useOptionalValidation()`
- `useFieldValidation(path, config)` - returns accessor-backed `state`, `errors`, and `isValid`
- `useBoundProp(value, bindingPath)`
- `useUIStream(options)`
- `useChatUI(options)`

## Built-in Actions

`ActionProvider` handles these built-in actions:

- `setState`
- `pushState`
- `removeState`
- `validateForm`

## Component Props

Registry components receive:

```typescript
interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: JSX.Element;
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}
```

Use `emit("event")` to dispatch event bindings. Use `on("event")` to access `EventHandle` metadata (`bound`, `shouldPreventDefault`, `emit`).

## Reactivity Notes

- Keep changing reads in JSX expressions, `createMemo`, or `createEffect`.
- Avoid props destructuring in component signatures when you need live updates.
- `StateProvider` and other contexts expose getter-backed values so consumers read live signals.
- `useStateValue`, `useStateBinding`, and `useFieldValidation` expose reactive accessors; call them as functions.
