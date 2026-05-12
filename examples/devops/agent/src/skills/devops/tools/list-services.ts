import { tool } from "@anthropic-ai/claude-agent-sdk";
import { getDataset } from "../../../data/store.js";

export const listServicesTool = tool(
  "list_services",
  "List the company's services with team, tier, language, and repo. Use to ground answers about who owns what or to filter other queries.",
  {},
  async () => {
    const { services } = getDataset();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ services }) }],
    };
  }
);
