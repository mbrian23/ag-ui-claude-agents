import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { getDataset, withinRange, type RangeKey } from "../../../data/store.js";

const RANGES = ["7d", "14d", "30d", "60d"] as const;

export const summarizePeriodTool = tool(
  "summarize_period",
  "Compute headline KPIs for a rolling time window: total deploys, deploy success rate, total incidents, open incidents, mean MTTR, merged PRs, mean PR cycle time, CI pass rate.",
  {
    range: z.enum(RANGES).default("30d").describe("Time window relative to now"),
  },
  async (args) => {
    const ds = getDataset();
    const range = args.range as RangeKey;

    const deploys = ds.deploys.filter((d) => withinRange(d.ts, range));
    const incidents = ds.incidents.filter((i) => withinRange(i.openedAt, range));
    const prs = ds.pullRequests.filter((p) => withinRange(p.openedAt, range));
    const ci = ds.ciRuns.filter((c) => withinRange(c.ts, range));

    const successfulDeploys = deploys.filter((d) => d.status === "succeeded").length;
    const openIncidents = ds.incidents.filter((i) => i.status === "open").length;
    const resolvedIncidents = incidents.filter((i) => typeof i.mttrMinutes === "number");
    const meanMttr = resolvedIncidents.length
      ? Math.round(resolvedIncidents.reduce((s, i) => s + (i.mttrMinutes ?? 0), 0) / resolvedIncidents.length)
      : 0;
    const mergedPrs = prs.filter((p) => p.status === "merged" && typeof p.cycleTimeHours === "number");
    const meanCycleHours = mergedPrs.length
      ? Math.round((mergedPrs.reduce((s, p) => s + (p.cycleTimeHours ?? 0), 0) / mergedPrs.length) * 10) /
        10
      : 0;
    const passingCi = ci.filter((c) => c.status === "passed").length;

    const summary = {
      range,
      deploys: {
        total: deploys.length,
        successRatePercent: deploys.length
          ? Math.round((successfulDeploys / deploys.length) * 1000) / 10
          : 0,
      },
      incidents: {
        totalInRange: incidents.length,
        openNow: openIncidents,
        meanMttrMinutes: meanMttr,
      },
      pullRequests: {
        merged: mergedPrs.length,
        meanCycleTimeHours: meanCycleHours,
      },
      ci: {
        runs: ci.length,
        passRatePercent: ci.length ? Math.round((passingCi / ci.length) * 1000) / 10 : 0,
      },
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(summary) }],
    };
  }
);
