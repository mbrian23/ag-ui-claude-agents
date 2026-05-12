import { dataset } from "./seed.js";
import type { Dataset, Service } from "./types.js";

export type RangeKey = "7d" | "14d" | "30d" | "60d";

const NOW_MS = new Date("2026-05-09T12:00:00Z").getTime();

export function rangeStartMs(range: RangeKey): number {
  const days = parseInt(range, 10);
  return NOW_MS - days * 24 * 60 * 60 * 1000;
}

export function withinRange(iso: string, range: RangeKey): boolean {
  const t = new Date(iso).getTime();
  return t >= rangeStartMs(range) && t <= NOW_MS;
}

export function getDataset(): Dataset {
  return dataset;
}

export function findService(idOrName: string): Service | undefined {
  return dataset.services.find((s) => s.id === idOrName || s.name === idOrName);
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}
