import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseDayAheadPrices } from "@/lib/dayAheadPrices";
import { buildLiveDayPlausibility } from "@/lib/liveDayPlausibility";
import { liveTagTomorrowKey } from "@/lib/liveTagConfig";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import type { LiveTagView } from "@/lib/liveTagView.server";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";
import { berlinDayPrices } from "@/lib/preisFenster";
import { referenceParkModelDay } from "@/lib/referenceParkModelDay";
import { parseWindSolarDays } from "@/lib/windSolarResidual";

const FIXTURE_DIR = join(process.cwd(), "__fixtures__", "live_tag_1411");
const DAY = "2026-11-14";

/** Nur für Preview-Screenshots: feste Fixture tp_today (Abruf 16:27). */
export async function loadLiveTagFixtureView(): Promise<LiveTagView> {
  const tp = JSON.parse(readFileSync(join(FIXTURE_DIR, "tp_today.json"), "utf8"));
  const priceBody = JSON.parse(readFileSync(join(FIXTURE_DIR, "price.json"), "utf8"));
  const day = parseWindSolarDays(tp).find((entry) => entry.dateBerlin === DAY);
  if (!day) {
    throw new Error("Fixture day missing");
  }
  const rawPrices = parseDayAheadPrices(priceBody) ?? [];
  const tomorrowKey = liveTagTomorrowKey(DAY);
  const fleet = await loadLargeBatteryFleet();
  const nav = await resolveNavShortcuts();
  const powerGw = fleet?.powerGw ?? 4.6452;
  const energyGwh = fleet?.energyGwh ?? 8.1545;
  const todayRaw = rawPrices.filter((point) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(point.unixMs));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}` === DAY;
  });
  const plausibility = buildLiveDayPlausibility(day.slots);
  return {
    mode: "laufend",
    todayKey: DAY,
    dayKey: DAY,
    lastCompleteDayKey: nav.lastCompleteDayKey,
    day,
    plausibility,
    preisToday: berlinDayPrices(rawPrices, DAY),
    preisTomorrow: berlinDayPrices(rawPrices, tomorrowKey),
    tomorrowKey,
    marktFahrplan: referenceParkModelDay({
      prices: todayRaw,
      dateBerlin: DAY,
      powerMw: 4645.2,
      energyMwh: 8154.5,
    }),
    fleetPowerGw: powerGw,
    fleetEnergyGwh: energyGwh,
    dataDelayed: false,
    dataStandHm: plausibility.standLabelHm,
    fetchedAtMs: Date.parse("2026-11-14T16:27:00+01:00"),
    pricesStale: false,
    powerStale: false,
  };
}

export function liveTagFixtureDemoEnabled(): boolean {
  if (process.env.SPEICHERPILOT_LIVE_TAG_DEMO === "1") {
    return true;
  }
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv === "preview" || vercelEnv === "development" || process.env.NODE_ENV === "development";
}