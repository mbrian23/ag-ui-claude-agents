import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk";
import {
  createSdkMcpServer,
  type CanUseTool,
  type SdkMcpToolDefinition,
} from "@anthropic-ai/claude-agent-sdk";
import { EXPORT_PDF_TOOL_NAME, RENDER_WIDGET_TOOL_NAME } from "agent-core";
import type { Skill } from "./skill";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = SdkMcpToolDefinition<any>;

const ALWAYS_DISALLOWED = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  // AG-UI's bundled state-sync tool — agents in this framework use the
  // frontend `render_widget` tool for UI, not a shared dashboard canvas.
  "mcp__ag_ui__ag_ui_update_state",
] as const;

export interface CreateAdapterOptions {
  agentId: string;
  description?: string;
  model: string;
  baseSystemPrompt: string;
  skills: readonly Skill[];
  /** MCP server name; mcp__<name>__<tool> is the Claude-side tool prefix. Default: "tools". */
  mcpName?: string;
  /** Frontend tools the chat client will declare back. Default: ["render_widget", "export_pdf"]. */
  frontendToolNames?: readonly string[];
}

interface ComposedSkills {
  systemPrompt: string;
  mcpTools: AnyTool[];
  allowedTools: string[];
  bashPrefixes: string[];
  missingRequiredEnv: string[];
  missingOptionalEnv: string[];
}

function composeSkills(
  baseSystemPrompt: string,
  mcpName: string,
  frontendToolNames: readonly string[],
  skills: readonly Skill[]
): ComposedSkills {
  const seenToolNames = new Set<string>();
  const mcpTools: AnyTool[] = [];
  const promptParts: string[] = [baseSystemPrompt];
  const bashPrefixes = new Set<string>();
  const missingRequiredEnv: string[] = [];
  const missingOptionalEnv: string[] = [];

  for (const skill of skills) {
    for (const tool of skill.mcpTools ?? []) {
      const name = (tool as { name?: string }).name ?? "";
      if (seenToolNames.has(name)) {
        throw new Error(
          `agent-server: tool name collision across skills — '${name}' is registered by more than one skill.`
        );
      }
      seenToolNames.add(name);
      mcpTools.push(tool);
    }
    if (skill.systemPromptFragment) promptParts.push(skill.systemPromptFragment);
    for (const prefix of skill.allowedBashPrefixes ?? []) bashPrefixes.add(prefix);
    for (const key of skill.requiredEnv ?? []) {
      if (!process.env[key]) missingRequiredEnv.push(`${skill.name}: ${key}`);
    }
    for (const key of skill.optionalEnv ?? []) {
      if (!process.env[key]) missingOptionalEnv.push(`${skill.name}: ${key}`);
    }
  }

  const mcpToolNames = [...seenToolNames].map((n) => `mcp__${mcpName}__${n}`);
  const allowedTools = [...mcpToolNames, ...frontendToolNames];
  if (bashPrefixes.size > 0) allowedTools.push("Bash");

  return {
    systemPrompt: promptParts.join("\n\n"),
    mcpTools,
    allowedTools,
    bashPrefixes: [...bashPrefixes],
    missingRequiredEnv,
    missingOptionalEnv,
  };
}

/** Exported for unit tests; consumers should not call this directly. */
export function makeBashGuard(allowedPrefixes: readonly string[]): CanUseTool {
  return async (toolName, input) => {
    if (toolName !== "Bash") {
      return { behavior: "allow", updatedInput: input };
    }
    const command = typeof input.command === "string" ? input.command : "";
    if (!command) {
      return { behavior: "deny", message: "Bash invocation missing `command`." };
    }
    const matched = allowedPrefixes.some((prefix) => command.startsWith(prefix));
    if (!matched) {
      return {
        behavior: "deny",
        message: `Bash command not on the skill whitelist. Allowed prefixes: ${allowedPrefixes.join(", ")}`,
      };
    }
    return { behavior: "allow", updatedInput: input };
  };
}

export function createAdapterFromSkills(opts: CreateAdapterOptions): ClaudeAgentAdapter {
  const mcpName = opts.mcpName ?? "tools";
  const frontendToolNames = opts.frontendToolNames ?? [
    RENDER_WIDGET_TOOL_NAME,
    EXPORT_PDF_TOOL_NAME,
  ];

  const composed = composeSkills(opts.baseSystemPrompt, mcpName, frontendToolNames, opts.skills);

  if (composed.missingRequiredEnv.length > 0) {
    throw new Error(
      `agent-server: required environment variables not set:\n  - ${composed.missingRequiredEnv.join("\n  - ")}`
    );
  }
  for (const missing of composed.missingOptionalEnv) {
    console.warn(`[agent-server] optional env not set: ${missing}`);
  }

  const mcpServer = createSdkMcpServer({
    name: mcpName,
    version: "1.0.0",
    tools: composed.mcpTools,
  });

  const disallowedTools: string[] = [...ALWAYS_DISALLOWED];
  if (composed.bashPrefixes.length === 0) disallowedTools.push("Bash");

  return new ClaudeAgentAdapter({
    agentId: opts.agentId,
    description: opts.description,
    model: opts.model,
    systemPrompt: composed.systemPrompt,
    mcpServers: { [mcpName]: mcpServer },
    allowedTools: composed.allowedTools,
    disallowedTools,
    permissionMode: "default",
    includePartialMessages: true,
    canUseTool:
      composed.bashPrefixes.length > 0 ? makeBashGuard(composed.bashPrefixes) : undefined,
  });
}
