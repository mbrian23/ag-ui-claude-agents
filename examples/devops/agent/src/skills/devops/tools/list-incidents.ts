import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { findService, getDataset, withinRange, type RangeKey } from "../../../data/store.js";

const RANGES = ["7d", "14d", "30d", "60d"] as const;

export const listIncidentsTool = tool(
  "list_incidents",
  "List incidents, optionally filtered by status, severity, service, or time range. Returns id, service, severity, status, opened/resolved timestamps, MTTR, and title.",
  {
    status: z.enum(["open", "mitigated", "resolved"]).optional().describe("Filter by incident status"),
    severity: z.enum(["sev1", "sev2", "sev3", "sev4"]).optional().describe("Filter by severity"),
    service: z.string().optional().describe("Filter by service id or name"),
    range: z.enum(RANGES).optional().describe("Time window relative to now"),
  },
  async (args) => {
    const { incidents, services } = getDataset();
    const svc = args.service ? findService(args.service) : undefined;
    const range = args.range as RangeKey | undefined;

    const rows = incidents
      .filter((i) => (args.status ? i.status === args.status : true))
      .filter((i) => (args.severity ? i.severity === args.severity : true))
      .filter((i) => (svc ? i.serviceId === svc.id : true))
      .filter((i) => (range ? withinRange(i.openedAt, range) : true))
      .map((i) => {
        const service = services.find((s) => s.id === i.serviceId)!;
        return {
          id: i.id,
          service: service.name,
          team: service.team,
          severity: i.severity,
          status: i.status,
          openedAt: i.openedAt,
          resolvedAt: i.resolvedAt,
          mttrMinutes: i.mttrMinutes,
          title: i.title,
        };
      })
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ count: rows.length, incidents: rows }) }],
    };
  }
);
