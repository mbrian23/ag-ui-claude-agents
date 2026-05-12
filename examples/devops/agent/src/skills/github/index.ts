import { defineSkill, tool } from "agent-server";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `gh` reads GH_TOKEN/GITHUB_TOKEN from the environment automatically;
// requiredEnv guarantees the server refuses to start without it.
const listPullRequestsTool = tool(
  "github_list_pull_requests",
  [
    "List recent pull requests in a GitHub repository via the `gh` CLI.",
    "Returns merged, open, and closed PRs depending on `state`.",
  ].join("\n"),
  {
    repo: z.string().describe("owner/name, e.g. anthropics/claude-code"),
    state: z.enum(["open", "closed", "merged", "all"]).default("open"),
    limit: z.number().int().min(1).max(50).default(10),
  },
  async (args) => {
    try {
      const { stdout } = await execFileAsync(
        "gh",
        [
          "pr",
          "list",
          "--repo",
          args.repo,
          "--state",
          args.state,
          "--limit",
          String(args.limit),
          "--json",
          "number,title,state,author,createdAt,mergedAt,url",
        ],
        { env: process.env, timeout: 15_000 }
      );
      return {
        content: [{ type: "text" as const, text: stdout.trim() || "[]" }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          { type: "text" as const, text: `gh pr list failed: ${message}` },
        ],
        isError: true,
      };
    }
  }
);

export const githubSkill = defineSkill({
  name: "github",
  description: "GitHub data access via the `gh` CLI.",
  mcpTools: [listPullRequestsTool],
  systemPromptFragment: [
    "You can fetch GitHub data through the `github_list_pull_requests` tool.",
    "Always render the list as a `table` widget when asked to show PRs; use columns like number, title, state, author.",
  ].join("\n"),
  requiredEnv: ["GITHUB_TOKEN"],
});
