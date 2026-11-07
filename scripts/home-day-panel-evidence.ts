/**
 * Builds a reproducible snapshot for the homepage day panel (network fetch).
 * Run: pnpm exec tsx --tsconfig tsconfig.json scripts/home-day-panel-evidence.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { pickLastCompleteDayKey } from "@/lib/completeBerlinDay";
import { parseBatteryChartsFleet } from "@/lib/largeBatteryFleet";
import { buildHomeDayPanelData, totalGenerationGwhForDay } from "@/lib/homeDayPanel";
import { overviewBounds } from "@/lib/overviewRange";
import { parsePowerPayload, periodFigures, residualDaysFromSlots, slotsInRange } from "@/lib/powerMix";

const OUT = join(process.cwd(), "review-artifacts/home-day-panel-20261107");

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const now = new Date("2026-11-07T22:00:00.000Z");
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const start = addBerlinCalendarDays(todayKey, -61);
  const powerUrl = `https://api.energy-charts.info/v2/total_power?country=de&start=${start}&end=${todayKey}`;
  const powerPayload = await fetchJson(powerUrl);
  const parsed = parsePowerPayload(powerPayload);
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
  if (!parsed) {
    throw new Error("Missing power");
  }
  if (!fleetParsed) {
    fleetParsed = {
      powerGw: 4.63786022,
      energyGwh: 8.1392508,
      durationHours: 1.756,
      year: "2026",
      updatedAtIso: now.toISOString(),
      updatedLabel: { de: "07.11.2026 (evidence fallback)", en: "2026-11-07 (evidence fallback)" },
      datasource: "MaStR",
      source: "battery-charts" as const,
      jsonUrl: "",
      chartUrl: "https://battery-charts.de/de/battery-charts-de/",
    };
  }
  const days = residualDaysFromSlots(parsed);
  const kopfDayKey = pickLastCompleteDayKey(days, todayKey);
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
    todayKey,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    allDays: days,
    day: kopfDay,
    fleet: publicFleet,
    fetchStand: now.toISOString(),
    modelWindow: overviewBounds("30tage", todayKey),
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
    generatedAt: now.toISOString(),
    sourceSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    kopfDayKey,
    powerUrl,
    quarterCount: daySlots.length,
    panel,
    rawKpis: {
      loadGwh: figures.loadGwh,
      windSolarGwh: figures.windSolarGwh,
      surplusGwh: figures.surplusGwh,
      generation: gen,
      carrierGwh: figures.carrierGwh,
    },
    fleet: publicFleet,
    tagesRecord: records.find((r) => r.dateKey === kopfDayKey),
    modelWindow: overviewBounds("30tage", todayKey),
  };

  writeFileSync(join(OUT, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${join(OUT, "snapshot.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
