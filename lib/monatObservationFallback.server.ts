import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { NATIONAL_FLEET_MONTH_KEY } from "@/lib/nationalMonthFleetModel";

export type MonatObservationFallback = {
  monthKey: string;
  records: TagesKennzahlRecord[];
  /** Fixed reference stand for committed observation snapshot (not live today). */
  dataStandLabel: string;
  snapshotAsOf: string;
  sourceNoteDe: string;
  inputPowerSha256?: string;
};

const FALLBACK_FILES: Record<string, string> = {
  "2026-10": "data/month-observation/2026-10-auffaelligkeit.json",
};

export function monatObservationFallbackAvailable(monthKey: string): boolean {
  return monthKey in FALLBACK_FILES;
}

export function loadMonatObservationFallback(monthKey: string): MonatObservationFallback | null {
  const rel = FALLBACK_FILES[monthKey];
  if (!rel) {
    return null;
  }
  const path = join(process.cwd(), rel);
  const raw = JSON.parse(readFileSync(path, "utf8")) as MonatObservationFallback;
  if (raw.monthKey !== monthKey) {
    throw new Error(`Beobachtungs-Snapshot Monat mismatch ${raw.monthKey} vs ${monthKey}`);
  }
  return raw;
}

export function fleetMonthPreferredObservation(monthKey: string): boolean {
  return monthKey === NATIONAL_FLEET_MONTH_KEY;
}
