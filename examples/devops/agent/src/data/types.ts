export type ServiceTier = "tier_1" | "tier_2" | "tier_3";
export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type IncidentStatus = "open" | "mitigated" | "resolved";
export type DeployStatus = "succeeded" | "failed" | "rolled_back";
export type CIStatus = "passed" | "failed" | "cancelled";
export type PRStatus = "open" | "merged" | "closed";

export interface Service {
  id: string;
  name: string;
  team: string;
  tier: ServiceTier;
  language: string;
  repo: string;
}

export interface Deploy {
  id: string;
  serviceId: string;
  ts: string;
  status: DeployStatus;
  durationSec: number;
  author: string;
  prId?: string;
}

export interface Incident {
  id: string;
  serviceId: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  openedAt: string;
  resolvedAt?: string;
  title: string;
  mttrMinutes?: number;
}

export interface PullRequest {
  id: string;
  serviceId: string;
  author: string;
  openedAt: string;
  mergedAt?: string;
  status: PRStatus;
  cycleTimeHours?: number;
  additions: number;
  deletions: number;
}

export interface CIRun {
  id: string;
  serviceId: string;
  ts: string;
  status: CIStatus;
  durationSec: number;
  prId?: string;
}

export interface OnCallShift {
  id: string;
  team: string;
  engineer: string;
  startsAt: string;
  endsAt: string;
}

export interface Dataset {
  services: Service[];
  deploys: Deploy[];
  incidents: Incident[];
  pullRequests: PullRequest[];
  ciRuns: CIRun[];
  onCallShifts: OnCallShift[];
}
