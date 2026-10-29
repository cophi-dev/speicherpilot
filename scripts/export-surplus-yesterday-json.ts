#!/usr/bin/env tsx
/**
 * Writes surplus KPI JSON for manual cross-check.
 * Usage: pnpm tsx scripts/export-surplus-yesterday-json.ts [--date YYYY-MM-DD] [--power MW] [--energy MWh]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";
import {
  BATTERY_CHARTS_ENERGY_QUERY,
  BATTERY_CHARTS_POWER_QUERY,
  batteryChartsDataUrl,
  parseBatteryChartsFleet,
} from "@/lib/largeBatteryFleet";
import { getGermanyEnergyFlowForBerlinRange } from "@/lib/energyChartsApi";
import { resolveGermanyEnergyFlowBerlinRangeForDate } from "@/lib/germanyEnergyFlowPeriod";
import { buildSurplusDayReport } from "@/lib/surplusDaySimulation";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function loadLiveFleet(): Promise<{ powerMw: number; energyMwh: number } | null> {
  try {
    const [power, energy] = await Promise.all([
      fetch(batteryChartsDataUrl(BATTERY_CHARTS_POWER_QUERY)).then((r) => r.json()),
      fetch(batteryChartsDataUrl(BATTERY_CHARTS_ENERGY_QUERY)).then((r) => r.json()),
    ]);
    const parsed = parseBatteryChartsFleet(power, energy);
    if (!parsed) {
      return null;
    }
    return { powerMw: parsed.powerGw * 1000, energyMwh: parsed.energyGwh * 1000 };
  } catch {
    return null;
  }
}

async function main() {
  const now = new Date();
  const dateArg = readArg("--date");
  const dateBerlin = dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)
    ? dateArg
    : prevBerlinDateKey(formatBerlinDateKeyFromUtcDate(now));

  const powerArg = readArg("--power");
  const energyArg = readArg("--energy");
  const liveFleet = await loadLiveFleet();
  const fleet = {
    powerMw: powerArg ? Number(powerArg) : (liveFleet?.powerMw ?? 4_580),
    energyMwh: energyArg ? Number(energyArg) : (liveFleet?.energyMwh ?? 8_000),
  };

  const flow = await getGermanyEnergyFlowForBerlinRange(
    resolveGermanyEnergyFlowBerlinRangeForDate(dateBerlin, now),
    now
  );
  const report = flow ? buildSurplusDayReport(flow, fleet) : null;

  const payload = {
    dateBerlin,
    generatedAt: now.toISOString(),
    fleet,
    windSolarSurplusGwh: report?.observed.windSolarSurplusGwh ?? null,
    exportObservedGwh: report?.observed.observedExportGwh ?? null,
    lastSurplusDateBerlin: report?.observed.lastSurplusDateBerlin ?? null,
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
  const target = path.join(dir, `surplus-yesterday-${dateBerlin}.json`);
  writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(target);
}

function pick(report: NonNullable<ReturnType<typeof buildSurplusDayReport>>, factor: 1 | 2 | 5 | 10) {
  const row = report.factors[factor];
  return {
    absorbedGwh: row.absorbedGwh,
    remainingSurplusGwh: row.remainingSurplusGwh,
    exportObservedGwh: row.observedExportGwh,
    exportSimulatedGwh: row.simulatedExportGwh,
    exportDeltaGwh: row.exportDeltaGwh,
    dischargedGwh: row.dischargedGwh,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
