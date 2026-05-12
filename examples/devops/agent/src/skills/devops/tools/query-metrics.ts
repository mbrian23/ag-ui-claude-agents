import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import {
  dayKey,
  findService,
  getDataset,
  weekKey,
  withinRange,
  type RangeKey,
} from "../../../data/store.js";

const METRICS = [
  "deploy_frequency",
  "deploy_failure_rate",
  "mttr",
  "incident_count",
  "pr_cycle_time",
  "pr_throughput",
  "ci_pass_rate",
] as const;

const GROUP_BYS = ["service", "team", "tier", "day", "week", "severity"] as const;
const RANGES = ["7d", "14d", "30d", "60d"] as const;

type GroupBy = (typeof GROUP_BYS)[number];
type Metric = (typeof METRICS)[number];

interface Row {
  key: string;
  value: number;
}

export const queryMetricsTool = tool(
  "query_metrics",
  [
    "Query a single DevOps metric with optional grouping and time range. Returns aggregated rows.",
    "Metrics:",
    "- deploy_frequency: count of deploys",
    "- deploy_failure_rate: % of deploys with status failed or rolled_back",
    "- mttr: mean time to resolve (minutes), only resolved/mitigated incidents",
    "- incident_count: count of incidents",
    "- pr_cycle_time: mean cycle time hours of merged PRs",
    "- pr_throughput: count of merged PRs",
    "- ci_pass_rate: % of CI runs with status passed",
  ].join("\n"),
  {
    metric: z.enum(METRICS).describe("Which metric to compute"),
    groupBy: z.enum(GROUP_BYS).optional().describe("Optional grouping key"),
    range: z.enum(RANGES).default("30d").describe("Time window relative to now (default 30d)"),
    service: z.string().optional().describe("Optional service id or name filter"),
    team: z.string().optional().describe("Optional team filter"),
  },
  async (args) => {
    const ds = getDataset();
    const range = args.range as RangeKey;
    const svc = args.service ? findService(args.service) : undefined;
    const teamFilter = args.team;
    const metric = args.metric as Metric;
    const groupBy = args.groupBy as GroupBy | undefined;

    const serviceById = new Map(ds.services.map((s) => [s.id, s]));

    const inFilter = (serviceId: string) => {
      const s = serviceById.get(serviceId);
      if (!s) return false;
      if (svc && s.id !== svc.id) return false;
      if (teamFilter && s.team !== teamFilter) return false;
      return true;
    };

    const groupKey = (serviceId: string, ts?: string, severity?: string): string => {
      const s = serviceById.get(serviceId)!;
      switch (groupBy) {
        case "service":
          return s.name;
        case "team":
          return s.team;
        case "tier":
          return s.tier;
        case "day":
          return ts ? dayKey(ts) : "unknown";
        case "week":
          return ts ? weekKey(ts) : "unknown";
        case "severity":
          return severity ?? "unknown";
        default:
          return "all";
      }
    };

    const buckets = new Map<string, { sum: number; count: number; matches: number }>();
    const bump = (key: string, value: number, isMatch = true) => {
      const b = buckets.get(key) ?? { sum: 0, count: 0, matches: 0 };
      b.sum += value;
      b.count += 1;
      if (isMatch) b.matches += 1;
      buckets.set(key, b);
    };

    switch (metric) {
      case "deploy_frequency": {
        for (const d of ds.deploys) {
          if (!inFilter(d.serviceId) || !withinRange(d.ts, range)) continue;
          bump(groupKey(d.serviceId, d.ts), 1);
        }
        break;
      }
      case "deploy_failure_rate": {
        for (const d of ds.deploys) {
          if (!inFilter(d.serviceId) || !withinRange(d.ts, range)) continue;
          const fail = d.status === "failed" || d.status === "rolled_back";
          bump(groupKey(d.serviceId, d.ts), 0, fail);
        }
        break;
      }
      case "mttr": {
        for (const i of ds.incidents) {
          if (!inFilter(i.serviceId) || !withinRange(i.openedAt, range)) continue;
          if (typeof i.mttrMinutes !== "number") continue;
          bump(groupKey(i.serviceId, i.openedAt, i.severity), i.mttrMinutes);
        }
        break;
      }
      case "incident_count": {
        for (const i of ds.incidents) {
          if (!inFilter(i.serviceId) || !withinRange(i.openedAt, range)) continue;
          bump(groupKey(i.serviceId, i.openedAt, i.severity), 1);
        }
        break;
      }
      case "pr_cycle_time": {
        for (const pr of ds.pullRequests) {
          if (!inFilter(pr.serviceId) || !withinRange(pr.openedAt, range)) continue;
          if (pr.status !== "merged" || typeof pr.cycleTimeHours !== "number") continue;
          bump(groupKey(pr.serviceId, pr.openedAt), pr.cycleTimeHours);
        }
        break;
      }
      case "pr_throughput": {
        for (const pr of ds.pullRequests) {
          if (!inFilter(pr.serviceId) || !withinRange(pr.openedAt, range)) continue;
          if (pr.status !== "merged") continue;
          bump(groupKey(pr.serviceId, pr.mergedAt ?? pr.openedAt), 1);
        }
        break;
      }
      case "ci_pass_rate": {
        for (const c of ds.ciRuns) {
          if (!inFilter(c.serviceId) || !withinRange(c.ts, range)) continue;
          bump(groupKey(c.serviceId, c.ts), 0, c.status === "passed");
        }
        break;
      }
    }

    let units: string;
    let rows: Row[];

    switch (metric) {
      case "deploy_frequency":
      case "incident_count":
      case "pr_throughput":
        units = "count";
        rows = [...buckets.entries()].map(([key, b]) => ({ key, value: b.count }));
        break;
      case "mttr":
        units = "minutes";
        rows = [...buckets.entries()].map(([key, b]) => ({
          key,
          value: b.count ? Math.round(b.sum / b.count) : 0,
        }));
        break;
      case "pr_cycle_time":
        units = "hours";
        rows = [...buckets.entries()].map(([key, b]) => ({
          key,
          value: b.count ? Math.round((b.sum / b.count) * 10) / 10 : 0,
        }));
        break;
      case "deploy_failure_rate":
      case "ci_pass_rate":
        units = "percent";
        rows = [...buckets.entries()].map(([key, b]) => ({
          key,
          value: b.count ? Math.round((b.matches / b.count) * 1000) / 10 : 0,
        }));
        break;
    }

    if (groupBy === "day" || groupBy === "week") {
      rows.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      rows.sort((a, b) => b.value - a.value);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ metric, groupBy: groupBy ?? "none", range, units, rows }),
        },
      ],
    };
  }
);
