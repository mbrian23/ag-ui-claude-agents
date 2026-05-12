<!-- source: https://json-render.dev/docs/api/react -->
# @json-render/react

React components, providers, and hooks.

## Providers

### StateProvider

```jsx
<StateProvider initialState={object} onStateChange={fn}>
  {children}
</StateProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `store` | `StateStore` | External store (controlled mode). When provided, `initialState` and `onStateChange` are ignored. |
| `initialState` | `Record<string, unknown>` | Initial state model (uncontrolled mode). |
| `onStateChange` | `(changes: Array<{ path: string; value: unknown }>) => void` | Callback when state changes (uncontrolled mode). Called once per `set` or `update` with all changed entries. |

#### External Store (Controlled Mode)

Pass a `StateStore` to bypass the internal state and wire json-render to any state management library:

```javascript
import { createStateStore, type StateStore } from "@json-render/react";

const store = createStateStore({ count: 0 });

<StateProvider store={store}>
  {children}
</StateProvider>

// Mutate from anywhere — React re-renders automatically:
store.set("/count", 1);
```

The `store` prop is also available on `JSONUIProvider` and `createRenderer`.

### ActionProvider

```jsx
<ActionProvider handlers={Record<string, ActionHandler>}>
  {children}
</ActionProvider>

type ActionHandler = (params: Record<string, unknown>) => void | Promise<void>;
```

### VisibilityProvider

```jsx
<VisibilityProvider>
  {children}
</VisibilityProvider>
```

`VisibilityProvider` reads state from the parent `StateProvider` automatically. Conditions in specs use the `VisibilityCondition` format with `$state` paths (e.g. `{ "$state": "/path" }`, `{ "$state": "/path", "eq": value }`). See visibility for the full syntax.

### ValidationProvider

```jsx
<ValidationProvider customFunctions={Record<string, ValidationFunction>}>
  {children}
</ValidationProvider>

type ValidationFunction = (value: unknown, args?: object) => boolean | Promise<boolean>;
```

## defineRegistry

Create a type-safe component registry from a catalog. Components receive `props`, `children`, `emit`, `on`, and `loading` with catalog-inferred types.

When the catalog declares actions, the `actions` field is required. When the catalog has no actions (e.g. `actions: {}`), the field is optional.

```javascript
import { defineRegistry } from '@json-render/react';

const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => <div>{props.title}{children}</div>,
    Button: ({ props, emit }) => (
      <button onClick={() => emit("press")}>
        {props.label}
      </button>
    ),
  },
});

// Pass to <Renderer>
<Renderer spec={spec} registry={registry} />
```

## Components

### Renderer

```jsx
<Renderer
  spec={Spec}           // The UI spec to render
  registry={Registry}   // Component registry (from defineRegistry)
  loading={boolean}     // Optional loading state
  fallback={Component}  // Optional fallback for unknown types
/>

type Registry = Record<string, React.ComponentType<ComponentRenderProps>>;
```

### JSONUIProvider

Convenience wrapper that combines `StateProvider`, `VisibilityProvider`, `ValidationProvider`, and `ActionProvider`. Accepts all their props plus:

| Prop | Type | Description |
|------|------|-------------|
| `functions` | `Record<string, ComputedFunction>` | Named functions for `$computed` expressions in props |

```jsx
<JSONUIProvider
  spec={spec}
  catalog={catalog}
  handlers={{ submit: async () => { /* ... */ } }}
  functions={{ fullName: (args) => `${args.first} ${args.last}` }}
>
  <Renderer spec={spec} registry={registry} />
</JSONUIProvider>
```

The `functions` prop is also available on `createRenderer`.

### Component Props (via defineRegistry)

```javascript
interface ComponentContext<P> {
  props: P;                                // Typed props from catalog
  children?: React.ReactNode;              // Rendered children (for slot components)
  emit: (event: string) => void;           // Emit a named event (always defined)
  on: (event: string) => EventHandle;      // Get event handle with metadata
  loading?: boolean;
  bindings?: Record<string, string>;       // State paths from $bindState/$bindItem expressions
}

interface EventHandle {
  emit: () => void;              // Fire the event
  shouldPreventDefault: boolean; // Whether any binding requested preventDefault
  bound: boolean;                // Whether any handler is bound
}
```

Use `emit("press")` for simple event firing. Use `on("click")` when you need to check metadata like `shouldPreventDefault`:

```javascript
Link: ({ props, on }) => {
  const click = on("click");
  return (
    <a
      href={props.href}
      onClick={(e) => {
        if (click.shouldPreventDefault) e.preventDefault();
        click.emit();
      }}
    >
      {props.label}
    </a>
  );
},
```

### BaseComponentProps

Catalog-agnostic base type for building reusable component libraries (e.g. `@json-render/shadcn`) that are not tied to a specific catalog:

```javascript
import type { BaseComponentProps } from "@json-render/react";

const Card = ({ props, children }: BaseComponentProps<{ title?: string }>) => (
  <div>{props.title}{children}</div>
);
```

## Hooks

### useUIStream

```javascript
const {
  spec,         // Spec | null - current UI state
  isStreaming,  // boolean - true while streaming
  error,        // Error | null
  send,         // (prompt: string, context?: Record<string, unknown>) => Promise<void>
  clear,        // () => void - reset spec and error
} = useUIStream({
  api: string,                         // API endpoint URL
  onComplete?: (spec: Spec) => void,   // Called when streaming completes
  onError?: (error: Error) => void,    // Called when an error occurs
});
```

### useStateStore

```javascript
const {
  state,   // StateModel (Record<string, unknown>)
  get,     // (path: string) => unknown
  set,     // (path: string, value: unknown) => void
  update,  // (updates: Record<string, unknown>) => void
} = useStateStore();
```

### useStateValue

```javascript
const value = useStateValue(path: string);
```

### useStateBinding (deprecated)

> **Deprecated.** Use `useBoundProp` with `$bindState` expressions instead.

```javascript
const [value, setValue] = useStateBinding(path: string);
```

### useActions

```javascript
const { execute } = useActions();
// execute(binding: ActionBinding) => Promise<void>
```

### useAction

```javascript
const { execute, isLoading } = useAction(binding: ActionBinding);
// execute() => Promise<void>
```

### useIsVisible

```javascript
const isVisible = useIsVisible(condition?: VisibilityCondition);
```

### useFieldValidation

```javascript
const {
  state,     // FieldValidationState
  validate,  // () => ValidationResult
  touch,     // () => void
  clear,     // () => void
  errors,    // string[]
  isValid,   // boolean
} = useFieldValidation(path: string, config?: ValidationConfig);
```

`ValidationConfig` is `{ checks?: ValidationCheck[], validateOn?: 'change' | 'blur' | 'submit' }`.

### useOptionalValidation

Non-throwing variant of `useValidation()`. Returns `null` when no `ValidationProvider` is present, instead of throwing. Useful in components that may or may not be rendered inside a validation context.

```javascript
const validation = useOptionalValidation();
// ValidationContextValue | null
```

### useBoundProp

Two-way binding helper for `$bindState` / `$bindItem` expressions. Returns `[value, setValue]` where `setValue` writes back to the bound state path.

```javascript
const [value, setValue] = useBoundProp<T>(
  propValue: T | undefined,       // The already-resolved prop value
  bindingPath: string | undefined  // From bindings?.value
);
```

Use inside registry components:

```javascript
const Input: ComponentRenderer = ({ props, bindings }) => {
  const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
  return <input value={value ?? ""} onChange={(e) => setValue(e.target.value)} />;
};
```

### Chat Hooks

Two hooks are available for chat + GenUI, depending on your setup:

- **`useChatUI`** -- Self-contained chat hook with its own message state, fetch logic, and mixed stream parsing. Use when you want a standalone chat experience without the Vercel AI SDK.
- **`useJsonRenderMessage`** -- Extracts spec + text from an AI SDK `UIMessage.parts` array. Use with the Vercel AI SDK's `useChat` for full AI SDK integration.

### useChatUI

Hook for chat + GenUI experiences. Manages a multi-turn conversation where each assistant message can contain both text and a json-render UI spec.

```javascript
const {
  messages,     // ChatMessage[] - all messages in the conversation
  isStreaming,  // boolean - true while streaming
  error,        // Error | null
  send,         // (text: string) => Promise<void>
  clear,        // () => void - reset conversation
} = useChatUI({
  api: string,                                   // API endpoint
  onComplete?: (message: ChatMessage) => void,   // Called when streaming completes
  onError?: (error: Error) => void,              // Called on error
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}
```

### useJsonRenderMessage

Extract a spec and text content from an AI SDK message's `parts` array. Designed for integration with Vercel AI SDK's `useChat`.

```javascript
const { spec, text, hasSpec } = useJsonRenderMessage(parts: DataPart[]);

// spec: Spec | null     - compiled from JSONL patches in data parts
// text: string          - concatenated text parts
// hasSpec: boolean      - true when spec is non-null
```

### buildSpecFromParts / getTextFromParts

Standalone utilities for extracting spec and text from AI SDK message parts (non-hook versions):

```javascript
import { buildSpecFromParts, getTextFromParts } from '@json-render/react';

const spec = buildSpecFromParts(message.parts);   // Spec | null
const text = getTextFromParts(message.parts);      // string
```
