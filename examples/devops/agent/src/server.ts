import { createAgentServer, type Skill } from "agent-server";
import { devopsSkill } from "./skills/devops/index.js";
import { githubSkill } from "./skills/github/index.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const BASE_SYSTEM_PROMPT =
  "You are a helpful assistant. Render every visual answer through the `render_widget` frontend tool, never invent data, and use only component types from the catalog the client sends each turn.";

function main(): void {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "Error: set ANTHROPIC_API_KEY (native Anthropic) or ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL (OpenRouter / proxy) in the workspace .env."
    );
    process.exit(1);
  }

  const model = process.env.MODEL?.trim() || DEFAULT_MODEL;
  if (process.env.ANTHROPIC_BASE_URL) {
    console.log(`[agent] using custom ANTHROPIC_BASE_URL=${process.env.ANTHROPIC_BASE_URL}`);
  }
  console.log(`[agent] model=${model}`);

  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // GITHUB_TOKEN is the github skill's required env. Loading it
  // unconditionally would force every demo run to set the token, so we
  // gate it here. Production setups should drop this branch and let
  // createAgentServer enforce the requirement.
  const skills: Skill[] = [devopsSkill];
  if (process.env.GITHUB_TOKEN) {
    skills.push(githubSkill);
    console.log("[agent] github skill enabled");
  }

  const { server, route, port } = createAgentServer({
    agentId: "devops_dashboard",
    description: "DevOps analyst with mock metrics and inline widget rendering",
    model,
    baseSystemPrompt: BASE_SYSTEM_PROMPT,
    mcpName: "devops",
    skills,
    route: "devops",
    allowedOrigins,
  });

  server.listen(port, "0.0.0.0", () => {
    const corsLabel = allowedOrigins.includes("*") ? "* (open)" : allowedOrigins.join(", ");
    console.log(`devops agent (AG-UI + Claude Agent SDK) listening on http://localhost:${port}`);
    console.log(`  POST http://localhost:${port}/${route}`);
    console.log(`  GET  http://localhost:${port}/health`);
    console.log(`  CORS: ${corsLabel}`);
  });
}

main();
