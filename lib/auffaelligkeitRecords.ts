import { getBerlinDateKeyFromUnixSeconds } from "@/lib/berlinCalendar";
import { chainFleetSoc } from "@/lib/chainedFleetSoc";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { buildQuarterPriceMap, priceForQuarterIso } from "@/lib/quarterPrices";
import { MORE_STORAGE_DISCHARGE_HOUR } from "@/lib/moreStorage";
import { periodFigures, windMw, solarMw, type PowerSlot } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";
import { attachDryStreaks, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";

const Q = 0.25;

function eveningPeak(day: ResidualDay): { gw: number | null; at: string | null } {
  const evening = day.slots.filter((s) => s.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR);
  if (evening.length === 0) {
    return { gw: null, at: null };
  }
  let best = Number.NEGATIVE_INFINITY;
  let at: string | null = null;
  for (const slot of evening) {
    const residual = slot.loadMw - slot.windMw - slot.solarMw;
    if (residual > best) {
      best = residual;
      const hm = slot.timestampIso.slice(11, 16);
      at = hm;
    }
  }
  return { gw: Number.isFinite(best) ? best / 1000 : null, at };
}

function priceStats(
  dateKey: string,
  prices: DayAheadPricePoint[]
): Pick<TagesKennzahlRecord, "spread" | "pmin" | "pminAt" | "pmax" | "pmaxAt" | "negH"> {
  const dayPrices = prices.filter((p) => getBerlinDateKeyFromUnixSeconds(Math.floor(p.unixMs / 1000)) === dateKey);
  if (dayPrices.length === 0) {
    return { spread: null, pmin: null, pminAt: null, pmax: null, pmaxAt: null, negH: null };
  }
  const values = dayPrices.map((p) => p.eurPerMwh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const minPoint = dayPrices.reduce((a, b) => (b.eurPerMwh < a.eurPerMwh ? b : a));
  const maxPoint = dayPrices.reduce((a, b) => (b.eurPerMwh > a.eurPerMwh ? b : a));
  const hm = (p: DayAheadPricePoint) => {
    const d = new Date(p.unixMs);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const h = parts.find((x) => x.type === "hour")?.value ?? "00";
    const m = parts.find((x) => x.type === "minute")?.value ?? "00";
    return `${h}:${m}`;
  };
  return {
    spread: max - min,
    pmin: min,
    pminAt: hm(minPoint),
    pmax: max,
    pmaxAt: hm(maxPoint),
    negH: dayPrices.filter((p) => p.eurPerMwh < 0).length * Q,
  };
}

function wsShare(day: ResidualDay): number {
  let load = 0;
  let ws = 0;
  for (const slot of day.slots) {
    load += slot.loadMw;
    ws += slot.windMw + slot.solarMw;
  }
  return load > 0 ? (ws / load) * 100 : 0;
}

function surplusFromSlots(slots: PowerSlot[], offshorePresent: boolean) {
  const fig = periodFigures(slots, offshorePresent);
  const sur = slots.map((s) => {
    const load = s.loadMw ?? 0;
    return Math.max(0, (windMw(s, offshorePresent) ?? 0) + (solarMw(s) ?? 0) - load);
  });
  return {
    surplusGwh: fig.surplusGwh ?? 0,
    surplusH: sur.filter((v) => v > 0).length * Q,
  };
}

export function buildTagesKennzahlRecords(args: {
  days: ResidualDay[];
  slots: PowerSlot[];
  offshorePresent: boolean;
  prices: DayAheadPricePoint[];
  powerMw: number;
  energyMwh: number;
}): TagesKennzahlRecord[] {
  const chain = chainFleetSoc(args.days, args.powerMw, args.energyMwh);
  const chargeByIso = new Map<string, number>();
  const dischargeByIso = new Map<string, number>();
  for (const p of chain.points) {
    if (p.chargeMw > 0) {
      chargeByIso.set(p.timestampIso, p.chargeMw);
    }
    if (p.dischargeMw > 0) {
      dischargeByIso.set(p.timestampIso, p.dischargeMw);
    }
  }

  const priceMap = buildQuarterPriceMap(args.prices);

  const raw: TagesKennzahlRecord[] = args.days.map((day) => {
    const daySlots = args.slots.filter((s) => s.dateBerlin === day.dateBerlin);
    const { surplusGwh, surplusH } = surplusFromSlots(daySlots, args.offshorePresent);
    const peak = eveningPeak(day);
    let peakCutGw: number | null = null;
    const evening = day.slots.filter((s) => s.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR);
    if (evening.length > 0 && peak.gw !== null) {
      let after = Number.NEGATIVE_INFINITY;
      for (const slot of evening) {
        const residual = slot.loadMw - slot.windMw - slot.solarMw;
        const dis = dischargeByIso.get(slot.timestampIso) ?? 0;
        after = Math.max(after, residual - dis);
      }
      if (Number.isFinite(after)) {
        peakCutGw = peak.gw - after / 1000;
      }
    }

    let charged = 0;
    let fullAt: string | null = null;
    let soc = 0.1 * args.energyMwh;
    for (const slot of day.slots) {
      if (slot.hourBerlin < MORE_STORAGE_DISCHARGE_HOUR) {
        const sur = Math.max(0, slot.windMw + slot.solarMw - slot.loadMw);
        const room = Math.max(0, 0.9 * args.energyMwh - soc) / Q;
        const c = Math.min(sur, args.powerMw, room);
        soc += c * Q;
        charged += c * Q;
        if (fullAt === null && soc >= 0.9 * args.energyMwh - 1e-6) {
          fullAt = slot.timestampIso.slice(11, 16);
        }
      }
    }

    const ps = priceStats(day.dateBerlin, args.prices);
    const fullMin = fullAt ? parseInt(fullAt.slice(0, 2), 10) * 60 + parseInt(fullAt.slice(3, 5), 10) : null;

    return {
      dateKey: day.dateBerlin,
      surplusGwh,
      surplusH,
      ...ps,
      eveningPeakGw: peak.gw,
      eveningPeakAt: peak.at,
      peakCutGw,
      absorbedGwh: charged / 1000,
      fullAt,
      fullMin,
      wsShare: wsShare(day),
      dryStreak: 0,
    };
  });

  return attachDryStreaks(raw);
}

export function findEveningPeakSeries(records: TagesKennzahlRecord[], dateKey: string, window = 30) {
  const idx = records.findIndex((r) => r.dateKey === dateKey);
  if (idx < 0) {
    return [];
  }
  const start = Math.max(0, idx - window);
  return records.slice(start, idx + 1).map((r) => ({
    dateKey: r.dateKey,
    gw: r.eveningPeakGw,
    highlight: r.dateKey === dateKey,
  }));
}

export { priceForQuarterIso };
