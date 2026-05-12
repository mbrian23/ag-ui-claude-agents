import type { SdkMcpToolDefinition } from "@anthropic-ai/claude-agent-sdk";

// Each tool brings its own zod shape. Match the SDK's own internal
// signature (`Array<SdkMcpToolDefinition<any>>`) so heterogeneous tools
// pass through TS variance checks without per-tool casts at call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkillTools = ReadonlyArray<SdkMcpToolDefinition<any>>;

export interface Skill {
  readonly name: string;
  readonly description?: string;
  readonly mcpTools?: SkillTools;
  readonly systemPromptFragment?: string;
  /**
   * Bash command prefixes that are allowed when this skill is loaded.
   * Example: `["gh "]` lets the agent shell out to the GitHub CLI but
   * nothing else. If any skill in the bundle declares prefixes, Bash is
   * added to the allowed-tools list and a canUseTool callback enforces
   * the union of all skills' prefixes.
   */
  readonly allowedBashPrefixes?: readonly string[];
  readonly requiredEnv?: readonly string[];
  readonly optionalEnv?: readonly string[];
}

export function defineSkill(skill: Skill): Skill {
  return skill;
}
