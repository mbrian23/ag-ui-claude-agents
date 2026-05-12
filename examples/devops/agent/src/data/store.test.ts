import { describe, expect, it } from "vitest";
import { buildDataset } from "./seed.js";
import { dayKey, findService, getDataset, rangeStartMs, weekKey, withinRange } from "./store.js";

const SEED_TS = new Date("2026-05-09T12:00:00Z").getTime();

describe("buildDataset (seed=42)", () => {
  it("produces the documented record counts", () => {
    const ds = buildDataset();
    expect(ds.services).toHaveLength(10);
    expect(ds.deploys).toHaveLength(600);
    expect(ds.incidents).toHaveLength(32);
    expect(ds.pullRequests).toHaveLength(240);
    expect(ds.ciRuns).toHaveLength(1200);
  });

  it("is deterministic across rebuilds", () => {
    const a = buildDataset();
    const b = buildDataset();
    expect(a.services.map((s) => s.id)).toEqual(b.services.map((s) => s.id));
    expect(a.deploys[0]).toEqual(b.deploys[0]);
    expect(a.incidents.map((i) => i.id)).toEqual(b.incidents.map((i) => i.id));
    expect(a.pullRequests.at(-1)).toEqual(b.pullRequests.at(-1));
  });

  it("ships a known service catalog", () => {
    const ds = buildDataset();
    const names = ds.services.map((s) => s.name).sort();
    expect(names).toEqual(
      [
        "admin-dashboard",
        "analytics-pipe",
        "auth-service",
        "billing-worker",
        "checkout-api",
        "feature-flags",
        "notifications",
        "recommendations",
        "search-indexer",
        "user-profile",
      ].sort()
    );
  });

  it("links every record to a real service id", () => {
    const ds = buildDataset();
    const ids = new Set(ds.services.map((s) => s.id));
    for (const d of ds.deploys) expect(ids.has(d.serviceId)).toBe(true);
    for (const i of ds.incidents) expect(ids.has(i.serviceId)).toBe(true);
    for (const p of ds.pullRequests) expect(ids.has(p.serviceId)).toBe(true);
    for (const r of ds.ciRuns) expect(ids.has(r.serviceId)).toBe(true);
  });

  it("keeps every event within the 60-day history window", () => {
    const ds = buildDataset();
    const earliest = SEED_TS - 60 * 24 * 60 * 60 * 1000;
    const latest = SEED_TS + 24 * 60 * 60 * 1000; // jitter pushes some events forward
    for (const d of ds.deploys) {
      const t = new Date(d.ts).getTime();
      expect(t).toBeGreaterThanOrEqual(earliest);
      expect(t).toBeLessThanOrEqual(latest);
    }
  });

  it("only assigns valid statuses + severities", () => {
    const ds = buildDataset();
    const deployStatuses = new Set(ds.deploys.map((d) => d.status));
    expect([...deployStatuses].every((s) => ["succeeded", "failed", "rolled_back"].includes(s))).toBe(
      true
    );
    const sevs = new Set(ds.incidents.map((i) => i.severity));
    expect([...sevs].every((s) => ["sev1", "sev2", "sev3", "sev4"].includes(s))).toBe(true);
    const incStatuses = new Set(ds.incidents.map((i) => i.status));
    expect([...incStatuses].every((s) => ["open", "mitigated", "resolved"].includes(s))).toBe(true);
  });

  it("exposes resolvedAt iff status !== open", () => {
    const ds = buildDataset();
    for (const i of ds.incidents) {
      if (i.status === "open") {
        expect(i.resolvedAt).toBeUndefined();
      } else {
        expect(typeof i.resolvedAt).toBe("string");
      }
    }
  });
});

describe("rangeStartMs / withinRange", () => {
  it("computes start ms from the fixed NOW anchor", () => {
    expect(rangeStartMs("7d")).toBe(SEED_TS - 7 * 24 * 60 * 60 * 1000);
    expect(rangeStartMs("30d")).toBe(SEED_TS - 30 * 24 * 60 * 60 * 1000);
  });

  it("includes events at the boundary", () => {
    const justInside = new Date(SEED_TS - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(withinRange(justInside, "7d")).toBe(true);
  });

  it("excludes events past the boundary", () => {
    const justOutside = new Date(SEED_TS - 7 * 24 * 60 * 60 * 1000 - 1).toISOString();
    expect(withinRange(justOutside, "7d")).toBe(false);
  });

  it("filters real records correctly across ranges", () => {
    const ds = getDataset();
    const in7 = ds.deploys.filter((d) => withinRange(d.ts, "7d"));
    const in30 = ds.deploys.filter((d) => withinRange(d.ts, "30d"));
    const in60 = ds.deploys.filter((d) => withinRange(d.ts, "60d"));
    expect(in7.length).toBeLessThanOrEqual(in30.length);
    expect(in30.length).toBeLessThanOrEqual(in60.length);
    // 60d covers the full history window. A handful of events have positive
    // jitter that pushes them slightly past NOW; allow up to 1% to fall out.
    expect(in60.length).toBeGreaterThanOrEqual(ds.deploys.length * 0.99);
  });
});

describe("findService", () => {
  it("finds by id and by name", () => {
    expect(findService("svc_1")?.name).toBe("checkout-api");
    expect(findService("checkout-api")?.id).toBe("svc_1");
  });

  it("returns undefined for unknown ids", () => {
    expect(findService("does-not-exist")).toBeUndefined();
  });
});

describe("dayKey / weekKey", () => {
  it("dayKey returns YYYY-MM-DD slice of the ISO string", () => {
    expect(dayKey("2026-05-09T12:00:00Z")).toBe("2026-05-09");
  });

  it("weekKey snaps to the preceding Monday", () => {
    // 2026-05-09 is a Saturday → preceding Monday is 2026-05-04.
    expect(weekKey("2026-05-09T12:00:00Z")).toBe("2026-05-04");
    expect(weekKey("2026-05-04T00:00:00Z")).toBe("2026-05-04");
  });
});
