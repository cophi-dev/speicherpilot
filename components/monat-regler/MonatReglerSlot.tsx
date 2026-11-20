import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { MonatReglerGate } from "@/components/monat-regler/MonatReglerGate.client";
import { parseMonatReglerCompact, type MonatReglerCompact } from "@/lib/monatReglerAsset";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";
import type { NationalFleetFactor, NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";

function loadInitialCompact(monthKey: string): MonatReglerCompact | null {
  try {
    const compactPath = join(process.cwd(), "data/national-fleet", monthKey, "fleet-month-compact.json");
    if (!existsSync(compactPath)) return null;
    return parseMonatReglerCompact(JSON.parse(readFileSync(compactPath, "utf8")));
  } catch {
    return null;
  }
}

export function MonatReglerSlot({
  monthKey,
  factor,
  strategy,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
}) {
  const meta = loadNationalFleetBundleMeta(monthKey);
  const initialCompact = loadInitialCompact(monthKey);
  return (
    <MonatReglerGate
      monthKey={monthKey}
      factor={factor}
      strategy={strategy}
      kpiSource={{ summary: meta.summary, provenance: meta.provenance }}
      initialCompact={initialCompact}
    />
  );
}