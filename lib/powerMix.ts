import { z } from "zod";

import { addBerlinCalendarDays, getBerlinDateKeyFromUnixSeconds, getBerlinIsoWeekdayForDateKey } from "@/lib/berlinCalendar";
import { berlinClockParts, uniqueQuarterLabels } from "@/lib/quarterMarks";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_HOUR_H = 0.25;

/** A day counts as surplus when this much wind-plus-solar energy sits above load. */
export const SURPLUS_DAY_GWH = 0.05;

export const CARRIER_IDS = [
  "lignite",
  "hardCoal",
  "gas",
  "biomass",
  "hydro",
  "windOffshore",
  "windOnshore",
  "solar",
  "other",
] as const;

export type CarrierId = (typeof CARRIER_IDS)[number];

/** Bottom-to-top paint order for the generation stack in MixChart (CARRIER_IDS unchanged elsewhere). */
export const CHART_STACK_ORDER: CarrierId[] = [
  "windOffshore",
  "windOnshore",
  "solar",
  "lignite",
  "hardCoal",
  "gas",
  "biomass",
  "hydro",
  "other",
];

export type MixRange = "tag" | "woche" | "monat";

export type PowerSlot = {
  unixSeconds: number;
  timestampIso: string;
  dateBerlin: string;
  hourBerlin: number;
  minuteBerlin: number;
  /** Megawatts. Null means the carrier was not published, never a stand-in zero. */
  carriers: Record<CarrierId, number | null>;
  loadMw: number | null;
  tradeMw: number | null;
  /** Published renewable share of load, percent. Null when the source left it out. */
  renewableSharePct: number | null;
};

export type PowerParse = {
  slots: PowerSlot[];
  /** False when the payload has no offshore series at all. */
  offshorePresent: boolean;
};

const carrierRowSchema = z.object({
  name: z.string(),
  data: z.array(z.number().nullable()),
});

const legacySchema = z.object({
  unix_seconds: z.array(z.number()),
  production_types: z.array(carrierRowSchema),
});

const v2RowSchema = z.object({
  timestamp: z.string(),
  values: z.record(z.string(), z.number().nullable()),
});

const v2Schema = z.object({
  data: z.array(v2RowSchema),
  series: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
});

const V2_ID: Record<string, CarrierId | "load" | "trade" | "share" | "skip"> = {
  wind_onshore: "windOnshore",
  wind_offshore: "windOffshore",
  solar: "solar",
  fossil_brown_coal_lignite: "lignite",
  fossil_hard_coal: "hardCoal",
  fossil_gas: "gas",
  biomass: "biomass",
  hydro_run_of_river: "hydro",
  hydro_water_reservoir: "hydro",
  hydro_pumped_storage: "hydro",
  fossil_oil: "other",
  fossil_coal_derived_gas: "other",
  geothermal: "other",
  waste: "other",
  others: "other",
  nuclear: "other",
  load_incl_self_consumption: "load",
  load: "load",
  cross_border_electricity_trading: "trade",
  renewable_share_of_load: "share",
  residual_load: "skip",
  renewable_share_of_generation: "skip",
  hydro_pumped_storage_consumption: "skip",
  battery_storage: "skip",
};

function emptyCarriers(): Record<CarrierId, number | null> {
  return {
    lignite: null,
    hardCoal: null,
    gas: null,
    biomass: null,
    hydro: null,
    windOffshore: null,
    windOnshore: null,
    solar: null,
    other: null,
  };
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Sum parts. Any missing part makes the whole carrier unpublished. */
function sumParts(parts: Array<number | null>): number | null {
  if (parts.length === 0) {
    return null;
  }
  let sum = 0;
  for (const part of parts) {
    if (part === null) {
      return null;
    }
    sum += part;
  }
  return sum;
}

export function classifyLegacyName(name: string): CarrierId | "load" | "trade" | "share" | "skip" | "other" {
  const trimmed = name.trim();
  if (/pumped storage consumption|battery/i.test(trimmed)) {
    return "skip";
  }
  if (/^residual\s*load\b/i.test(trimmed) || /renewable share of generation/i.test(trimmed)) {
    return "skip";
  }
  if (/^wind\s*onshore\b/i.test(trimmed)) {
    return "windOnshore";
  }
  if (/^wind\s*offshore\b/i.test(trimmed)) {
    return "windOffshore";
  }
  if (/^solar$/i.test(trimmed)) {
    return "solar";
  }
  if (/brown coal|lignite|braunkohle/i.test(trimmed)) {
    return "lignite";
  }
  if (/hard coal|steinkohle/i.test(trimmed)) {
    return "hardCoal";
  }
  if (/coal-derived|derived gas/i.test(trimmed)) {
    return "other";
  }
  if (/fossil gas|^gas$|erdgas|natural gas/i.test(trimmed)) {
    return "gas";
  }
  if (/^biomass\b/i.test(trimmed)) {
    return "biomass";
  }
  if (/hydro/i.test(trimmed)) {
    return "hydro";
  }
  if (/^load\b/i.test(trimmed)) {
    return "load";
  }
  if (/cross border/i.test(trimmed)) {
    return "trade";
  }
  if (/renewable share of load/i.test(trimmed)) {
    return "share";
  }
  if (/nuclear|fossil oil|geothermal|^waste\b|^others\b/i.test(trimmed)) {
    return "other";
  }
  return "skip";
}

function clockOf(unixSeconds: number): { hour: number; minute: number } {
  const parts = berlinClockParts(unixSeconds * 1000);
  const [hour, minute] = parts.hm.split(":").map(Number);
  return { hour, minute };
}

function slotFromBuckets(
  unixSeconds: number,
  buckets: Map<string, Array<number | null>>,
  keysPresent: Set<string>
): PowerSlot {
  const carriers = emptyCarriers();
  const grouped = new Map<string, Array<number | null>>();
  for (const [key, values] of buckets) {
    const list = grouped.get(key) ?? [];
    list.push(sumParts(values));
    grouped.set(key, list);
  }
  for (const id of CARRIER_IDS) {
    if (!keysPresent.has(id)) {
      carriers[id] = null;
      continue;
    }
    carriers[id] = sumParts(grouped.get(id) ?? [null]);
  }
  const clock = clockOf(unixSeconds);
  return {
    unixSeconds,
    timestampIso: new Date(unixSeconds * 1000).toISOString(),
    dateBerlin: getBerlinDateKeyFromUnixSeconds(unixSeconds),
    hourBerlin: clock.hour,
    minuteBerlin: clock.minute,
    carriers,
    loadMw: keysPresent.has("load") ? sumParts(grouped.get("load") ?? [null]) : null,
    tradeMw: keysPresent.has("trade") ? sumParts(grouped.get("trade") ?? [null]) : null,
    renewableSharePct: keysPresent.has("share") ? sumParts(grouped.get("share") ?? [null]) : null,
  };
}

function parseLegacy(payload: z.infer<typeof legacySchema>): PowerParse | null {
  const keysPresent = new Set<string>();
  const classified = payload.production_types.map((series) => {
    const key = classifyLegacyName(series.name);
    if (key !== "skip") {
      keysPresent.add(key);
    }
    return { key, data: series.data };
  });
  const slots: PowerSlot[] = [];
  for (let index = 0; index < payload.unix_seconds.length; index += 1) {
    const buckets = new Map<string, Array<number | null>>();
    for (const series of classified) {
      if (series.key === "skip") {
        continue;
      }
      const list = buckets.get(series.key) ?? [];
      list.push(finite(series.data[index] ?? null));
      buckets.set(series.key, list);
    }
    slots.push(slotFromBuckets(payload.unix_seconds[index], buckets, keysPresent));
  }
  return finish(slots, keysPresent.has("windOffshore"));
}

function parseV2(payload: z.infer<typeof v2Schema>): PowerParse | null {
  const keysPresent = new Set<string>();
  const slots: PowerSlot[] = [];
  for (const row of payload.data) {
    const unixMs = Date.parse(row.timestamp);
    if (!Number.isFinite(unixMs)) {
      continue;
    }
    const buckets = new Map<string, Array<number | null>>();
    for (const [id, raw] of Object.entries(row.values)) {
      const key = V2_ID[id] ?? "skip";
      if (key === "skip") {
        continue;
      }
      keysPresent.add(key);
      const list = buckets.get(key) ?? [];
      list.push(finite(raw));
      buckets.set(key, list);
    }
    slots.push(slotFromBuckets(Math.floor(unixMs / 1000), buckets, keysPresent));
  }
  return finish(slots, keysPresent.has("windOffshore"));
}

function finish(slots: PowerSlot[], offshorePresent: boolean): PowerParse | null {
  const sorted = [...slots].sort((left, right) => left.unixSeconds - right.unixSeconds);
  const unique: PowerSlot[] = [];
  for (const slot of sorted) {
    const previous = unique[unique.length - 1];
    if (previous && previous.unixSeconds === slot.unixSeconds) {
      unique[unique.length - 1] = slot;
    } else {
      unique.push(slot);
    }
  }
  if (unique.length === 0) {
    return null;
  }
  return { slots: unique, offshorePresent };
}

/** Accepts the v2 row feed and the older `unix_seconds` feed. */
export function parsePowerPayload(payload: unknown): PowerParse | null {
  const v2 = v2Schema.safeParse(payload);
  if (v2.success && v2.data.data.length > 0) {
    return parseV2(v2.data);
  }
  const legacy = legacySchema.safeParse(payload);
  if (legacy.success) {
    return parseLegacy(legacy.data);
  }
  return null;
}

export function windMw(slot: PowerSlot, offshorePresent: boolean): number | null {
  const parts = [slot.carriers.windOnshore];
  if (offshorePresent) {
    parts.push(slot.carriers.windOffshore);
  }
  return sumParts(parts);
}

export function solarMw(slot: PowerSlot): number | null {
  return slot.carriers.solar;
}

/** Load minus onshore minus offshore minus solar. Null when any input is unpublished. */
export function residualMw(slot: PowerSlot, offshorePresent: boolean): number | null {
  const wind = windMw(slot, offshorePresent);
  const solar = solarMw(slot);
  if (slot.loadMw === null || wind === null || solar === null) {
    return null;
  }
  return slot.loadMw - wind - solar;
}

export function residualDaysFromSlots(parsed: PowerParse): ResidualDay[] {
  const byDate = new Map<string, ResidualSlot[]>();
  for (const slot of parsed.slots) {
    const wind = windMw(slot, parsed.offshorePresent);
    const solar = solarMw(slot);
    if (slot.loadMw === null || wind === null || solar === null) {
      continue;
    }
    const residual: ResidualSlot = {
      timestampIso: slot.timestampIso,
      hourBerlin: slot.hourBerlin,
      minuteBerlin: slot.minuteBerlin,
      loadMw: slot.loadMw,
      windMw: wind,
      solarMw: solar,
    };
    const day = byDate.get(slot.dateBerlin);
    if (day) {
      day.push(residual);
    } else {
      byDate.set(slot.dateBerlin, [residual]);
    }
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([dateBerlin, slots]) => ({ dateBerlin, slots }));
}

export function rangeBounds(endDate: string, range: MixRange): { start: string; end: string } {
  if (range === "tag") {
    return { start: endDate, end: endDate };
  }
  if (range === "woche") {
    return { start: addBerlinCalendarDays(endDate, -6), end: endDate };
  }
  return { start: addBerlinCalendarDays(endDate, -30), end: endDate };
}

export function parseMixRange(value: string | null | undefined): MixRange {
  if (value === "woche" || value === "monat" || value === "tag") {
    return value;
  }
  return "tag";
}

export function slotsInRange(slots: PowerSlot[], start: string, end: string): PowerSlot[] {
  return slots.filter((slot) => slot.dateBerlin >= start && slot.dateBerlin <= end);
}

export type PeriodFigures = {
  loadGwh: number | null;
  /** Quarter-hours with a published load, including ones that still lack generation. */
  loadQuarters: number;
  /** Load summed only on quarter-hours where wind and solar are published too. */
  completeLoadGwh: number | null;
  /** Quarter-hours where load, wind and solar are all published. Share uses this count. */
  completeQuarters: number;
  windSolarGwh: number | null;
  /** Wind plus solar divided by load, on quarters where all of those series exist. */
  windSolarShare: number | null;
  surplusGwh: number | null;
  tradeGwh: number | null;
  carrierGwh: Record<CarrierId, number | null>;
  residualMaxMw: number | null;
  residualMaxIso: string | null;
  residualMinMw: number | null;
  residualMinIso: string | null;
};

function addEnergy(sum: number | null, mw: number | null): number | null {
  if (mw === null) {
    return sum;
  }
  return (sum ?? 0) + (mw * QUARTER_HOUR_H) / 1000;
}

export function periodFigures(slots: PowerSlot[], offshorePresent: boolean): PeriodFigures {
  const carrierGwh = emptyCarriers();
  let loadGwh: number | null = null;
  let loadQuarters = 0;
  let completeLoadGwh: number | null = null;
  let completeQuarters = 0;
  let windSolarGwh: number | null = null;
  let surplusGwh: number | null = null;
  let tradeGwh: number | null = null;
  let residualMaxMw: number | null = null;
  let residualMaxIso: string | null = null;
  let residualMinMw: number | null = null;
  let residualMinIso: string | null = null;

  for (const slot of slots) {
    for (const id of CARRIER_IDS) {
      carrierGwh[id] = addEnergy(carrierGwh[id], slot.carriers[id]);
    }
    if (slot.loadMw !== null) {
      loadQuarters += 1;
    }
    loadGwh = addEnergy(loadGwh, slot.loadMw);
    tradeGwh = addEnergy(tradeGwh, slot.tradeMw);
    const wind = windMw(slot, offshorePresent);
    const solar = solarMw(slot);
    if (wind !== null && solar !== null) {
      windSolarGwh = addEnergy(windSolarGwh, wind + solar);
      if (slot.loadMw !== null) {
        completeQuarters += 1;
        completeLoadGwh = addEnergy(completeLoadGwh, slot.loadMw);
        surplusGwh = addEnergy(surplusGwh, Math.max(0, wind + solar - slot.loadMw));
        const residual = slot.loadMw - wind - solar;
        if (residualMaxMw === null || residual > residualMaxMw) {
          residualMaxMw = residual;
          residualMaxIso = slot.timestampIso;
        }
        if (residualMinMw === null || residual < residualMinMw) {
          residualMinMw = residual;
          residualMinIso = slot.timestampIso;
        }
      }
    }
  }

  const share =
    windSolarGwh !== null && completeLoadGwh !== null && completeLoadGwh > 0 ? windSolarGwh / completeLoadGwh : null;

  return {
    loadGwh,
    loadQuarters,
    completeLoadGwh,
    completeQuarters,
    windSolarGwh,
    windSolarShare: share,
    surplusGwh,
    tradeGwh,
    carrierGwh,
    residualMaxMw,
    residualMaxIso,
    residualMinMw,
    residualMinIso,
  };
}

/**
 * Export energy on quarter-hours where wind plus solar already exceeds load.
 * Trade is positive for import and negative for export. This sums the published series.
 * It does not run a new dispatch.
 */
const FOSSIL_CARRIER_IDS: CarrierId[] = ["lignite", "hardCoal", "gas"];

function isWindSolarSurplusSlot(slot: PowerSlot, offshorePresent: boolean): boolean {
  const wind = windMw(slot, offshorePresent);
  const solar = solarMw(slot);
  return wind !== null && solar !== null && slot.loadMw !== null && wind + solar > slot.loadMw;
}

/** True when any fossil carrier publishes above zero during wind-and-solar surplus quarter-hours. */
export function fossilRunsDuringSurplus(slots: PowerSlot[], offshorePresent: boolean): boolean {
  for (const slot of slots) {
    if (!isWindSolarSurplusSlot(slot, offshorePresent)) {
      continue;
    }
    for (const id of FOSSIL_CARRIER_IDS) {
      const value = slot.carriers[id];
      if (value !== null && value > 0) {
        return true;
      }
    }
  }
  return false;
}

/** Latest published quarter is within maxAgeMs of now (Berlin series clock). */
export function powerSeriesFresh(slots: PowerSlot[], nowMs = Date.now(), maxAgeMs = 2 * 60 * 60 * 1000): boolean {
  if (slots.length === 0) {
    return false;
  }
  const latestMs = Math.max(...slots.map((slot) => slot.unixSeconds * 1000));
  return nowMs - latestMs <= maxAgeMs;
}

export function exportOnSurplusGwh(slots: PowerSlot[], offshorePresent: boolean): number | null {
  let sum = 0;
  let sawSurplus = false;
  let sawTrade = false;
  for (const slot of slots) {
    if (!isWindSolarSurplusSlot(slot, offshorePresent)) {
      continue;
    }
    sawSurplus = true;
    if (slot.tradeMw === null) {
      continue;
    }
    sawTrade = true;
    sum += (Math.max(0, -slot.tradeMw) * QUARTER_HOUR_H) / 1000;
  }
  if (!sawSurplus) {
    return 0;
  }
  return sawTrade ? sum : null;
}

export type ChartPoint = {
  unix: number;
  label: string;
  tick: string | null;
  carriers: Record<CarrierId, number | null>;
  load: number | null;
  residual: number | null;
  trade: number | null;
};

function mean(values: Array<number | null>): number | null {
  const published = values.filter((value): value is number => value !== null);
  if (published.length === 0) {
    return null;
  }
  return published.reduce((sum, value) => sum + value, 0) / published.length;
}

const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function berlinDayTick(dateKey: string): string {
  const weekday = WEEKDAY_SHORT[getBerlinIsoWeekdayForDateKey(dateKey)] ?? "";
  const [, month, day] = dateKey.split("-");
  return `${weekday} ${day}.${month}.`;
}

function ticksFor(points: ChartPoint[], range: MixRange): ChartPoint[] {
  if (points.length === 0) {
    return points;
  }
  const marked = points.map((point) => ({ ...point, tick: null as string | null }));
  if (range === "tag") {
    for (const point of marked) {
      const parts = berlinClockParts(point.unix * 1000);
      if (parts.hm.endsWith(":00") && Number(parts.hm.slice(0, 2)) % 6 === 0) {
        point.tick = parts.hm;
      }
    }
  } else if (range === "woche") {
    let lastDay = "";
    for (const point of marked) {
      const day = getBerlinDateKeyFromUnixSeconds(point.unix);
      if (day !== lastDay) {
        point.tick = berlinDayTick(day);
        lastDay = day;
      }
    }
  } else {
    const seen = new Set<string>();
    for (const point of marked) {
      const day = getBerlinDateKeyFromUnixSeconds(point.unix);
      if (seen.has(day) || getBerlinIsoWeekdayForDateKey(day) !== 7) {
        continue;
      }
      seen.add(day);
      point.tick = berlinDayTick(day);
    }
  }
  if (!marked.some((point) => point.tick) && marked.length > 0) {
    marked[0].tick = marked[0].label;
  }
  return marked;
}

/** Day: quarter-hours in GW. Week: hourly mean GW. Month: daily energy in GWh. */
export function aggregateSlots(slots: PowerSlot[], range: MixRange, offshorePresent: boolean): ChartPoint[] {
  if (range === "tag") {
    const labels = uniqueQuarterLabels(slots.map((slot) => slot.timestampIso));
    const points = slots.map((slot, index) => ({
      unix: slot.unixSeconds,
      label: labels[index] ?? "",
      tick: null,
      carriers: Object.fromEntries(CARRIER_IDS.map((id) => [id, slot.carriers[id] === null ? null : slot.carriers[id] / 1000])) as Record<
        CarrierId,
        number | null
      >,
      load: slot.loadMw === null ? null : slot.loadMw / 1000,
      residual: (() => {
        const residual = residualMw(slot, offshorePresent);
        return residual === null ? null : residual / 1000;
      })(),
      trade: slot.tradeMw === null ? null : slot.tradeMw / 1000,
    }));
    return ticksFor(points, range);
  }

  if (range === "woche") {
    const groups = new Map<number, PowerSlot[]>();
    for (const slot of slots) {
      const hour = Math.floor(slot.unixSeconds / 3600) * 3600;
      const list = groups.get(hour) ?? [];
      list.push(slot);
      groups.set(hour, list);
    }
    const hours = [...groups.keys()].sort((left, right) => left - right);
    const labels = uniqueQuarterLabels(hours.map((hour) => hour * 1000));
    const points = hours.map((hour, index) => {
      const group = groups.get(hour) ?? [];
      const carriers = emptyCarriers();
      for (const id of CARRIER_IDS) {
        const averaged = mean(group.map((slot) => slot.carriers[id]));
        carriers[id] = averaged === null ? null : averaged / 1000;
      }
      const load = mean(group.map((slot) => slot.loadMw));
      const trade = mean(group.map((slot) => slot.tradeMw));
      const residual = mean(group.map((slot) => residualMw(slot, offshorePresent)));
      return {
        unix: hour,
        label: labels[index] ?? "",
        tick: null,
        carriers,
        load: load === null ? null : load / 1000,
        residual: residual === null ? null : residual / 1000,
        trade: trade === null ? null : trade / 1000,
      };
    });
    return ticksFor(points, range);
  }

  const groups = new Map<string, PowerSlot[]>();
  for (const slot of slots) {
    const list = groups.get(slot.dateBerlin) ?? [];
    list.push(slot);
    groups.set(slot.dateBerlin, list);
  }
  const days = [...groups.keys()].sort();
  const points = days.map((day) => {
    const group = groups.get(day) ?? [];
    const figures = periodFigures(group, offshorePresent);
    const [, month, date] = day.split("-");
    const noon = Date.parse(`${day}T12:00:00Z`) / 1000;
    return {
      unix: Number.isFinite(noon) ? noon : group[0].unixSeconds,
      label: `${date}.${month}.`,
      tick: null,
      carriers: figures.carrierGwh,
      load: figures.loadGwh,
      residual: energyOrNull(group, offshorePresent),
      trade: figures.tradeGwh,
    };
  });
  return ticksFor(points, range);
}

function energyOrNull(group: PowerSlot[], offshorePresent: boolean): number | null {
  let sum: number | null = null;
  for (const slot of group) {
    const residual = residualMw(slot, offshorePresent);
    if (residual === null) {
      continue;
    }
    sum = (sum ?? 0) + (residual * QUARTER_HOUR_H) / 1000;
  }
  return sum;
}

export function chartUnit(range: MixRange): "GW" | "GWh" {
  return range === "monat" ? "GWh" : "GW";
}

export function isQuietDay(surplusGwh: number | null): boolean {
  return surplusGwh !== null && surplusGwh <= SURPLUS_DAY_GWH;
}

export function lastSurplusDate(slots: PowerSlot[], offshorePresent: boolean, exceptDate: string | null): string | null {
  const days = new Map<string, PowerSlot[]>();
  for (const slot of slots) {
    const list = days.get(slot.dateBerlin) ?? [];
    list.push(slot);
    days.set(slot.dateBerlin, list);
  }
  const dates = [...days.keys()].sort((left, right) => (left < right ? 1 : -1));
  for (const date of dates) {
    if (date === exceptDate) {
      continue;
    }
    const surplus = periodFigures(days.get(date) ?? [], offshorePresent).surplusGwh;
    if (surplus !== null && surplus > SURPLUS_DAY_GWH) {
      return date;
    }
  }
  return null;
}
