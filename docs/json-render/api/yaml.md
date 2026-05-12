<!-- source: https://json-render.dev/docs/api/yaml -->
# @json-render/yaml

YAML wire format for json-render supporting progressive rendering and surgical edits via streaming YAML.

## Prompt Generation

### yamlPrompt

Generates a YAML-format system prompt from any json-render catalog compatible with any renderer.

```javascript
function yamlPrompt(
  catalog: Catalog,
  options?: YamlPromptOptions
): string
```

**YamlPromptOptions:**

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `system` | string | `"You are a UI generator that outputs YAML."` | Custom system message intro |
| `mode` | `"standalone" \| "inline"` | `"standalone"` | Standalone outputs YAML only; inline allows conversational responses with embedded YAML blocks |
| `customRules` | `string[]` | `[]` | Additional rules appended to prompt |
| `editModes` | `EditMode[]` | `["merge"]` | Edit modes to document (patch, merge, diff) |

## AI SDK Transform

### createYamlTransform

Creates a `TransformStream` intercepting AI SDK stream chunks and converting YAML spec/edit blocks into json-render patch data parts.

Recognized fence types:
- ` ```yaml-spec ` – Full YAML spec, parsed progressively
- ` ```yaml-edit ` – Partial YAML, deep-merged with current spec
- ` ```yaml-patch ` – RFC 6902 JSON Patch lines
- ` ```diff ` – Unified diff against serialized spec

### pipeYamlRender

Convenience wrapper piping an AI SDK stream through the YAML transform; drop-in replacement for `pipeJsonRender`.

## Streaming Parser

### createYamlStreamCompiler

Creates a streaming YAML compiler incrementally parsing YAML text and emitting JSON Patch operations by diffing against previous snapshots.

**YamlStreamCompiler methods:**

| Method | Returns | Purpose |
|--------|---------|---------|
| `push(chunk)` | `{ result: T; newPatches: JsonPatch[] }` | Push text chunk, returns current result and new patches |
| `flush()` | `{ result: T; newPatches: JsonPatch[] }` | Flush remaining buffer, return final result |
| `getResult()` | `T` | Get current compiled result |
| `getPatches()` | `JsonPatch[]` | Get all patches applied so far |
| `reset(initial?)` | `void` | Reset to initial state |

## Re-exports from @json-render/core

- **diffToPatches** – Generate RFC 6902 JSON Patch operations transforming one object to another
- **deepMergeSpec** – Deep-merge with RFC 7396 semantics where `null` deletes, arrays replace, and objects recurse
