import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isAuffaelligkeitWocheTag,
  wocheZeitreiheToFleetRun,
  type AuffaelligkeitWocheTag,
} from "@/lib/auffaelligkeitWoche";
import type { NationalFleetRunSeries, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

export function auffaelligkeitWocheAbsPath(dayKey: string): string {
  return join(process.cwd(), "data", "auffaelligkeit-woche", "tage", `${dayKey}.json`);
}

export function auffaelligkeitWocheAvailable(dayKey: string): boolean {
  return existsSync(auffaelligkeitWocheAbsPath(dayKey));
}

export function loadAuffaelligkeitWocheTag(dayKey: string): AuffaelligkeitWocheTag | null {
  const path = auffaelligkeitWocheAbsPath(dayKey);
  if (!existsSync(path)) {
    return null;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!isAuffaelligkeitWocheTag(raw) || raw.dateBerlin !== dayKey) {
    return null;
  }
  return raw;
}

export function loadWocheFleetRunSeries(
  dayKey: string,
  strategy: NationalFleetStrategyUi,
): NationalFleetRunSeries | null {
  const path = auffaelligkeitWocheAbsPath(dayKey);
  const doc = loadAuffaelligkeitWocheTag(dayKey);
  if (!doc) {
    return null;
  }
  const sha = createHash("sha256").update(readFileSync(path)).digest("hex");
  return wocheZeitreiheToFleetRun(doc, strategy, sha);
}
