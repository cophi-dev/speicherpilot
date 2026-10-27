import { readFileSync } from "fs";
import path from "path";

import { parseDayAheadPrices, type DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { dispatchReferencePark } from "@/lib/referenceParkModelDay";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { beispieltageFileSchema, type BeispieltageFile, type Beispieltag } from "@/lib/beispieltageSchema";

const POWER_MW = 103.5;
const ENERGY_MWH = 238.5;
const QUARTER_H = 0.25;

const RAW_DIR = path.join(process.cwd(), "scripts", "beispieltage-raw");

type DayMeta = {
  id: Beispieltag["id"];
  dateBerlin: string;
  role: Beispieltag["role"];
  holidayNameDe?: string;
  whyDe: string;
  whyEn: string;
  context?: Beispieltag["context"];
};

const DAY_META: readonly DayMeta[] = [
  {
    id: "feiertag-negativ",
    dateBerlin: "2026-05-01",
    role: "top1",
    holidayNameDe: "Tag der Arbeit",
    whyDe: "Feiertag, Geld fürs Laden",
    whyEn: "Holiday, paid to charge",
    context: {
      solarMaxGw: 48.3,
      windMeanGw: 11.1,
      source: "Energy-Charts /public_power?country=de, Abruf 27.10.2026, teils vorläufig",
    },
  },
  {
    id: "abendspitze",
    dateBerlin: "2026-06-24",
    role: "top-ohne-negativ",
    whyDe: "Abendspitze",
    whyEn: "Evening peak",
    context: {
      solarMaxGw: 55.7,
      windMeanGw: 1.7,
      source: "Energy-Charts /public_power?country=de, Abruf 27.10.2026, teils vorläufig",
    },
  },
  {
    id: "herbst",
    dateBerlin: "2026-09-14",
    role: "jahreszeit",
    whyDe: "Herbst",
    whyEn: "Autumn",
    context: {
      solarMaxGw: 37.6,
      windMeanGw: 3.6,
      source: "Energy-Charts /public_power?country=de, Abruf 27.10.2026, teils vorläufig",
    },
  },
  {
    id: "normaltag",
    dateBerlin: "2026-04-14",
    role: "median",
    whyDe: "normaler Tag",
    whyEn: "ordinary day",
    context: {
      solarMaxGw: 27.6,
      windMeanGw: 6.8,
      source: "Energy-Charts /public_power?country=de, Abruf 27.10.2026, teils vorläufig",
    },
  },
];

type YearDay = { d: string; u: number[]; p: number[] };

function cents(value: number): number {
  return Math.round(value * 100);
}

function roundDigits(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function berlinWeekdayName(dateKey: string, language: "de" | "en"): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatBerlinLongDate(dateKey: string, language: "de" | "en"): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date(`${dateKey}T12:00:00Z`))
    .replace(/\u00a0/g, " ");
}

function loadDayPrices(dateBerlin: string): DayAheadPricePoint[] {
  const body = JSON.parse(readFileSync(path.join(RAW_DIR, `${dateBerlin}.json`), "utf8")) as unknown;
  return parseDayAheadPrices(body);
}

function cashParts(result: NonNullable<ReturnType<typeof dispatchReferencePark>>): { chargingCents: number; dischargingCents: number } {
  let charging = 0;
  let discharging = 0;
  for (const quarter of result.quarters) {
    const cash = quarter.powerMw * QUARTER_H * quarter.priceProxyEurPerMwh;
    if (quarter.powerMw < -1e-9) {
      charging += cash;
    } else if (quarter.powerMw > 1e-9) {
      discharging += cash;
    }
  }
  return { chargingCents: cents(charging), dischargingCents: cents(discharging) };
}

export function dayRevenueX1(prices: DayAheadPricePoint[], dateBerlin: string): number | null {
  const result = dispatchReferencePark({ prices, dateBerlin, powerMw: POWER_MW, energyMwh: ENERGY_MWH });
  if (!result) {
    return null;
  }
  const parts = cashParts(result);
  return (parts.chargingCents + parts.dischargingCents) / 100;
}

function buildDay(meta: DayMeta, rank: number): Beispieltag {
  const prices = loadDayPrices(meta.dateBerlin);
  const result = dispatchReferencePark({
    prices,
    dateBerlin: meta.dateBerlin,
    powerMw: POWER_MW,
    energyMwh: ENERGY_MWH,
  });
  if (!result) {
    throw new Error(`dispatch failed for ${meta.dateBerlin}`);
  }
  const parts = cashParts(result);
  const x1 = (parts.chargingCents + parts.dischargingCents) / 100;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let argmin = 0;
  let argmax = 0;
  let negative = 0;
  result.quarters.forEach((quarter, index) => {
    const price = quarter.priceProxyEurPerMwh;
    if (price < 0) {
      negative += 1;
    }
    if (price < min) {
      min = price;
      argmin = index;
    }
    if (price > max) {
      max = price;
      argmax = index;
    }
  });
  const titleDe = formatBerlinLongDate(meta.dateBerlin, "de");
  const titleEn = formatBerlinLongDate(meta.dateBerlin, "en");
  return {
    id: meta.id,
    dateBerlin: meta.dateBerlin,
    weekday: berlinWeekdayName(meta.dateBerlin, "de"),
    ...(meta.holidayNameDe ? { holidayNameDe: meta.holidayNameDe } : {}),
    role: meta.role,
    prices: result.quarters.map((quarter) => quarter.priceProxyEurPerMwh),
    slotStartIso: result.quarters.map((quarter) => quarter.timestampIso),
    dispatch: {
      powerMw: result.powerDispatchMw.map((value) => roundDigits(value, 8)),
      socPct: result.socPct.map((value) => roundDigits(value, 8)),
    },
    revenueEur: { x1, x2: x1 * 2, x5: x1 * 5, x10: x1 * 10 },
    parts: {
      chargingEur: parts.chargingCents / 100,
      dischargingEur: parts.dischargingCents / 100,
    },
    chargedFromGridMwh: roundDigits(result.economics.energyChargedFromGridMwh, 6),
    dischargedToGridMwh: roundDigits(result.economics.energyDischargedToGridMwh, 6),
    fullCycles: roundDigits(result.fullCyclesToday, 6),
    negativeQuarterHours: negative,
    stats: {
      minEurPerMwh: min,
      maxEurPerMwh: max,
      spreadEurPerMwh: roundDigits(max - min, 2),
      argminIso: result.quarters[argmin]!.timestampIso,
      argmaxIso: result.quarters[argmax]!.timestampIso,
    },
    rankByModelRevenueX1: rank,
    ...(meta.context ? { context: meta.context } : {}),
    textDe: { title: titleDe, why: meta.whyDe },
    textEn: { title: titleEn, why: meta.whyEn },
  };
}

export type YearRevenue = { dateBerlin: string; revenueX1: number };

/** One model run per Berlin day in the checked-in price year. */
export function yearRevenuesFromRaw(): YearRevenue[] {
  const year = JSON.parse(readFileSync(path.join(RAW_DIR, "year-prices.json"), "utf8")) as { days: YearDay[] };
  return year.days.map((day) => {
    const prices = day.u.map((unixMs, index) => ({ unixMs, eurPerMwh: day.p[index]! }));
    const revenue = dayRevenueX1(prices, day.d);
    if (revenue === null) {
      throw new Error(`year dispatch failed for ${day.d}`);
    }
    return { dateBerlin: day.d, revenueX1: revenue };
  });
}

export function rankAndMedian(rows: readonly YearRevenue[]): { rank: Map<string, number>; medianEur: number; medianDate: string } {
  const descending = [...rows].sort((a, b) => b.revenueX1 - a.revenueX1 || a.dateBerlin.localeCompare(b.dateBerlin));
  const ascending = [...rows].sort((a, b) => a.revenueX1 - b.revenueX1 || a.dateBerlin.localeCompare(b.dateBerlin));
  const middle = ascending[Math.floor(ascending.length / 2)];
  if (!middle || rows.length !== 365) {
    throw new Error(`expected 365 days, got ${rows.length}`);
  }
  return {
    rank: new Map(descending.map((row, index) => [row.dateBerlin, index + 1])),
    medianEur: Math.round(middle.revenueX1),
    medianDate: middle.dateBerlin,
  };
}

function counterExample(): BeispieltageFile["counterExample"] {
  const prices = loadDayPrices("2026-04-05");
  const revenue = dayRevenueX1(prices, "2026-04-05");
  if (revenue === null) {
    throw new Error("easter dispatch failed");
  }
  const negative = prices.filter((point) => point.eurPerMwh < 0).length;
  const rounded = Math.round(revenue);
  return {
    dateBerlin: "2026-04-05",
    negativeQuarterHours: negative,
    revenueX1: rounded,
    textDe: `Ostersonntag, 5. April 2026: ${negative} negative Viertelstunden, im Modell trotzdem nur rund 13.800 €. Der Abendpreis lag bei 36 €/MWh. Negative Preise allein heißen nicht viel Erlös.`,
    textEn: `Easter Sunday, 5 April 2026: ${negative} negative quarter-hours, and still only about €13,800 in the model. The evening price was €36/MWh. Negative prices alone do not mean much revenue.`,
  };
}

export function buildBeispieltageFile(year = yearRevenuesFromRaw()): BeispieltageFile {
  const { rank, medianEur } = rankAndMedian(year);
  const file = {
    schemaVersion: 1 as const,
    retrievedIso: "2026-10-27",
    windowDe: "27.10.2025 bis 26.10.2026 (365 Tage)",
    sources: {
      prices: {
        name: "Energy-Charts (Bundesnetzagentur | SMARD.de)",
        url: "https://api.energy-charts.info/v2/price?bzn=DE-LU",
        licence: "CC BY 4.0",
        retrievedIso: "2026-10-27",
      },
      context: {
        name: "Energy-Charts public_power",
        url: "https://api.energy-charts.info/public_power?country=de",
        retrievedIso: "2026-10-27",
        noteDe: "Kontext für einen Erklärsatz. Teils vorläufig. Geht nicht in den Erlös ein.",
      },
    },
    park: {
      nameDe: "Großspeicher Bollingstedt",
      powerMw: POWER_MW,
      energyMwh: ENERGY_MWH,
      roundTrip: ROUND_TRIP_EFFICIENCY,
      socWindow: [0.1, 0.9] as [number, number],
      socStart: 0.5,
      coreRef: "lib/referenceParkModelDay.ts@2699619",
    },
    scales: [1, 2, 5, 10] as [1, 2, 5, 10],
    selectionRule: {
      de: "Warum diese Tage? 1. Der Tag mit dem höchsten Modellerlös. 2. Der beste Tag ohne negative Preise. 3. Der jüngste Tag aus den ersten zehn, aus einer anderen Jahreszeit. 4. Der mittlere Tag als Vergleich.",
      en: "Why these days? 1. The day with the highest model revenue. 2. The best day without negative prices. 3. The most recent of the first ten, from another season. 4. The middle day as a comparison.",
    },
    medianDayRevenueX1: medianEur,
    counterExample: counterExample(),
    days: DAY_META.map((meta) => buildDay(meta, rank.get(meta.dateBerlin) ?? 0)) as BeispieltageFile["days"],
  };
  return beispieltageFileSchema.parse(file);
}
