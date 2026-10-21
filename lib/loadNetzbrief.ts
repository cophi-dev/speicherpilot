import "server-only";

import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { HAMBURG_SUPERMARKET, planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { SMARD_FILTER, fetchSmardQuarterHours } from "@/lib/smardApi";
import { buildNetzbriefCatalog, issueCsv, type NetzbriefIssue, type PeakDayInput } from "@/lib/netzbrief";
import { parseWindSolarDays } from "@/lib/windSolarResidual";
import { zoneShareDays, zoneShareQuarters } from "@/lib/zoneShare";

const CACHE_MS = 5 * 60 * 1000;

let cache: { at: number; todayKey: string; issues: NetzbriefIssue[] } | null = null;

function daysBefore(dateKey: string, count: number): string {
  let key = dateKey;
  for (let step = 0; step < count; step += 1) {
    key = prevBerlinDateKey(key);
  }
  return key;
}

async function readJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return null;
    }
    return response.json() as Promise<unknown>;
  } catch {
    return null;
  }
}

function peakFromExample(): PeakDayInput {
  const plan = planHamburgSupermarket();
  const series = plan.peakDay;
  const step = series.loadKw.length > 24 ? 0.25 : 1;
  return {
    limitKw: HAMBURG_SUPERMARKET.limitKw,
    slots: series.loadKw.map((loadKw, index) => ({
      hour: index * step,
      beforeKw: loadKw - (series.pvKw[index] ?? 0),
      afterKw: series.gridKw[index] ?? loadKw,
    })),
  };
}

export async function loadNetzbriefIssues(now = new Date()): Promise<NetzbriefIssue[]> {
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  if (cache && cache.todayKey === todayKey && Date.now() - cache.at < CACHE_MS) {
    return cache.issues;
  }
  const start = daysBefore(todayKey, 20);
  const [power, prices, fleet, northWindOn, northWindOff, northPv, northLoad, southWindOn, southPv, southLoad] =
    await Promise.all([
      readJson(`https://api.energy-charts.info/total_power?country=de&start=${start}&end=${todayKey}`),
      readJson(`https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${todayKey}&end=${todayKey}`),
      loadLargeBatteryFleet().catch(() => null),
      fetchSmardQuarterHours(SMARD_FILTER.windOnshore, "50Hertz").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.windOffshore, "50Hertz").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.photovoltaic, "50Hertz").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.load, "50Hertz").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.windOnshore, "TransnetBW").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.photovoltaic, "TransnetBW").catch(() => []),
      fetchSmardQuarterHours(SMARD_FILTER.load, "TransnetBW").catch(() => []),
    ]);
  const priceRows: Array<{ unixMs: number; eurPerMwh: number }> = [];
  const envelope = prices as { data?: Array<{ timestamp?: string; values?: Record<string, number | null> }> } | null;
  for (const row of envelope?.data ?? []) {
    const value = row.values?.day_ahead_price;
    if (!row.timestamp || value === null || value === undefined || !Number.isFinite(value)) {
      continue;
    }
    priceRows.push({ unixMs: Date.parse(row.timestamp), eurPerMwh: value });
  }
  const issues = buildNetzbriefCatalog({
    todayKey,
    days: power ? parseWindSolarDays(power) : [],
    fleet,
    zones: zoneShareDays(
      zoneShareQuarters({
        northWindOn,
        northWindOff,
        northPv,
        northLoad,
        southWindOn,
        southPv,
        southLoad,
      })
    ),
    prices: priceRows,
    peak: peakFromExample(),
  });
  cache = { at: Date.now(), todayKey, issues };
  return issues;
}

export async function loadNetzbriefIssue(nr: number, now = new Date()): Promise<NetzbriefIssue | null> {
  if (!Number.isFinite(nr)) {
    return null;
  }
  const issues = await loadNetzbriefIssues(now);
  return issues.find((issue) => issue.nr === nr) ?? null;
}

export function netzbriefCsv(issue: NetzbriefIssue): string {
  return issueCsv(issue);
}
