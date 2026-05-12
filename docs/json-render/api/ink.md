<!-- source: https://json-render.dev/docs/api/ink -->
# @json-render/ink

Terminal renderer for Ink with multiple standard components, providers, hooks, and streaming support.

## Installation

```bash
npm install @json-render/core @json-render/ink
```

Peer dependencies: `react ^18.0.0 || ^19.0.0`, `ink ^6.0.0`, and `zod ^4.0.0`.

```bash
npm install react ink zod
```

## Standard Components

### Layout

| Component | Props | Description |
|-----------|-------|-------------|
| `Box` | `flexDirection`, `alignItems`, `justifyContent`, `gap`, `padding`, `margin`, `borderStyle`, `borderColor`, `width`, `height`, `display`, `overflow` | Flexbox layout container (like a terminal div) |
| `Spacer` | (none) | Flexible empty space that expands to fill available room |
| `Newline` | `count` | Insert blank lines |

### Content

| Component | Props | Description |
|-----------|-------|-------------|
| `Text` | `text`, `color`, `bold`, `italic`, `underline`, `strikethrough`, `dimColor`, `inverse`, `wrap` | Text output with styling |
| `Heading` | `text`, `level` (h1-h4), `color` | Section heading |
| `Divider` | `character`, `color`, `dimColor`, `title`, `width` | Horizontal separator line with optional title |
| `Badge` | `label`, `variant` | Colored inline label (default, info, success, warning, error) |
| `Spinner` | `label`, `color` | Animated loading spinner |
| `ProgressBar` | `progress` (0-1), `width`, `color`, `label` | Horizontal progress bar |
| `StatusLine` | `text`, `status`, `icon` | Status message with colored icon |
| `KeyValue` | `label`, `value`, `labelColor`, `separator` | Key-value pair display |
| `Link` | `url`, `label`, `color` | Renders a URL as underlined text |
| `Markdown` | `text` | Renders markdown with terminal styling |

### Data

| Component | Props | Description |
|-----------|-------|-------------|
| `Table` | `columns`, `rows`, `borderStyle`, `headerColor` | Tabular data with headers |
| `List` | `items`, `ordered`, `bulletChar`, `spacing` | Bulleted or numbered list |
| `ListItem` | `title`, `subtitle`, `leading`, `trailing` | Structured list row |
| `Card` | `title`, `borderStyle`, `borderColor`, `padding` | Bordered container with optional title |
| `Sparkline` | `data`, `width`, `color`, `label`, `min`, `max` | Inline sparkline chart using Unicode blocks |
| `BarChart` | `data`, `width`, `showValues`, `showPercentage` | Horizontal bar chart |

### Interactive

| Component | Props | Description |
|-----------|-------|-------------|
| `TextInput` | `placeholder`, `value`, `label`, `mask` | Text input field |
| `Select` | `options`, `value`, `label` | Arrow-key selection menu |
| `MultiSelect` | `options`, `value`, `label`, `min`, `max` | Multi-selection menu |
| `ConfirmInput` | `message`, `defaultValue`, `yesLabel`, `noLabel` | Yes/No confirmation prompt |
| `Tabs` | `tabs`, `value`, `color` | Tab bar navigation |

## Providers

### JSONUIProvider

Convenience wrapper around all providers: `StateProvider` -> `VisibilityProvider` -> `ValidationProvider` -> `ActionProvider` -> `FocusProvider`.

```javascript
import { JSONUIProvider, Renderer } from "@json-render/ink";

<JSONUIProvider initialState={{}} handlers={handlers}>
  <Renderer spec={spec} registry={registry} />
</JSONUIProvider>
```

### StateProvider

```javascript
<StateProvider initialState={object} onStateChange={fn}>
  {children}
</StateProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `store` | `StateStore` | External store (controlled mode) |
| `initialState` | `Record<string, unknown>` | Initial state model (uncontrolled mode) |
| `onStateChange` | `(changes: Array<{ path: string; value: unknown }>) => void` | Callback when state changes |

**External Store (Controlled Mode):**

```javascript
import { createStateStore } from "@json-render/ink";

const store = createStateStore({ count: 0 });

<StateProvider store={store}>
  {children}
</StateProvider>

// Mutate from anywhere — components re-render automatically:
store.set("/count", 1);
```

### ActionProvider

```javascript
<ActionProvider handlers={Record<string, ActionHandler>} navigate={fn}>
  {children}
</ActionProvider>
```

Built-in actions: `setState`, `pushState`, `removeState`, `log`, `exit`. Custom handlers override built-ins. Includes a terminal confirmation dialog for actions with `confirm`.

### VisibilityProvider

```javascript
<VisibilityProvider>
  {children}
</VisibilityProvider>
```

### ValidationProvider

```javascript
<ValidationProvider>
  {children}
</ValidationProvider>
```

### FocusProvider

```javascript
<FocusProvider>
  {children}
</FocusProvider>
```

Manages Tab-cycling focus between interactive components. Supports `useFocusDisable` to suppress cycling during modal dialogs.

## defineRegistry

Create a type-safe component registry:

```javascript
import { defineRegistry, type Components } from "@json-render/ink";

const { registry, handlers, executeAction } = defineRegistry(catalog, {
  components: {
    MyWidget: ({ props }) => <Text>{props.label}</Text>,
  } as Components<typeof catalog>,
  actions: {
    submit: async (params, setState, state) => {
      // custom action logic
    },
  },
});
```

`handlers` is designed for `JSONUIProvider`/`ActionProvider`. `executeAction` is an imperative helper.

## createRenderer

Higher-level helper that wraps `Renderer` + all providers into a single component:

```javascript
import { createRenderer } from "@json-render/ink";

const UIRenderer = createRenderer(catalog, components);

<UIRenderer spec={spec} state={initialState} />;
```

## Hooks

### useUIStream

```javascript
const {
  spec,         // Spec | null - current UI state
  isStreaming,  // boolean - true while streaming
  error,        // Error | null
  send,         // (prompt: string, context?: Record<string, unknown>) => Promise<void>
  stop,         // () => void - abort the current stream
  clear,        // () => void - reset spec and error
} = useUIStream({
  api: string,
  onComplete?: (spec: Spec) => void,
  onError?: (error: Error) => void,
  fetch?: (url: string, init?: RequestInit) => Promise<Response>,
  validate?: boolean,
  maxRetries?: number,
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

### useBoundProp

```javascript
const [value, setValue] = useBoundProp(resolvedValue, bindingPath);
```

### useActions

```javascript
const { execute } = useActions();
```

### useIsVisible

```javascript
const isVisible = useIsVisible(condition?: VisibilityCondition);
```

### useFocus

```javascript
const { isActive, id } = useFocus();
```

### useFocusDisable

```javascript
useFocusDisable(disabled: boolean);
```

Suppresses Tab-cycling while `disabled` is true (e.g., during a modal dialog).

## Catalog Exports

```javascript
import { standardComponentDefinitions, standardActionDefinitions } from "@json-render/ink/catalog";
import { schema } from "@json-render/ink/schema";
```

| Export | Purpose |
|--------|---------|
| `standardComponentDefinitions` | Catalog definitions for all 19 standard components |
| `standardActionDefinitions` | Catalog definitions for standard actions |
| `schema` | Ink element tree schema |

## Server Export

```javascript
import { schema, standardComponentDefinitions, standardActionDefinitions } from "@json-render/ink/server";
```

Re-exports the schema and catalog definitions for server-side usage (e.g., building system prompts).
