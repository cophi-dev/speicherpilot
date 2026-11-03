/**
 * Regel v1 „Auffälligkeit des Tages“ — port of struktur-v4/rechnung/kennzahlen.py
 * Tie-break: Preisspanne before Abendspitze (Brief/spec R2).
 */

import { getBerlinIsoWeekdayForDateKey } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";

export type TagesKennzahlRecord = {
  dateKey: string;
  surplusGwh: number;
  surplusH: number;
  spread: number | null;
  pmin: number | null;
  pminAt: string | null;
  pmax: number | null;
  pmaxAt: string | null;
  negH: number | null;
  eveningPeakGw: number | null;
  eveningPeakAt: string | null;
  peakCutGw: number | null;
  absorbedGwh: number;
  fullAt: string | null;
  /** Minutes from midnight Berlin for fleet-full time; null if never full. */
  fullMin: number | null;
  wsShare: number;
  dryStreak: number;
};

export type MetricKey =
  | "surplus_gwh"
  | "evening_peak_gw"
  | "spread"
  | "pmin"
  | "ws_share"
  | "full_min";

type Direction = "hoch" | "tief";

export type ScoredMetric = {
  key: MetricKey;
  label: string;
  dir: Direction;
  value: number;
  rank: number;
  tie: boolean;
  median: number;
};

const SCHWELDE = 3;

const METRICS: Array<{
  key: MetricKey;
  dir: Direction | "beide";
  label: string;
  eligible: (r: TagesKennzahlRecord) => boolean;
}> = [
  { key: "surplus_gwh", dir: "hoch", label: "Überschuss", eligible: (r) => r.surplusGwh >= 0.05 },
  { key: "spread", dir: "hoch", label: "Preisspanne", eligible: () => true },
  { key: "evening_peak_gw", dir: "beide", label: "Abendspitze", eligible: () => true },
  { key: "pmin", dir: "tief", label: "niedrigster Preis", eligible: () => true },
  { key: "ws_share", dir: "beide", label: "Anteil Wind+Sonne", eligible: () => true },
  { key: "full_min", dir: "tief", label: "Flotte voll um", eligible: (r) => r.fullMin !== null },
];

const PRIO: MetricKey[] = METRICS.map((m) => m.key);

const WORT: Record<string, [string, string]> = {
  "surplus_gwh,hoch": ["viel", "mehr"],
  "evening_peak_gw,hoch": ["hoch", "höher"],
  "evening_peak_gw,tief": ["niedrig", "niedriger"],
  "spread,hoch": ["groß", "größer"],
  "pmin,tief": ["billig", "billiger"],
  "ws_share,hoch": ["viel", "mehr"],
  "ws_share,tief": ["wenig", "weniger"],
  "full_min,tief": ["früh", "früher"],
};

function metricValue(r: TagesKennzahlRecord, key: MetricKey): number | null {
  switch (key) {
    case "surplus_gwh":
      return r.surplusGwh;
    case "evening_peak_gw":
      return r.eveningPeakGw;
    case "spread":
      return r.spread;
    case "pmin":
      return r.pmin;
    case "ws_share":
      return r.wsShare;
    case "full_min":
      return r.fullMin;
    default:
      return null;
  }
}

function historyValues(win: TagesKennzahlRecord[], key: MetricKey): number[] {
  if (key === "surplus_gwh") {
    return win.map((d) => d.surplusGwh ?? 0);
  }
  if (key === "full_min") {
    return win.map((d) => (d.fullMin !== null ? d.fullMin : 24 * 60));
  }
  return win.map((d) => metricValue(d, key)).filter((v): v is number => v !== null);
}

function rankMetric(
  value: number,
  hist: number[],
  dir: Direction
): { rank: number; beat: number; tie: boolean } {
  let beat: number;
  let rank: number;
  if (dir === "hoch") {
    beat = hist.filter((h) => value > h).length;
    rank = 1 + hist.filter((h) => h > value).length;
  } else {
    beat = hist.filter((h) => value < h).length;
    rank = 1 + hist.filter((h) => h < value).length;
  }
  const tie = hist.length - beat - (rank - 1) > 0;
  return { rank, beat, tie };
}

export function scoreDay(records: TagesKennzahlRecord[], dateKey: string): ScoredMetric[] | null {
  const index = records.findIndex((r) => r.dateKey === dateKey);
  if (index < 0) {
    return null;
  }
  const win = records.slice(Math.max(0, index - 30), index);
  if (win.length < 30) {
    return null;
  }
  const r = records[index];
  const out: ScoredMetric[] = [];

  for (const meta of METRICS) {
    if (!meta.eligible(r)) {
      continue;
    }
    const raw = metricValue(r, meta.key);
    if (raw === null) {
      continue;
    }
    let dir: Direction = meta.dir === "beide" ? "hoch" : meta.dir;
    const hist = historyValues(win, meta.key);
    if (meta.dir === "beide") {
      const bh = hist.filter((h) => raw > h).length;
      const bl = hist.filter((h) => raw < h).length;
      dir = bh >= bl ? "hoch" : "tief";
    }
    const { rank, tie } = rankMetric(raw, hist, dir);
    const median = medianOf(hist);
    out.push({
      key: meta.key,
      label: meta.label,
      dir,
      value: raw,
      rank,
      tie,
      median,
    });
  }

  out.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    if (a.tie !== b.tie) {
      return a.tie ? 1 : -1;
    }
    return PRIO.indexOf(a.key) - PRIO.indexOf(b.key);
  });
  return out;
}

function medianOf(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function pickWinner(
  records: TagesKennzahlRecord[],
  dateKey: string,
  previousWinner: ScoredMetric | null
): ScoredMetric | null {
  const scored = scoreDay(records, dateKey);
  if (!scored) {
    return null;
  }
  const candidates = scored.filter((s) => s.rank <= SCHWELDE);
  if (candidates.length === 0) {
    return null;
  }
  const top = candidates[0];
  if (previousWinner && top.key === previousWinner.key && top.dir === previousWinner.dir) {
    const prevIdx = records.findIndex((r) => r.dateKey === dateKey) - 1;
    if (prevIdx >= 0) {
      const prevRecord = records[prevIdx];
      const prevVal = metricValue(prevRecord, top.key);
      const curVal = top.value;
      if (prevVal !== null) {
        const extremer = top.dir === "hoch" ? curVal > prevVal : curVal < prevVal;
        if (!extremer) {
          return candidates[1] ?? null;
        }
      }
    }
  }
  return top;
}

const WEEKDAY_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export function weekdayLabelDe(dateKey: string): string {
  const iso = getBerlinIsoWeekdayForDateKey(dateKey);
  const [, m, d] = dateKey.split("-");
  return `${WEEKDAY_SHORT[iso]}, ${d}.${m}.`;
}

function deNum(x: number, digits = 1): string {
  return formatQuantity(x, "de", digits);
}

function roundGw1(value: number): number {
  return Math.round(value * 10) / 10;
}

function shortDayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return m && d ? `${d}.${m}.` : dateKey;
}

function vergleich(
  rank: number,
  mehr: [string, string],
  tie: boolean,
  opts?: { roundedNearDay?: string }
): string {
  if (opts?.roundedNearDay) {
    return `fast so hoch wie am ${opts.roundedNearDay}`;
  }
  if (rank === 1 && tie) {
    return "gleichauf mit dem Spitzenwert der letzten 30 Tage";
  }
  if (rank === 1) {
    return `so ${mehr[0]} wie an keinem Tag der letzten 30`;
  }
  const n = rank === 2 ? "einem" : "zwei";
  return `nur an ${n} der letzten 30 Tage war es ${mehr[1]}`;
}

function eveningPeakRoundedNearDay(
  records: TagesKennzahlRecord[],
  index: number,
  rank: number,
  dir: Direction
): string | undefined {
  if (rank !== 2 || dir !== "hoch") {
    return undefined;
  }
  const r = records[index];
  const raw = r.eveningPeakGw;
  if (raw === null) {
    return undefined;
  }
  const win = records.slice(Math.max(0, index - 30), index);
  const higher = win.filter((d) => (d.eveningPeakGw ?? Number.NEGATIVE_INFINITY) > raw);
  if (higher.length !== 1) {
    return undefined;
  }
  const ref = higher[0];
  if (roundGw1(ref.eveningPeakGw ?? 0) !== roundGw1(raw)) {
    return undefined;
  }
  return shortDayLabel(ref.dateKey);
}

export type AuffaelligkeitResult =
  | { kind: "metric"; key: MetricKey; headline: string; subline: string; kopfH1: string; kopfSubline: string }
  | { kind: "serie"; headline: string; subline: string; kopfH1: string; kopfSubline: string }
  | { kind: "keine"; headline: string; subline: string; kopfH1: string; kopfSubline: string };

export function auffaelligkeitForDay(
  records: TagesKennzahlRecord[],
  dateKey: string
): AuffaelligkeitResult {
  const index = records.findIndex((r) => r.dateKey === dateKey);
  if (index < 0) {
    throw new Error(`Unknown date ${dateKey}`);
  }
  const r = records[index];
  const prevWinner =
    index > 0 && index >= 30 ? pickWinner(records, records[index - 1].dateKey, null) : null;
  const top = pickWinner(records, dateKey, prevWinner);

  if (!top && r.dryStreak >= 3) {
    const lastSurplus = [...records.slice(0, index)].reverse().find((d) => d.surplusGwh >= 0.05);
    const headline = `${weekdayLabelDe(dateKey)}: der ${r.dryStreak}. Tag in Folge ohne Überschuss. Zuletzt war am ${lastSurplus ? weekdayLabelDe(lastSurplus.dateKey) : "—"} Strom übrig. Speicher hatten im Modell seitdem nichts zum Laden.`;
    return { kind: "serie", headline, subline: "", kopfH1: headline, kopfSubline: "" };
  }

  if (!top) {
    const surplusPart =
      r.surplusGwh < 0.05 ? "Kein Überschuss" : `${deNum(r.surplusGwh)} GWh Überschuss`;
    const headline = `${weekdayLabelDe(dateKey)}: ein unauffälliger Tag. ${surplusPart}, Abendspitze ${deNum(r.eveningPeakGw ?? 0)} GW um ${r.eveningPeakAt ?? "—"} Uhr. Kein Wert lag unter den drei extremsten der letzten 31 Tage.`;
    return { kind: "keine", headline, subline: "", kopfH1: headline, kopfSubline: "" };
  }

  const w = WORT[`${top.key},${top.dir}`] ?? ["", ""];
  const nearDay =
    top.key === "evening_peak_gw" ? eveningPeakRoundedNearDay(records, index, top.rank, top.dir) : undefined;
  const V = vergleich(top.rank, w, top.tie, nearDay ? { roundedNearDay: nearDay } : undefined);
  const Vcap = (() => {
    const c = V.charAt(0).toUpperCase() + V.slice(1);
    return c.endsWith(".") ? c : `${c}.`;
  })();

  let headline = "";
  let subline = "";
  let kopfH1 = "";
  let kopfSubline = "";

  switch (top.key) {
    case "surplus_gwh":
      headline = `${weekdayLabelDe(dateKey)}: ${deNum(r.surplusGwh)} GWh Strom aus Wind und Sonne waren übrig, ${deNum(r.surplusH, 2).replace(/,?0+$/, "")} Stunden lang. ${Vcap}.`;
      subline = `Die heutige Flotte hätte ${deNum(r.absorbedGwh)} GWh davon aufgenommen (Modell).`;
      kopfH1 = "Aus Wind und Sonne blieb an diesem Tag viel Strom übrig.";
      kopfSubline = `${Vcap}. ${subline}`;
      break;
    case "evening_peak_gw":
      headline = `${weekdayLabelDe(dateKey)}: Am Abend mussten andere Quellen bis zu ${deNum(r.eveningPeakGw ?? 0)} GW decken (${r.eveningPeakAt ?? "—"} Uhr). ${Vcap}`;
      kopfH1 = nearDay
        ? `Am Abend mussten andere Quellen fast so viel wie am ${nearDay} decken.`
        : "Am Abend mussten andere Quellen besonders viel decken.";
      subline =
        (r.peakCutGw ?? 0) < 0.05
          ? "Im Modell hätten Speicher hier nicht geholfen: Vorher gab es keinen Überschuss zum Laden."
          : `Die heutige Flotte hätte die Spitze um ${deNum(r.peakCutGw ?? 0)} GW gesenkt (Modell).`;
      kopfSubline = subline ? `${Vcap}. ${subline}` : Vcap;
      break;
    case "spread":
      headline = `${weekdayLabelDe(dateKey)}: Der Börsenpreis lag zwischen ${deNum(r.pmin ?? 0, 0)} und ${deNum(r.pmax ?? 0, 0)} €/MWh. ${Vcap}`;
      kopfH1 = "Der Börsenpreis bewegte sich in einer großen Spanne.";
      kopfSubline = Vcap;
      break;
    case "pmin":
      headline = `${weekdayLabelDe(dateKey)}: Strom kostete an der Börse zeitweise ${deNum(r.pmin ?? 0, 2)} €/MWh (${r.pminAt ?? "—"} Uhr). ${Vcap}.`;
      if (r.negH) {
        headline += ` ${deNum(r.negH, 2)} Stunden lag der Preis unter null.`;
      }
      kopfH1 = "An der Börse gab es zeitweise sehr niedrige Preise.";
      kopfSubline = Vcap;
      break;
    case "ws_share":
      headline = `${weekdayLabelDe(dateKey)}: Wind und Sonne deckten${top.dir === "tief" ? " nur" : ""} ${deNum(r.wsShare, 1)} % der Last, ${V}.`;
      kopfH1 =
        top.dir === "tief"
          ? "Wind und Sonne deckten nur einen kleinen Teil der Last."
          : "Wind und Sonne deckten einen großen Teil der Last.";
      kopfSubline = Vcap;
      break;
    case "full_min":
      headline = `${weekdayLabelDe(dateKey)}: Die Speicherflotte war im Modell schon um ${r.fullAt ?? "—"} Uhr voll, ${V}. Der restliche Überschuss ging an ihr vorbei.`;
      kopfH1 = "Im Modell war die Speicherflotte an diesem Tag früh voll.";
      kopfSubline = Vcap;
      break;
    default:
      headline = `${weekdayLabelDe(dateKey)}: ${Vcap}.`;
  }

  if (!kopfH1) {
    kopfH1 = headline;
  }
  if (!kopfSubline) {
    kopfSubline = subline;
  }

  return { kind: "metric", key: top.key, headline, subline, kopfH1, kopfSubline };
}

/** Metric shown in the Kopf (number, bars, rank) — same as Regel v1 winner. */
export function kopfMetric(records: TagesKennzahlRecord[], dateKey: string): ScoredMetric | null {
  const index = records.findIndex((r) => r.dateKey === dateKey);
  if (index < 0) {
    return null;
  }
  const prevWinner =
    index > 0 && index >= 30 ? pickWinner(records, records[index - 1].dateKey, null) : null;
  return pickWinner(records, dateKey, prevWinner);
}

/** Round GW/GWh for display; ranking uses raw values. */
export function displayGw(gw: number | null): string {
  if (gw === null) {
    return "—";
  }
  return deNum(gw, 1);
}

export function attachDryStreaks(records: TagesKennzahlRecord[]): TagesKennzahlRecord[] {
  let streak = 0;
  return records.map((r) => {
    streak = r.surplusGwh >= 0.05 ? 0 : streak + 1;
    return { ...r, dryStreak: streak };
  });
}
