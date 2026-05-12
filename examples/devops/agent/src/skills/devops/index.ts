import { defineSkill } from "agent-server";
import { listIncidentsTool } from "./tools/list-incidents.js";
import { listServicesTool } from "./tools/list-services.js";
import { queryMetricsTool } from "./tools/query-metrics.js";
import { summarizePeriodTool } from "./tools/summarize-period.js";
import { DEVOPS_PROMPT } from "./prompt.js";

export const devopsSkill = defineSkill({
  name: "devops",
  description: "DevOps analyst: deploys, PRs, incidents, services, CI runs.",
  mcpTools: [listServicesTool, listIncidentsTool, queryMetricsTool, summarizePeriodTool],
  systemPromptFragment: DEVOPS_PROMPT,
});
