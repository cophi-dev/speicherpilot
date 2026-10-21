import { formatQuantity } from "@/lib/formatQuantity";
import { getBerlinIsoWeekdayForDateKey, nextBerlinDateKey, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { buildMoreStorage } from "@/lib/moreStorage";
import { mirrorShareAxis, niceAxis } from "@/lib/niceTicks";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";
import { windSolarSurplusMwh } from "@/lib/windSolarResidual";
import type { ZoneQuarter } from "@/lib/zoneShare";

export type Copy = { de: string; en: string };

export type NetzbriefFormat = "uhr" | "speicher" | "nord-sued" | "erklaert";

export const NETZBRIEF_FORMATS: Array<{ id: NetzbriefFormat; de: string; en: string }> = [
  { id: "uhr", de: "Uhr", en: "Clock" },
  { id: "speicher", de: "Mehr Speicher", en: "More storage" },
  { id: "nord-sued", de: "Nord/Süd", en: "North/South" },
  { id: "erklaert", de: "Erklärt", en: "Explained" },
];

const FRAME: Record<NetzbriefFormat, string> = {
  uhr: "UHR",
  speicher: "MEHR SPEICHER",
  "nord-sued": "NORD/SÜD",
  erklaert: "ERKLÄRT",
};

/** First daily issue. 1 October 2026 is #010. */
export const UHR_EPOCH = "2026-10-01";
/** Monday that starts weekly issue #200 / #300. */
export const WEEK_EPOCH = "2026-09-28";

export type ClockSlot = { hour: number; windSolarGw: number; surplus: boolean };
export type PriceSlot = { hour: number; eurPerMwh: number };
export type StorageSlot = { hour: number; residualGw: number; chargeGw: number; dischargeGw: number };
export type PeakSlot = { hour: number; beforeKw: number; afterKw: number };

export type NetzbriefIssue = {
  nr: number;
  format: NetzbriefFormat;
  formatLabel: Copy;
  frame: string;
  dateKey: string;
  dateLabel: Copy;
  shortDate: string;
  statement: Copy;
  source: Copy;
  licence: string;
  sourceHref: string;
  estimate: Copy | null;
  posterBars: number[];
  clock: {
    slots: ClockSlot[];
    scaleGw: number;
    ringsGw: number[];
    closed: boolean;
    surplusHours: number;
    partial: boolean;
  } | null;
  prices: {
    slots: PriceSlot[];
    minEur: number;
    maxEur: number;
    minHour: number;
    maxHour: number;
  } | null;
  storage: {
    slots: StorageSlot[];
    yMinGw: number;
    yMaxGw: number;
    yTicksGw: number[];
    storedShare: number;
    peakReductionGw: number | null;
    eveningPeakGw: number | null;
    model: Copy;
  } | null;
  zones: {
    slots: Array<{ hour: number; northPct: number; southPct: number }>;
    maxPct: number;
    ticks: number[];
    lineAt100: "gridline" | "none";
  } | null;
  peak: {
    slots: PeakSlot[];
    limitKw: number;
    beforeKw: number;
    afterKw: number;
    yMax: number;
    yTicks: number[];
  } | null;
};

export type PeakDayInput = {
  limitKw: number;
  slots: PeakSlot[];
};

export type CatalogInput = {
  todayKey: string;
  days: ResidualDay[];
  fleet: LargeBatteryFleet | null;
  zones: Array<{ dateKey: string; slots: ZoneQuarter[] }>;
  prices: Array<{ unixMs: number; eurPerMwh: number }>;
  peak: PeakDayInput;
};

const TRADING = /hier laden|hier entladen|laden passt|entladen passt/i;

export function netzbriefNumber(nr: number): string {
  return String(Math.max(0, Math.round(nr))).padStart(3, "0");
}

export function frameLabel(nr: number, format: NetzbriefFormat): string {
  return `SPEICHERPILOT · NETZBRIEF #${netzbriefNumber(nr)} · ${FRAME[format]}`;
}

/** Area-true radius, 0–1. A value of 0 has no area. */
export function areaTrueRadius(valueGw: number, scaleGw: number): number {
  if (!(valueGw > 0) || !(scaleGw > 0)) {
    return 0;
  }
  return Math.sqrt(Math.min(valueGw, scaleGw) / scaleGw);
}

/** The ring joins only when both 00:00 and 23:45 are published. */
export function midnightSeamClosed(hours: number[]): boolean {
  const hasStart = hours.some((hour) => hour < 0.01);
  const hasEnd = hours.some((hour) => hour >= 23.75 - 0.001);
  return hasStart && hasEnd;
}

/** Ink for a price stripe. 0 is the cheapest hour, 1 the dearest. Grayscale only. */
export function priceInk(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return 0.55;
  }
  const span = (value - min) / (max - min);
  return 0.22 + 0.78 * Math.min(1, Math.max(0, span));
}

export function daysAfter(epoch: string, dateKey: string): number {
  if (dateKey < epoch) {
    return -1;
  }
  let count = 0;
  let cursor = epoch;
  while (cursor < dateKey && count < 4000) {
    cursor = nextBerlinDateKey(cursor);
    count += 1;
  }
  return count;
}

export function uhrNumber(dateKey: string): number {
  return 10 + daysAfter(UHR_EPOCH, dateKey);
}

export function mondayOf(dateKey: string): string {
  const weekday = getBerlinIsoWeekdayForDateKey(dateKey);
  let key = dateKey;
  for (let step = 1; step < weekday; step += 1) {
    key = prevBerlinDateKey(key);
  }
  return key;
}

export function storageNumber(dateKey: string): number {
  const index = Math.floor(daysAfter(WEEK_EPOCH, mondayOf(dateKey)) / 7);
  return 200 + index;
}

export function northNumber(dateKey: string): number {
  return storageNumber(dateKey) + 100;
}

function noon(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateLabel(dateKey: string): Copy {
  const date = noon(dateKey);
  return {
    de: new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(date),
    en: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(date),
  };
}

function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}.${month}.${dateKey.slice(0, 4)}`;
}

function hourLabel(hour: number): string {
  const total = Math.round(hour * 60);
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function qty(value: number, language: "de" | "en", digits: number): string {
  return formatQuantity(value, language, digits);
}

function formatLabel(format: NetzbriefFormat): Copy {
  const entry = NETZBRIEF_FORMATS.find((item) => item.id === format);
  return { de: entry?.de ?? format, en: entry?.en ?? format };
}

function posterFrom(points: Array<{ hour: number; value: number }>): number[] {
  const bins = Array.from({ length: 24 }, () => [] as number[]);
  for (const point of points) {
    const bin = Math.min(23, Math.max(0, Math.floor(point.hour)));
    bins[bin].push(point.value);
  }
  const means = bins.map((bin) => (bin.length === 0 ? 0 : bin.reduce((sum, value) => sum + value, 0) / bin.length));
  const max = Math.max(...means);
  const min = Math.min(...means);
  if (max === min) {
    return means.map((value) => (value > 0 ? 1 : 0));
  }
  return means.map((value) => (value - min) / (max - min));
}

function baseIssue(input: {
  nr: number;
  format: NetzbriefFormat;
  dateKey: string;
  statement: Copy;
  source: Copy;
  licence: string;
  sourceHref: string;
  estimate: Copy | null;
  posterBars: number[];
}): NetzbriefIssue {
  return {
    ...input,
    formatLabel: formatLabel(input.format),
    frame: frameLabel(input.nr, input.format),
    dateLabel: dateLabel(input.dateKey),
    shortDate: shortDate(input.dateKey),
    clock: null,
    prices: null,
    storage: null,
    zones: null,
    peak: null,
  };
}

function clockFromDay(day: ResidualDay, todayKey: string) {
  const slots: ClockSlot[] = day.slots.map((slot) => {
    const windSolarGw = (slot.windMw + slot.solarMw) / 1000;
    return {
      hour: slot.hourBerlin + slot.minuteBerlin / 60,
      windSolarGw,
      surplus: slot.windMw + slot.solarMw > slot.loadMw,
    };
  });
  const peak = slots.reduce((highest, slot) => Math.max(highest, slot.windSolarGw), 0);
  const scaleGw = Math.max(40, niceAxis(0, Math.max(peak, 1)).max);
  const surplusHours = slots.reduce((sum, slot) => sum + (slot.surplus ? 0.25 : 0), 0);
  const partial = day.dateBerlin === todayKey && slots.length < 96;
  return {
    slots,
    scaleGw,
    ringsGw: [20, 40].filter((ring) => ring <= scaleGw + 1e-6),
    closed: midnightSeamClosed(slots.map((slot) => slot.hour)),
    surplusHours,
    partial,
  };
}

function uhrStatement(clock: { surplusHours: number; partial: boolean }, label: Copy): Copy {
  if (clock.surplusHours <= 0) {
    if (clock.partial) {
      return {
        de: "Bis jetzt kein Überschuss. Wind und Sonne sind schwach.",
        en: "No surplus so far. Wind and solar are weak.",
      };
    }
    return {
      de: `Am ${label.de} lag Wind plus Sonne in Deutschland nicht über der Last.`,
      en: `On ${label.en}, wind plus solar in Germany did not exceed load.`,
    };
  }
  return {
    de: `Am ${label.de} lagen Wind und Sonne ${qty(clock.surplusHours, "de", clock.surplusHours < 10 ? 1 : 0)} Stunden über der Last.`,
    en: `On ${label.en}, wind and solar exceeded load for ${qty(clock.surplusHours, "en", clock.surplusHours < 10 ? 1 : 0)} hours.`,
  };
}

function priceModel(points: Array<{ unixMs: number; eurPerMwh: number }>, dateKey: string) {
  const slots: PriceSlot[] = [];
  for (const point of points) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(point.unixMs));
    if (key !== dateKey || !Number.isFinite(point.eurPerMwh)) {
      continue;
    }
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(point.unixMs));
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    slots.push({ hour: hour + minute / 60, eurPerMwh: point.eurPerMwh });
  }
  if (slots.length === 0) {
    return null;
  }
  const min = slots.reduce((best, slot) => (slot.eurPerMwh < best.eurPerMwh ? slot : best));
  const max = slots.reduce((best, slot) => (slot.eurPerMwh > best.eurPerMwh ? slot : best));
  return { slots, minEur: min.eurPerMwh, maxEur: max.eurPerMwh, minHour: min.hour, maxHour: max.hour };
}

function buildUhr(
  day: ResidualDay,
  todayKey: string,
  prices: Array<{ unixMs: number; eurPerMwh: number }>
): NetzbriefIssue | null {
  if (day.dateBerlin < UHR_EPOCH || day.dateBerlin > todayKey || day.slots.length < 4) {
    return null;
  }
  const nr = uhrNumber(day.dateBerlin);
  if (nr < 10) {
    return null;
  }
  const clock = clockFromDay(day, todayKey);
  const label = dateLabel(day.dateBerlin);
  const issue = baseIssue({
    nr,
    format: "uhr",
    dateKey: day.dateBerlin,
    statement: uhrStatement(clock, label),
    source: {
      de: "Energy-Charts, Leistung Deutschland. Wind und Sonne gegen die Last.",
      en: "Energy-Charts, Germany power. Wind and solar against load.",
    },
    licence: "CC BY 4.0",
    sourceHref: "https://energy-charts.info/",
    estimate: null,
    posterBars: posterFrom(clock.slots.map((slot) => ({ hour: slot.hour, value: slot.windSolarGw }))),
  });
  issue.clock = clock;
  issue.prices = priceModel(prices, day.dateBerlin);
  return issue;
}

function buildStorage(day: ResidualDay, fleet: LargeBatteryFleet, todayKey: string): NetzbriefIssue | null {
  const report = buildMoreStorage({ fleet, day, fallback: false, berlinTodayKey: todayKey });
  if (!report.available) {
    return null;
  }
  const step = report.steps.find((item) => item.factor === 5);
  if (!step) {
    return null;
  }
  const nr = storageNumber(day.dateBerlin);
  if (nr < 200) {
    return null;
  }
  const slots: StorageSlot[] = step.points.map((point) => ({
    hour: point.hour,
    residualGw: point.residualMw / 1000,
    chargeGw: point.chargeMw / 1000,
    dischargeGw: point.dischargeMw / 1000,
  }));
  let lo = 0;
  let hi = 0;
  for (const slot of slots) {
    lo = Math.min(lo, slot.residualGw);
    hi = Math.max(hi, slot.residualGw, slot.residualGw + slot.chargeGw);
  }
  const axis = niceAxis(lo, hi);
  const issue = baseIssue({
    nr,
    format: "speicher",
    dateKey: day.dateBerlin,
    statement: step.reading,
    source: report.footnote ?? {
      de: "Energy-Charts und Battery Charts. Die Vervielfachung ist eine Modellschätzung, kein Ausbauziel.",
      en: "Energy-Charts and Battery Charts. The multiple is a model estimate, not a build target.",
    },
    licence: "CC BY 4.0 · MaStR dl-de/by-2-0",
    sourceHref: fleet.chartUrl,
    estimate: {
      de: "Modellschätzung · kein Ausbauziel",
      en: "Model estimate · not a build target",
    },
    posterBars: posterFrom(slots.map((slot) => ({ hour: slot.hour, value: slot.residualGw }))),
  });
  issue.storage = {
    slots,
    yMinGw: axis.min,
    yMaxGw: axis.max,
    yTicksGw: axis.ticks,
    storedShare: step.storedShare,
    peakReductionGw: step.peakReductionGw,
    eveningPeakGw: step.eveningPeakGw,
    model: {
      de: "Start leer, 90 % Wirkungsgrad, nur Überschuss, Entladung ab 17 Uhr",
      en: "Starts empty, 90% efficiency, surplus only, discharge from 17:00",
    },
  };
  return issue;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildNorth(dateKey: string, slots: ZoneQuarter[], todayKey: string): NetzbriefIssue | null {
  if (dateKey > todayKey || slots.length < 4 || daysAfter(WEEK_EPOCH, mondayOf(dateKey)) < 0) {
    return null;
  }
  const axis = mirrorShareAxis(slots.flatMap((slot) => [slot.northPct, slot.southPct]));
  const north = mean(slots.map((slot) => slot.northPct));
  const south = mean(slots.map((slot) => slot.southPct));
  const label = dateLabel(dateKey);
  const issue = baseIssue({
    nr: northNumber(dateKey),
    format: "nord-sued",
    dateKey,
    statement: {
      de: `Am ${label.de} decken Wind und Photovoltaik in der Regelzone 50Hertz im Mittel ${qty(north, "de", 0)} % der Last, in der Regelzone TransnetBW ${qty(south, "de", 0)} %. Im Norden steht mehr Wind als im Süden.`,
      en: `On ${label.en}, wind and solar cover ${qty(north, "en", 0)}% of load on average in the 50Hertz control area and ${qty(south, "en", 0)}% in the TransnetBW control area. The north has more wind than the south.`,
    },
    source: {
      de: "SMARD, Regelzone 50Hertz (Wind an Land, Wind auf See, Photovoltaik, Last) und TransnetBW (Wind an Land, Photovoltaik, Last). Der Anteil gilt für die Regelzone, nicht für die Stadt Hamburg.",
      en: "SMARD, the 50Hertz control area (onshore wind, offshore wind, solar, load) and TransnetBW (onshore wind, solar, load). The share is the control area, not the city of Hamburg.",
    },
    licence: "CC BY 4.0 · Bundesnetzagentur | SMARD.de",
    sourceHref: "https://www.smard.de/",
    estimate: null,
    posterBars: posterFrom(slots.map((slot) => ({ hour: slot.hour, value: slot.northPct - slot.southPct }))),
  });
  issue.zones = {
    slots: slots.map((slot) => ({ hour: slot.hour, northPct: slot.northPct, southPct: slot.southPct })),
    maxPct: axis.max,
    ticks: axis.ticks,
    lineAt100: axis.lineAt100,
  };
  return issue;
}

function buildExplained(peak: PeakDayInput): NetzbriefIssue | null {
  if (peak.slots.length < 4 || !(peak.limitKw > 0)) {
    return null;
  }
  const beforeKw = Math.max(...peak.slots.map((slot) => slot.beforeKw));
  const afterKw = Math.max(...peak.slots.map((slot) => slot.afterKw));
  const axis = niceAxis(Math.min(0, ...peak.slots.flatMap((slot) => [slot.beforeKw, slot.afterKw])), Math.max(beforeKw, afterKw, peak.limitKw));
  const issue = baseIssue({
    nr: 1,
    format: "erklaert",
    dateKey: UHR_EPOCH,
    statement: {
      de: `Im Supermarkt-Beispiel liegt die Bezugsspitze ohne Speicher bei ${qty(beforeKw, "de", 0)} kW und mit Speicher bei ${qty(afterKw, "de", 0)} kW. Der Anschluss ist ${qty(peak.limitKw, "de", 0)} kW.`,
      en: `In the supermarket example the import peak is ${qty(beforeKw, "en", 0)} kW without storage and ${qty(afterKw, "en", 0)} kW with storage. The connection is ${qty(peak.limitKw, "en", 0)} kW.`,
    },
    source: {
      de: "Beispieldaten. Fiktives Profil eines Supermarkts, kein Messwert.",
      en: "Example data. A fictional supermarket profile, not a measurement.",
    },
    licence: "Beispieldaten",
    sourceHref: "/methodik#beispiele",
    estimate: { de: "Beispieldaten", en: "Example data" },
    posterBars: posterFrom(peak.slots.map((slot) => ({ hour: slot.hour, value: slot.beforeKw }))),
  });
  issue.peak = {
    slots: peak.slots,
    limitKw: peak.limitKw,
    beforeKw,
    afterKw,
    yMax: axis.max,
    yTicks: axis.ticks,
  };
  return issue;
}

function bestSurplusDay(days: ResidualDay[]): ResidualDay | null {
  let best: ResidualDay | null = null;
  let bestEnergy = 0;
  for (const day of days) {
    const energy = windSolarSurplusMwh(day.slots);
    if (energy > bestEnergy) {
      best = day;
      bestEnergy = energy;
    }
  }
  return best;
}

export function buildNetzbriefCatalog(input: CatalogInput): NetzbriefIssue[] {
  const issues: NetzbriefIssue[] = [];
  const explained = buildExplained(input.peak);
  if (explained) {
    issues.push(explained);
  }
  for (const day of input.days) {
    const uhr = buildUhr(day, input.todayKey, input.prices);
    if (uhr && !issues.some((issue) => issue.nr === uhr.nr)) {
      issues.push(uhr);
    }
  }
  if (input.fleet) {
    const weeks = new Map<string, ResidualDay[]>();
    for (const day of input.days) {
      if (day.dateBerlin > input.todayKey) {
        continue;
      }
      const key = mondayOf(day.dateBerlin);
      const list = weeks.get(key) ?? [];
      list.push(day);
      weeks.set(key, list);
    }
    for (const days of weeks.values()) {
      const day = bestSurplusDay(days);
      if (!day) {
        continue;
      }
      const issue = buildStorage(day, input.fleet, input.todayKey);
      if (issue && !issues.some((existing) => existing.nr === issue.nr)) {
        issues.push(issue);
      }
    }
  }
  const zoneWeeks = new Map<string, { dateKey: string; slots: ZoneQuarter[] }>();
  for (const day of input.zones) {
    if (day.dateKey > input.todayKey) {
      continue;
    }
    const key = mondayOf(day.dateKey);
    const current = zoneWeeks.get(key);
    if (!current || day.slots.length > current.slots.length) {
      zoneWeeks.set(key, day);
    }
  }
  for (const day of zoneWeeks.values()) {
    const issue = buildNorth(day.dateKey, day.slots, input.todayKey);
    if (issue && !issues.some((existing) => existing.nr === issue.nr)) {
      issues.push(issue);
    }
  }
  for (const issue of issues) {
    const blob = `${issue.statement.de} ${issue.statement.en} ${issue.source.de}`;
    if (TRADING.test(blob)) {
      throw new Error(`Netzbrief ${issue.nr} uses trading language`);
    }
  }
  return issues.sort((left, right) => right.dateKey.localeCompare(left.dateKey) || right.nr - left.nr);
}

export function issueCsv(issue: NetzbriefIssue): string {
  const lines = [
    `# ${issue.frame}`,
    `# ${issue.dateKey}`,
    `# ${issue.source.de}`,
    `# ${issue.licence}`,
  ];
  if (issue.clock) {
    lines.push("zeit,wind_sonne_gw,ueberschuss");
    for (const slot of issue.clock.slots) {
      lines.push(`${hourLabel(slot.hour)},${slot.windSolarGw.toFixed(3)},${slot.surplus ? 1 : 0}`);
    }
  }
  if (issue.prices) {
    lines.push("zeit,eur_pro_mwh");
    for (const slot of issue.prices.slots) {
      lines.push(`${hourLabel(slot.hour)},${slot.eurPerMwh.toFixed(2)}`);
    }
  }
  if (issue.storage) {
    lines.push("zeit,residuallast_gw,gespeichert_gw,entladen_gw");
    for (const slot of issue.storage.slots) {
      lines.push(`${hourLabel(slot.hour)},${slot.residualGw.toFixed(3)},${slot.chargeGw.toFixed(3)},${slot.dischargeGw.toFixed(3)}`);
    }
  }
  if (issue.zones) {
    lines.push("zeit,anteil_50hertz_prozent,anteil_transnetbw_prozent");
    for (const slot of issue.zones.slots) {
      lines.push(`${hourLabel(slot.hour)},${slot.northPct.toFixed(2)},${slot.southPct.toFixed(2)}`);
    }
  }
  if (issue.peak) {
    lines.push("zeit,ohne_speicher_kw,mit_speicher_kw,anschluss_kw");
    for (const slot of issue.peak.slots) {
      lines.push(`${hourLabel(slot.hour)},${slot.beforeKw.toFixed(2)},${slot.afterKw.toFixed(2)},${issue.peak.limitKw.toFixed(2)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function hourClock(hour: number): string {
  return hourLabel(hour);
}

export function slotHour(slot: ResidualSlot): number {
  return slot.hourBerlin + slot.minuteBerlin / 60;
}
