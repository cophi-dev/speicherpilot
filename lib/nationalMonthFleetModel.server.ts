import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel";

let cachedBundle: NationalFleetMonthBundle | null = null;

export function loadNationalFleetMonthBundle(): NationalFleetMonthBundle {
  if (cachedBundle) {
    return cachedBundle;
  }
  const path = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-bundle.json");
  cachedBundle = JSON.parse(readFileSync(path, "utf8")) as NationalFleetMonthBundle;
  return cachedBundle;
}
