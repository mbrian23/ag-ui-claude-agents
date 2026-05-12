<!-- source: https://json-render.dev/docs/api/react-native -->
# @json-render/react-native

React Native renderer with standard components, providers, and hooks.

## Standard Components

### Layout

| Component | Props | Description |
|-----------|-------|-------------|
| `Container` | `padding`, `background`, `borderRadius`, `borderColor`, `flex` | Basic wrapper with styling |
| `Row` | `gap`, `align`, `justify`, `flex`, `wrap` | Horizontal flex layout |
| `Column` | `gap`, `align`, `justify`, `flex` | Vertical flex layout |
| `ScrollContainer` | `direction` | Scrollable area (vertical or horizontal) |
| `SafeArea` | `edges` | Safe area insets for notch/home indicator |
| `Pressable` | `action`, `actionParams` | Touchable wrapper that triggers actions |
| `Spacer` | `size`, `flex` | Fixed or flexible spacing |
| `Divider` | `color`, `thickness` | Thin line separator |

### Content

| Component | Props | Description |
|-----------|-------|-------------|
| `Heading` | `text`, `level`, `align`, `color` | Heading text (levels 1-6) |
| `Paragraph` | `text`, `align`, `color` | Body text |
| `Label` | `text`, `color`, `bold` | Small label text |
| `Image` | `uri`, `width`, `height`, `resizeMode`, `borderRadius` | Image display |
| `Avatar` | `uri`, `size`, `fallback` | Circular avatar |
| `Badge` | `label`, `color`, `textColor` | Status badge |
| `Chip` | `label`, `selected`, `color` | Tag/chip |

### Input

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `label`, `variant`, `size`, `disabled`, `action`, `actionParams` | Pressable button |
| `TextInput` | `placeholder`, `value`, `secure`, `keyboardType`, `multiline` | Text input field |
| `Switch` | `checked`, `label` | Toggle switch |
| `Checkbox` | `checked`, `label` | Checkbox with label |
| `Slider` | `value`, `min`, `max`, `step` | Range slider |
| `SearchBar` | `placeholder`, `value` | Search input |

### Feedback

| Component | Props | Description |
|-----------|-------|-------------|
| `Spinner` | `size`, `color` | Loading indicator |
| `ProgressBar` | `progress`, `color`, `trackColor` | Progress indicator |

### Composite

| Component | Props | Description |
|-----------|-------|-------------|
| `Card` | `title`, `subtitle`, `padding` | Card container |
| `ListItem` | `title`, `subtitle`, `leading`, `trailing`, `action`, `actionParams` | List row |
| `Modal` | `visible`, `title` | Bottom sheet modal |

## Providers

### StateProvider

```jsx
<StateProvider initialState={object} onStateChange={fn}>
  {children}
</StateProvider>
```

| Prop | Type | Description |
|-----|------|-------------|
| `store` | `StateStore` | External store (controlled mode). When provided, `initialState` and `onStateChange` are ignored. |
| `initialState` | `Record<string, unknown>` | Initial state model (uncontrolled mode). |
| `onStateChange` | `(changes: Array<{ path: string; value: unknown }>) => void` | Callback when state changes (uncontrolled mode). Called once per `set` or `update` with all changed entries. |

#### External Store (Controlled Mode)

```javascript
import { createStateStore, type StateStore } from "@json-render/react-native";

const store = createStateStore({ count: 0 });

<StateProvider store={store}>
  {children}
</StateProvider>

// Mutate from anywhere — components re-render automatically:
store.set("/count", 1);
```

The `store` prop is also available on `JSONUIProvider` and `createRenderer`.

### ActionProvider

```jsx
<ActionProvider handlers={Record<string, ActionHandler>}>
  {children}
</ActionProvider>
```

### VisibilityProvider

```jsx
<VisibilityProvider>
  {children}
</VisibilityProvider>
```

Conditions in specs use the `VisibilityCondition` format with `$state` paths (e.g. `{ "$state": "/path" }`, `{ "$state": "/path", "eq": value }`).

### ValidationProvider

```jsx
<ValidationProvider>
  {children}
</ValidationProvider>
```

## defineRegistry

Create a type-safe component registry. Standard components are built-in; only register custom components.

```javascript
import { defineRegistry, type Components } from '@json-render/react-native';

const { registry } = defineRegistry(catalog, {
  components: {
    Icon: ({ props }) => <Ionicons name={props.name} size={props.size ?? 24} />,
  } as Components<typeof catalog>,
});
```

## Hooks

### useUIStream

```javascript
const {
  spec,         // Spec | null - current UI state
  isStreaming,  // boolean - true while streaming
  error,        // Error | null
  send,         // (prompt: string) => Promise<void>
  clear,        // () => void - reset spec and error
} = useUIStream({
  api: string,
  onComplete?: (spec: Spec) => void,
  onError?: (error: Error) => void,
});
```

### useStateStore

```javascript
const { state, get, set, update } = useStateStore();
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
```

### useIsVisible

```javascript
const isVisible = useIsVisible(condition?: VisibilityCondition);
```

## Catalog Exports

```javascript
import { standardComponentDefinitions, standardActionDefinitions } from "@json-render/react-native/catalog";
import { schema } from "@json-render/react-native/schema";
```

| Export | Purpose |
|--------|---------|
| `standardComponentDefinitions` | Catalog definitions for all 25+ standard components |
| `standardActionDefinitions` | Catalog definitions for standard actions (setState, navigate) |
| `schema` | React Native element tree schema |
