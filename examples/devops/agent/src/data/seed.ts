import { faker } from "@faker-js/faker";
import type {
  CIRun,
  Dataset,
  Deploy,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  OnCallShift,
  PullRequest,
  Service,
  ServiceTier,
} from "./types.js";

const SERVICE_DEFS: Array<Pick<Service, "name" | "team" | "tier" | "language">> = [
  { name: "checkout-api", team: "payments", tier: "tier_1", language: "TypeScript" },
  { name: "billing-worker", team: "payments", tier: "tier_1", language: "Go" },
  { name: "auth-service", team: "platform", tier: "tier_1", language: "Rust" },
  { name: "user-profile", team: "platform", tier: "tier_2", language: "TypeScript" },
  { name: "search-indexer", team: "discovery", tier: "tier_2", language: "Python" },
  { name: "recommendations", team: "discovery", tier: "tier_2", language: "Python" },
  { name: "notifications", team: "growth", tier: "tier_3", language: "TypeScript" },
  { name: "analytics-pipe", team: "data", tier: "tier_2", language: "Scala" },
  { name: "feature-flags", team: "platform", tier: "tier_2", language: "Go" },
  { name: "admin-dashboard", team: "internal-tools", tier: "tier_3", language: "TypeScript" },
];

const TEAMS = Array.from(new Set(SERVICE_DEFS.map((s) => s.team)));
const NOW = new Date("2026-05-09T12:00:00Z");
const DAYS_OF_HISTORY = 60;

function isoDaysAgo(days: number, jitterHours = 24): string {
  const base = NOW.getTime() - days * 24 * 60 * 60 * 1000;
  const jitter = faker.number.int({ min: 0, max: jitterHours * 60 * 60 * 1000 });
  return new Date(base + jitter).toISOString();
}

function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0]![0];
}

export function buildDataset(): Dataset {
  faker.seed(42);

  const services: Service[] = SERVICE_DEFS.map((def, i) => ({
    id: `svc_${i + 1}`,
    name: def.name,
    team: def.team,
    tier: def.tier,
    language: def.language,
    repo: `acme/${def.name}`,
  }));

  const deploys: Deploy[] = [];
  for (let i = 0; i < 600; i++) {
    const service = faker.helpers.arrayElement(services);
    const failureRate = service.tier === "tier_1" ? 0.04 : service.tier === "tier_2" ? 0.08 : 0.12;
    const status = pickWeighted({
      succeeded: 1 - failureRate - 0.02,
      failed: failureRate,
      rolled_back: 0.02,
    });
    deploys.push({
      id: `dep_${i + 1}`,
      serviceId: service.id,
      ts: isoDaysAgo(faker.number.int({ min: 0, max: DAYS_OF_HISTORY - 1 })),
      status,
      durationSec: faker.number.int({ min: 60, max: 900 }),
      author: faker.internet.username().toLowerCase(),
    });
  }

  const incidents: Incident[] = [];
  for (let i = 0; i < 32; i++) {
    const service = faker.helpers.weightedArrayElement(
      services.map((s) => ({
        weight: s.tier === "tier_1" ? 5 : s.tier === "tier_2" ? 3 : 1,
        value: s,
      }))
    );
    const openedAt = isoDaysAgo(faker.number.int({ min: 0, max: DAYS_OF_HISTORY - 1 }));
    const severity = pickWeighted<IncidentSeverity>({
      sev1: 0.1,
      sev2: 0.25,
      sev3: 0.4,
      sev4: 0.25,
    });
    const status = pickWeighted<IncidentStatus>({
      resolved: 0.7,
      mitigated: 0.15,
      open: 0.15,
    });
    const mttrMinutes =
      status === "open"
        ? undefined
        : faker.number.int({
            min: severity === "sev1" ? 15 : 30,
            max: severity === "sev1" ? 240 : severity === "sev2" ? 480 : 1440,
          });
    incidents.push({
      id: `inc_${i + 1}`,
      serviceId: service.id,
      severity,
      status,
      openedAt,
      resolvedAt:
        status !== "open" && mttrMinutes
          ? new Date(new Date(openedAt).getTime() + mttrMinutes * 60_000).toISOString()
          : undefined,
      title: `${faker.hacker.adjective()} ${faker.hacker.noun()} in ${service.name}`,
      mttrMinutes,
    });
  }

  const pullRequests: PullRequest[] = [];
  for (let i = 0; i < 240; i++) {
    const service = faker.helpers.arrayElement(services);
    const openedAt = isoDaysAgo(faker.number.int({ min: 0, max: DAYS_OF_HISTORY - 1 }));
    const status = pickWeighted({ merged: 0.78, open: 0.15, closed: 0.07 });
    const cycleTimeHours =
      status === "merged" ? faker.number.float({ min: 1, max: 72, fractionDigits: 1 }) : undefined;
    pullRequests.push({
      id: `pr_${i + 1}`,
      serviceId: service.id,
      author: faker.internet.username().toLowerCase(),
      openedAt,
      status,
      mergedAt:
        status === "merged" && cycleTimeHours
          ? new Date(new Date(openedAt).getTime() + cycleTimeHours * 3600 * 1000).toISOString()
          : undefined,
      cycleTimeHours,
      additions: faker.number.int({ min: 5, max: 800 }),
      deletions: faker.number.int({ min: 0, max: 400 }),
    });
  }

  const ciRuns: CIRun[] = [];
  for (let i = 0; i < 1200; i++) {
    const service = faker.helpers.arrayElement(services);
    const status = pickWeighted({ passed: 0.86, failed: 0.11, cancelled: 0.03 });
    ciRuns.push({
      id: `ci_${i + 1}`,
      serviceId: service.id,
      ts: isoDaysAgo(faker.number.int({ min: 0, max: DAYS_OF_HISTORY - 1 })),
      status,
      durationSec: faker.number.int({ min: 30, max: 1800 }),
    });
  }

  const onCallShifts: OnCallShift[] = [];
  for (let i = 0; i < TEAMS.length * 4; i++) {
    const team = TEAMS[i % TEAMS.length]!;
    const start = new Date(NOW.getTime() - (i - 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    onCallShifts.push({
      id: `oncall_${i + 1}`,
      team,
      engineer: faker.internet.username().toLowerCase(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  }

  return { services, deploys, incidents, pullRequests, ciRuns, onCallShifts };
}

export const dataset: Dataset = buildDataset();
