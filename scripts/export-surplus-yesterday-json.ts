#!/usr/bin/env tsx
/**
 * Writes yesterday's surplus KPI JSON for manual cross-check.
 * Usage: pnpm tsx scripts/export-surplus-yesterday-json.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { getGermanyEnergyFlowForBerlinRange } from "@/lib/energyChartsApi";
import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { buildSurplusDayReport } from "@/lib/surplusDaySimulation";

/** Battery Charts large-storage fleet (21 Oct 2026), used when the script runs outside Next. */
const FALLBACK_FLEET = { powerMw: 4_500, energyMwh: 7_900 };

async function main() {
  const now = new Date();
  const yesterday = formatBerlinDateKeyFromUtcDate(new Date(now.getTime() - 86_400_000));
  const fleet = FALLBACK_FLEET;
  const flow = await getGermanyEnergyFlowForBerlinRange(
    resolveGermanyEnergyFlowBerlinRangeForDate(yesterday, now),
    now
  );
  const report = flow ? buildSurplusDayReport(flow, fleet) : null;

  const payload = {
    dateBerlin: yesterday,
    generatedAt: now.toISOString(),
    surplusGwh: report?.observed.renewableSurplusGwh ?? null,
    structuralSurplusGwh: report?.observed.structuralSurplusGwh ?? null,
    exportObservedGwh: report?.observed.observedExportGwh ?? null,
    curtailmentGwh: report?.observed.curtailmentGwh,
    curtailmentStatus: report?.observed.curtailmentStatus ?? null,
    factors: report
      ? {
          x1: pick(report, 1),
          x2: pick(report, 2),
          x5: pick(report, 5),
          x10: pick(report, 10),
        }
      : null,
  };

  const dir = path.join(process.cwd(), "artifacts");
  mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `surplus-yesterday-${yesterday}.json`);
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(target);
}

function pick(report: NonNullable<ReturnType<typeof buildSurplusDayReport>>, factor: 1 | 2 | 5 | 10) {
  const row = report.factors[factor];
  return {
    absorbedGwh: row.absorbedGwh,
    exportObservedGwh: row.observedExportGwh,
    exportSimulatedGwh: row.simulatedExportGwh,
    exportDeltaGwh: row.exportDeltaGwh,
    curtailmentRemainingGwh: row.remainingCurtailmentGwh,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
