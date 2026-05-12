# agent-server

Generic AG-UI HTTP/SSE server backed by the Claude Agent SDK. Compose a list of **skills** (MCP tools + system-prompt fragment + bash whitelist + required env) and get a working agent endpoint.

## What's in here

| Export | Purpose |
|---|---|
| `createAgentServer(opts)` | Returns `{ server, handler, adapter, route, port }`. `server.listen(port)` starts the HTTP listener; `handler` is the bare `RequestListener` if you want to mount it in your own server. |
| `defineSkill({...})` | Typed factory for a `Skill`. |
| `Skill`, `SkillTools` | Structural types. |
| `tool`, `createSdkMcpServer` | Re-exports from `@anthropic-ai/claude-agent-sdk` so consumers don't need that package as a direct dep. |

## Minimal example

```ts
import { createAgentServer, defineSkill, tool } from "agent-server";
import { z } from "zod";

const helloSkill = defineSkill({
  name: "hello",
  mcpTools: [
    tool(
      "say_hi",
      "Greet someone by name",
      { name: z.string() },
      async ({ name }) => ({
        content: [{ type: "text" as const, text: `Hello, ${name}!` }],
      })
    ),
  ],
  systemPromptFragment:
    "When asked to greet, call `say_hi` and then render a `kpi_tile` with the result.",
});

const { server, port } = createAgentServer({
  agentId: "hello_agent",
  model: "claude-sonnet-4-6",
  baseSystemPrompt: "You are a friendly assistant.",
  mcpName: "hello",   // exposes tools as mcp__hello__say_hi
  skills: [helloSkill],
  route: "hello",     // POST /hello
});

server.listen(port, () => console.log(`listening on ${port}`));
```

The endpoint is now AG-UI-compatible at `POST /hello`. Health check at `GET /health`.

## What a skill bundles

```ts
interface Skill {
  name: string;
  description?: string;
  mcpTools?: SkillTools;            // tools created via tool() — auto-namespaced
  systemPromptFragment?: string;    // joined onto baseSystemPrompt with \n\n
  allowedBashPrefixes?: string[];   // e.g. ["gh "] — see Bash whitelist below
  requiredEnv?: string[];           // throws on createAgentServer if unset
  optionalEnv?: string[];           // warns on console if unset
}
```

When `createAgentServer` composes multiple skills:

- Tool names are deduplicated; a collision across skills throws with a clear message.
- All `systemPromptFragment`s are appended to `baseSystemPrompt` in skill order.
- All `allowedBashPrefixes` are unioned.
- Missing `requiredEnv` is fatal at startup; missing `optionalEnv` is a warning.

Skill `systemPromptFragment`s should refer to tools by their **bare name** (`say_hi`), not the namespaced form (`mcp__hello__say_hi`). The namespace depends on the host server's `mcpName`, and a skill that hard-codes it stops being portable.

## Bash whitelist (`allowedBashPrefixes`)

By default `agent-server` adds `Bash` to `disallowedTools` alongside `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `TodoWrite`, and the AG-UI state-sync tool. The model can't shell out.

If any skill declares `allowedBashPrefixes`, `Bash` moves to the allowed list and a `canUseTool` callback gates each invocation against the union of every skill's prefixes:

```ts
defineSkill({
  name: "github",
  allowedBashPrefixes: ["gh "],
  requiredEnv: ["GITHUB_TOKEN"],
  // ...
});
```

Now `Bash("gh repo view")` is allowed, but `Bash("ls /")` returns `{ behavior: "deny", message: "Bash command not on the skill whitelist..." }` before reaching the shell.

Most data-fetch skills don't need this — they wrap `execFile` inside an MCP tool and never expose Bash to the model.

## `createAgentServer` options

| Option | Default | Notes |
|---|---|---|
| `agentId` | — | Required. Echoed in AG-UI events. |
| `model` | — | Required. e.g. `"claude-sonnet-4-6"`. |
| `baseSystemPrompt` | — | Required. Prepended before all skill fragments. |
| `mcpName` | `"tools"` | MCP namespace prefix: tools appear as `mcp__<mcpName>__<tool>`. |
| `skills` | `[]` | List of `Skill`s to compose. |
| `route` | `"agent"` | POST path. |
| `port` | `8020` or `PORT` | Listen port. |
| `allowedOrigins` | `["http://localhost:3000"]` | CORS allowlist. `"*"` opens it. |
| `frontendToolNames` | `["render_widget", "export_pdf"]` | Frontend tools allowed back in (declared by the client). |
| `description` | — | Adapter description (mostly informational). |
| `debug` | `AG_UI_DEBUG` env | Logs inbound `RunAgentInput` summaries. |

## Caveats

- The Claude Agent SDK halts after every frontend tool call. The client (e.g. `agent-react`'s `<ChatShell>`) is responsible for feeding back a `ToolMessage` and re-calling `runAgent` to continue the turn.
- `canUseTool` is only installed when at least one skill declares bash prefixes — otherwise the SDK uses the default permission flow with `permissionMode: "default"` and the `Bash` disallow.
- Skill `systemPromptFragment`s are concatenated without per-skill section headers; in a multi-skill setup the model sees a flat blob. This is fine for 1–2 skills; consider adding `## ${skill.name}` headers in your fragments if you stack more.
