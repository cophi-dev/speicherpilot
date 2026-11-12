import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";

const DATA_PATH = join(process.cwd(), "data/national-fleet/2026-10/simulator-fahrweisen.json");

let cache: SimulatorFahrweisenData | null = null;

export function loadSimulatorFahrweisen(): SimulatorFahrweisenData {
  if (cache) return cache;
  const raw = readFileSync(DATA_PATH, "utf8");
  cache = JSON.parse(raw) as SimulatorFahrweisenData;
  return cache;
}
