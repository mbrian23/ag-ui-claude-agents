<!-- source: https://json-render.dev/docs/api/shadcn -->
# @json-render/shadcn

Pre-built shadcn/ui components for json-render. 36 components built on Radix UI + Tailwind CSS, ready to use with `defineCatalog` and `defineRegistry`.

## Installation

```
npm install @json-render/shadcn @json-render/core @json-render/react zod
```

Your app must have Tailwind CSS configured.

## Entry Points

| Entry Point | Exports | Use For |
|---|---|---|
| `@json-render/shadcn` | `shadcnComponents` | React implementations |
| `@json-render/shadcn/catalog` | `shadcnComponentDefinitions` | Catalog schemas (no React dependency, safe for server) |

## Usage

Pick the components you need from the standard definitions:

```javascript
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";

// Catalog: pick definitions
const catalog = defineCatalog(schema, {
  components: {
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Heading: shadcnComponentDefinitions.Heading,
    Button: shadcnComponentDefinitions.Button,
    Input: shadcnComponentDefinitions.Input,
  },
  actions: {},
});

// Registry: pick matching implementations
const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Heading: shadcnComponents.Heading,
    Button: shadcnComponents.Button,
    Input: shadcnComponents.Input,
  },
});
```

State actions (`setState`, `pushState`, `removeState`) are built into the React schema and handled by `ActionProvider` automatically. You don't need to declare them in your catalog.

## Extending with Custom Components

Add custom components alongside standard ones:

```javascript
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    // Standard
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Button: shadcnComponentDefinitions.Button,

    // Custom
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
      }),
      description: "KPI metric display",
    },
  },
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Button: shadcnComponents.Button,
    Metric: ({ props }) => (
      <div>
        <span>{props.label}</span>
        <span>{props.value}</span>
      </div>
    ),
  },
});
```

## Available Components

### Layout

| Component | Description |
|---|---|
| `Card` | Container card with optional title, description, maxWidth, centered |
| `Stack` | Flex container with direction, gap, align, justify |
| `Grid` | Grid layout with columns (1-6) and gap |
| `Separator` | Visual separator line with orientation |

### Navigation

| Component | Description |
|---|---|
| `Tabs` | Tabbed navigation with tabs array, defaultValue, value |
| `Accordion` | Collapsible sections with items array and type (single/multiple) |
| `Collapsible` | Single collapsible section with title and defaultOpen |
| `Pagination` | Page navigation with totalPages and page |

### Overlay

| Component | Description |
|---|---|
| `Dialog` | Modal dialog with title, description, openPath |
| `Drawer` | Bottom drawer with title, description, openPath |
| `Tooltip` | Hover tooltip with content and text |
| `Popover` | Click-triggered popover with trigger and content |
| `DropdownMenu` | Dropdown menu with label and items array |

### Content

| Component | Description |
|---|---|
| `Heading` | Heading text with level (h1-h4) |
| `Text` | Paragraph with variant (body, caption, muted, lead, code) |
| `Image` | Image with alt, width, height |
| `Avatar` | User avatar with src, name, size |
| `Badge` | Status badge with text and variant |
| `Alert` | Alert banner with title, message, type |
| `Carousel` | Horizontally scrollable carousel with items |
| `Table` | Data table with columns and rows |

### Feedback

| Component | Description |
|---|---|
| `Progress` | Progress bar with value, max, label |
| `Skeleton` | Loading placeholder with width, height, rounded |
| `Spinner` | Loading spinner with size and label |

### Input

| Component | Description |
|---|---|
| `Button` | Clickable button with label, variant, disabled |
| `Link` | Anchor link with label and href |
| `Input` | Text input with label, name, type, placeholder, value, checks |
| `Textarea` | Multi-line text input with label, name, placeholder, rows, value, checks |
| `Select` | Dropdown select with label, name, options, value, checks |
| `Checkbox` | Checkbox with label, name, checked |
| `Radio` | Radio button group with label, name, options, value |
| `Switch` | Toggle switch with label, name, checked |
| `Slider` | Range slider with label, min, max, step, value |
| `Toggle` | Toggle button with label, pressed, variant |
| `ToggleGroup` | Group of toggle buttons with items, type, value |
| `ButtonGroup` | Group of buttons with buttons array and selected |

## Notes

- The `/catalog` entry point has no React dependency -- use it for server-side prompt generation
- Components use Tailwind CSS classes -- your app must have Tailwind configured
- Component implementations use bundled shadcn/ui primitives (not your app's `components/ui/`)
- Form inputs support `checks` for validation (type + message pairs)
- Events: inputs emit `change`/`submit`/`focus`/`blur`; buttons emit `press`; selects emit `change`/`select`
