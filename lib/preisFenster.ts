import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { getBerlinDateKeyFromUnixSeconds } from "@/lib/berlinCalendar";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { formatQuantity } from "@/lib/formatQuantity";

/** Usable window of the fleet model: 10–90 % of nameplate. */
export const PREIS_FENSTER_USABLE_SHARE = 0.8;
export const PREIS_FENSTER_QUARTER_H = 0.25;

export type PreisTick = {
  hm: string;
  eurPerMwh: number;
};

export type DauerSpanne = {
  /** Quarter-hours that fill the usable energy at nameplate power. */
  n: number;
  usableGwh: number;
  hoursAtPower: number;
  meanLow: number;
  meanHigh: number;
  /** mean(n dearest) − mean(n cheapest), €/MWh. Not revenue. */
  dauerSpanne: number;
  low: PreisTick[];
  high: PreisTick[];
  /** Every cheap quarter ends before the first dear quarter. */
  reihenfolge: boolean;
};

export function berlinHmFromUnixMs(unixMs: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(unixMs));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Quarter-hours of one Berlin day, in time order. Other days are dropped. */
export function berlinDayPrices(points: DayAheadPricePoint[], dateKey: string): PreisTick[] {
  return points
    .filter((point) => getBerlinDateKeyFromUnixSeconds(Math.floor(point.unixMs / 1000)) === dateKey)
    .filter((point) => Number.isFinite(point.eurPerMwh))
    .sort((left, right) => left.unixMs - right.unixMs)
    .map((point) => ({ hm: berlinHmFromUnixMs(point.unixMs), eurPerMwh: point.eurPerMwh }));
}

/** How many quarter-hours the usable energy needs at nameplate power. */
export function fleetQuarterCount(powerGw: number, energyGwh: number): number | null {
  if (!(powerGw > 0) || !(energyGwh > 0)) {
    return null;
  }
  const hours = (PREIS_FENSTER_USABLE_SHARE * energyGwh) / powerGw;
  const n = Math.floor(hours / PREIS_FENSTER_QUARTER_H + 1e-9);
  return n >= 1 ? n : null;
}

function hmToMinutes(hm: string): number {
  const [hour, minute] = hm.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }
  return hour * 60 + minute;
}

/**
 * Duration-matched price gap of one day.
 * n = floor((0.8 × E / P) / 0.25). Ties keep the earlier quarter on the cheap side.
 */
export function computeDauerSpanne(
  points: PreisTick[],
  powerGw: number,
  energyGwh: number,
): DauerSpanne | null {
  const n = fleetQuarterCount(powerGw, energyGwh);
  if (n === null || points.length < n * 2) {
    return null;
  }
  const sorted = [...points].sort(
    (left, right) => left.eurPerMwh - right.eurPerMwh || left.hm.localeCompare(right.hm),
  );
  const low = sorted.slice(0, n);
  const high = sorted.slice(-n);
  const mean = (rows: PreisTick[]) => rows.reduce((sum, row) => sum + row.eurPerMwh, 0) / rows.length;
  const meanLow = mean(low);
  const meanHigh = mean(high);
  const lastLow = Math.max(...low.map((row) => hmToMinutes(row.hm)));
  const firstHigh = Math.min(...high.map((row) => hmToMinutes(row.hm)));
  return {
    n,
    usableGwh: PREIS_FENSTER_USABLE_SHARE * energyGwh,
    hoursAtPower: (PREIS_FENSTER_USABLE_SHARE * energyGwh) / powerGw,
    meanLow,
    meanHigh,
    dauerSpanne: meanHigh - meanLow,
    low: [...low].sort((left, right) => left.hm.localeCompare(right.hm)),
    high: [...high].sort((left, right) => left.hm.localeCompare(right.hm)),
    reihenfolge: lastLow < firstHigh,
  };
}

function roundedRange(pmin: number, pmax: number): string {
  return `${formatQuantity(Math.round(pmin), "de", 0)}–${formatQuantity(Math.round(pmax), "de", 0)} €/MWh`;
}

/** Price clause for a day that already has min and max. Null when the series is missing. */
export function boerseKlausel(
  record: Pick<TagesKennzahlRecord, "pmin" | "pmax" | "negH">,
): string | null {
  if (record.pmin === null || record.pmax === null) {
    return null;
  }
  const range = roundedRange(record.pmin, record.pmax);
  if ((record.negH ?? 0) >= PREIS_FENSTER_QUARTER_H) {
    return `${range}, ${formatQuantity(record.negH ?? 0, "de", 1)} Stunden unter null`;
  }
  return `${range}, keine Viertelstunde unter null`;
}

/** Footnote under the 30-day hero when the day itself has no surplus. */
export function dryDayFootnote(
  dayLabel: string,
  record: Pick<TagesKennzahlRecord, "pmin" | "pmax" | "negH">,
): string {
  const klausel = boerseKlausel(record);
  if (!klausel) {
    return `Gestern (${dayLabel}) ohne Überschuss zum Laden aus Wind und Sonne.`;
  }
  return `Gestern (${dayLabel}) ohne Überschuss zum Laden. Börse ${klausel}.`;
}

/** One sentence under the price curve. Duration gap is a price statistic, not revenue. */
export function preisFigurSatz(args: {
  surplusGwh: number;
  dauer: DauerSpanne | null;
}): string {
  const leer =
    args.surplusGwh < 0.05 ? "Das Überschuss-Modell lädt an diesem Tag nicht. " : "";
  if (!args.dauer) {
    return `${leer}Die Börsenkurve ist der Day-Ahead-Preis. Kein Erlös.`;
  }
  const gap = formatQuantity(args.dauer.dauerSpanne, "de", 2);
  const order = args.dauer.reihenfolge
    ? "Die günstigen Viertelstunden liegen vor den teuren."
    : "Die günstigen Viertelstunden liegen nicht geschlossen vor den teuren.";
  return `${leer}Dauer-Spanne ${gap} €/MWh: Mittel der ${args.dauer.n} teuersten minus Mittel der ${args.dauer.n} günstigsten Viertelstunden. ${order} Kein Erlös.`;
}
