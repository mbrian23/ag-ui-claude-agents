<!-- source: https://json-render.dev/docs/api/core -->
# @json-render/core API Documentation

## Overview

`@json-render/core` provides core types, schemas, and utilities for the json-render framework, enabling type-safe catalog definitions and AI-powered UI generation.

## Key Functions

### defineCatalog

Creates type-safe catalog definitions with schema validation:

```typescript
import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/react/schema';

const catalog = defineCatalog(schema, {
  components: {...},
  actions: {...},
});
```

**CatalogConfig Structure:**
- `components`: Record mapping component names to definitions (props, slots, descriptions)
- `actions`: Optional record of action definitions with parameters
- `functions`: Optional record of function definitions

**Catalog Instance Methods:**
- `prompt(options?)`: Generate AI system prompts
- `validate(spec)`: Validate specs from AI output
- `zodSchema()`: Get Zod schema for custom validation
- `jsonSchema()`: Export as JSON Schema for structured outputs

### Schema System

The framework uses flexible schemas defining both AI output format (spec) and catalog requirements. The `@json-render/react` package exports a standard `schema` for flat UI element trees.

**defineSchema** allows custom schemas for different output formats:

```typescript
const mySchema = defineSchema((s) => ({
  spec: s.object({...}),
  catalog: s.object({...})
}));
```

## Streaming Utilities

### SpecStream

json-render's streaming format using JSONL patches (RFC 6902 compliant):

- **createSpecStreamCompiler**: Incrementally build specs from streaming chunks
- **compileSpecStream**: Compile entire SpecStream strings at once
- **parseSpecStreamLine**: Parse individual patch lines
- **applySpecPatch**: Apply patches to spec objects
- **pipeJsonRender**: Pipe AI SDK streams through json-render transform

### Mixed Stream Parsing

- **createMixedStreamParser**: Parse mixed text and JSONL patch streams
- **createJsonRenderTransform**: Low-level TransformStream for separating text from patches

## Utility Functions

**Path operations:**
- `getByPath(obj, path)`: Retrieve values using JSON Pointer paths
- `setByPath(obj, path, value)`: Set values by path

**Dynamic values:**
- `resolveDynamicValue(value, state)`: Resolve dynamic values against state
- `findFormValue(name, params, state)`: Locate form values across path formats

**Tree conversion:**
- `nestedToFlat(tree)`: Convert nested element trees to flat Spec format

**Visibility:**
- `evaluateVisibility(condition, context)`: Evaluate conditional rendering logic

## Advanced Utilities

### buildUserPrompt

Build structured prompts for AI generation with refinement support:

```typescript
const userPrompt = buildUserPrompt({
  prompt: "create a todo app",
  currentSpec: existingSpec,  // Triggers edit mode
  state: runtimeState,
  editModes: ["patch", "merge"]
});
```

Supports fresh generation, refinement with edit modes (patch, merge, diff), and state context inclusion.

### Deep Merge and Diff

- `deepMergeSpec(base, patch)`: RFC 7396 semantic merging
- `diffToPatches(oldObj, newObj)`: Generate RFC 6902 patches transforming objects

## Types

**UIElement**: Individual UI component with type, props, children, visibility, event bindings, and repeat logic.

**Spec**: Complete element tree structure containing root element key, flat element map, and optional initial state.

**ActionBinding**: Event handler configuration with action name, parameters, confirmation dialogs, and success/error handlers.

**ValidationSchema**: Validation checks with configurable trigger points (change, blur, submit).
