/**
 * Builds a reproducible snapshot for the homepage day panel (network fetch).
 * Run: pnpm exec tsx --tsconfig tsconfig.json scripts/home-day-panel-evidence.ts
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { pickNewestStrictCompletePowerDayKey } from "@/lib/berlinDayCompleteness";
import { buildHomeDayPanelData, totalGenerationGwhForDay } from "@/lib/homeDayPanel";
import { overviewBounds } from "@/lib/overviewRange";
import { readFleetSnapshot } from "@/lib/fleetSnapshot";
import { parseBatteryChartsFleet } from "@/lib/largeBatteryFleet";
import { parsePowerPayload, periodFigures, residualDaysFromSlots, slotsInRange } from "@/lib/powerMix";

const OUT = join(process.cwd(), "review-artifacts/home-day-panel-20261107-v2");

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const capturedAt = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(capturedAt);
  const start = addBerlinCalendarDays(todayKey, -61);
  const powerUrl = `https://api.energy-charts.info/v2/total_power?country=de&start=${start}&end=${todayKey}`;
  const fetchedAtIso = capturedAt.toISOString();
  const sourceSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  const powerPayload = await fetchJson(powerUrl);
  const parsed = parsePowerPayload(powerPayload);
  if (!parsed) {
    throw new Error("Missing power");
  }

  let fleetParsed = null;
  try {
    const [fleetPower, fleetEnergy] = await Promise.all([
      fetchJson("https://battery-charts.de/wp-json/isea/v1/data?query_id=grossspeicher_leistung"),
      fetchJson("https://battery-charts.de/wp-json/isea/v1/data?query_id=grossspeicher_kapazitaet"),
    ]);
    fleetParsed = parseBatteryChartsFleet(fleetPower, fleetEnergy);
  } catch {
    fleetParsed = null;
  }
  if (!fleetParsed) {
    fleetParsed = readFleetSnapshot(capturedAt);
  }
  if (!fleetParsed) {
    throw new Error("Fleet unavailable (Battery Charts + snapshot)");
  }

  const days = residualDaysFromSlots(parsed);
  const kopfDayKey = pickNewestStrictCompletePowerDayKey(parsed.slots, parsed.offshorePresent, todayKey);
  if (!kopfDayKey) {
    throw new Error("No strict-complete day");
  }
  const kopfDay = days.find((d) => d.dateBerlin === kopfDayKey) ?? null;
  const publicFleet = {
    powerMw: fleetParsed.powerGw * 1000,
    energyMwh: fleetParsed.energyGwh * 1000,
    powerGw: fleetParsed.powerGw,
    energyGwh: fleetParsed.energyGwh,
    updatedLabel: fleetParsed.updatedLabel,
    source: fleetParsed.source,
    href: fleetParsed.chartUrl,
  };
  const panel = buildHomeDayPanelData({
    dateKey: kopfDayKey,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    allDays: days,
    day: kopfDay,
    fleet: publicFleet,
    fetchStand: fetchedAtIso,
    evaluationWindow: overviewBounds("30tage", todayKey),
  });
  const daySlots = slotsInRange(parsed.slots, kopfDayKey, kopfDayKey);
  const gen = totalGenerationGwhForDay(daySlots, parsed.offshorePresent);
  const figures = periodFigures(daySlots, parsed.offshorePresent);
  const records = buildTagesKennzahlRecords({
    days,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    prices: [],
    powerMw: publicFleet.powerMw,
    energyMwh: publicFleet.energyMwh,
  });

  const snapshot = {
    generatedAt: fetchedAtIso,
    sourceSha,
    powerUrl,
    fetchedAtIso,
    kopfDayKey,
    quarterCount: daySlots.length,
    expectedQuarters: panel?.expectedQuarters,
    panel,
    rawKpis: {
      loadGwh: figures.loadGwh,
      windSolarGwh: figures.windSolarGwh,
      surplusGwh: figures.surplusGwh,
      generation: gen,
    },
    fleet: publicFleet,
    tagesRecord: records.find((r) => r.dateKey === kopfDayKey),
    evaluationWindow: overviewBounds("30tage", todayKey),
  };

  writeFileSync(join(OUT, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${join(OUT, "snapshot.json")} @ ${sourceSha}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
