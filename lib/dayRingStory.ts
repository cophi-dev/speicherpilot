import type { AppLanguage } from "@/components/language-context";
import { getBerlinIsoWeekdayForDateKey, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  LIVE_DISPATCH_FACTORS,
  type LiveDispatchFactor,
  type LiveDispatchPoint,
  type LiveDispatchStory,
} from "@/lib/liveFleetDispatch";

const WEEKDAY_DE = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const WEEKDAY_EN = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_SHORT_DE = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAY_SHORT_EN = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SURPLUS_EPS_GWH = 0.05;

/** Screen-reader sentence for the /live ring. Values are rounded once. */
export function liveClockCaption(
  beforeGw: number | null,
  afterGw: number | null,
  factor: number,
  language: AppLanguage
): string {
  if (beforeGw === null || afterGw === null || !Number.isFinite(beforeGw) || !Number.isFinite(afterGw)) {
    return language === "de"
      ? "Residuallast über 24 Stunden, ohne Abendspitze."
      : "Residual load over 24 hours, with no evening peak.";
  }
  const ohne = formatGw1(beforeGw, language);
  const mit = formatGw1(afterGw, language);
  return language === "de"
    ? `Residuallast über 24 Stunden, Abendspitze ${ohne} GW ohne, ${mit} GW mit Speicher ×${factor}.`
    : `Residual load over 24 hours, evening peak ${ohne} GW without storage, ${mit} GW with storage ×${factor}.`;
}

/** Mean residual load of each clock hour, in GW. One row per hour, for the screen-reader table. */
export function hourlyResidualGw(points: LiveDispatchPoint[]): Array<{ hour: number; ohneGw: number; mitGw: number }> {
  return Array.from({ length: 24 }, (_, hour) => {
    const slice = points.filter((point) => point.hour >= hour && point.hour < hour + 1);
    const mean = (pick: (point: LiveDispatchPoint) => number) =>
      slice.length === 0 ? Number.NaN : slice.reduce((sum, point) => sum + pick(point), 0) / slice.length;
    return {
      hour,
      ohneGw: mean((point) => point.ohneMw / 1000),
      mitGw: mean((point) => point.mitMw / 1000),
    };
  });
}

/** One decimal from the unrounded gigawatt value. */
export function roundGw1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Peak cut, rounded once from the unrounded peaks.
 * A positive number means the evening peak fell.
 */
export function onceRoundDeltaGw(beforeGw: number, afterGw: number): number {
  return Math.round((beforeGw - afterGw) * 10) / 10;
}

export function formatGw1(value: number, language: AppLanguage): string {
  return formatQuantity(roundGw1(value), language, 1);
}

export function formatGwh(value: number, language: AppLanguage): string {
  const digits = Math.abs(value) >= 1 ? 1 : 2;
  return formatQuantity(value, language, digits);
}

/** Signed one-decimal gigawatts, unicode minus. */
export function formatSignedGw(value: number, language: AppLanguage): string {
  const shown = roundGw1(value);
  const body = formatQuantity(Math.abs(shown), language, 1);
  if (shown < 0) {
    return `−${body}`;
  }
  if (shown > 0) {
    return `+${body}`;
  }
  return body;
}

/** Absolute evening peak, plus the cut rounded once from the raw peaks. */
export function eveningPeakStat(
  beforeGw: number | null,
  afterGw: number | null,
  language: AppLanguage
): { value: string; note: string } | null {
  if (beforeGw === null || afterGw === null || !Number.isFinite(beforeGw) || !Number.isFinite(afterGw)) {
    return null;
  }
  const signed = formatSignedGw(-onceRoundDeltaGw(beforeGw, afterGw), language);
  return {
    value: formatGw1(afterGw, language),
    note: language === "de" ? `${signed} GW gegenüber ohne Speicher` : `${signed} GW vs. no storage`,
  };
}

/** Callout copy. Residual-load values keep the sign from the data. */
export function ringCalloutText(
  id: CalloutAnchor["id"] | "load",
  gw: number,
  language: AppLanguage,
  evening?: { before: number | null; after: number | null }
): string {
  if (id === "midday") {
    const shown = formatSignedGw(gw, language);
    return language === "de" ? `Überschuss ${shown}` : `Surplus ${shown}`;
  }
  if (id === "evening" && evening?.after != null) {
    const before = formatGw1(evening.before ?? gw, language);
    const after = formatGw1(evening.after, language);
    return language === "de" ? `Abend ${before}→${after}` : `Evening ${before}→${after}`;
  }
  const shown = formatSignedGw(gw, language);
  if (id === "night") {
    return language === "de" ? `Nacht ${shown}` : `Night ${shown}`;
  }
  return language === "de" ? `Last ${shown}` : `Load ${shown}`;
}

export function formatBerlinDayLabel(dateBerlin: string): string {
  const [year, month, day] = dateBerlin.split("-");
  return year && month && day ? `${day}.${month}.${year}` : dateBerlin;
}

export function weekdayIndex(dateBerlin: string): number {
  return getBerlinIsoWeekdayForDateKey(dateBerlin);
}

export function weekdayName(dateBerlin: string, language: AppLanguage): string {
  const index = weekdayIndex(dateBerlin);
  return language === "de" ? WEEKDAY_DE[index] : WEEKDAY_EN[index];
}

export function weekdayShort(dateBerlin: string, language: AppLanguage): string {
  const index = weekdayIndex(dateBerlin);
  return language === "de" ? WEEKDAY_SHORT_DE[index] : WEEKDAY_SHORT_EN[index];
}

export function dayHasSurplus(surplusGwh: number): boolean {
  return surplusGwh > SURPLUS_EPS_GWH;
}

export function heroSentence(input: { dateBerlin: string; todayKey: string; surplusGwh: number }): { de: string; en: string } {
  const nameDe = weekdayName(input.dateBerlin, "de");
  const nameEn = weekdayName(input.dateBerlin, "en");
  if (dayHasSurplus(input.surplusGwh)) {
    return {
      de: `Am ${nameDe} hatte der Mittag Strom übrig, den der Abend gebraucht hätte.`,
      en: `On ${nameEn}, midday had power left over that the evening would have needed.`,
    };
  }
  const yesterday = prevBerlinDateKey(input.todayKey) === input.dateBerlin;
  if (yesterday) {
    return {
      de: "Gestern gab es keinen Überschuss – Speicher hätten im Modell nichts zu verschieben.",
      en: "Yesterday there was no surplus – in the model, storage would have had nothing to shift.",
    };
  }
  const date = formatBerlinDayLabel(input.dateBerlin);
  return {
    de: `Am ${nameDe}, dem ${date}, gab es keinen Überschuss – Speicher hätten im Modell nichts zu verschieben.`,
    en: `On ${nameEn} ${date} there was no surplus – in the model, storage would have had nothing to shift.`,
  };
}

/**
 * Factor-aware charged sentence.
 * ×1 names today’s fleet. ×n names that multiple, because the gigawatt-hours are not today’s fleet alone.
 */
export type ChargedSentenceParts = { before: string; amount: string; after: string };

/** Same sentence as `chargedWouldHave`, split so only the amount is set in mono. */
export function chargedWouldHaveParts(
  chargedGwh: number,
  factor: LiveDispatchFactor,
  language: AppLanguage
): ChargedSentenceParts | null {
  if (chargedGwh <= SURPLUS_EPS_GWH) {
    return null;
  }
  const amount = formatGwh(chargedGwh, language);
  if (language === "de") {
    return factor === 1
      ? { before: "", amount, after: " GWh hätten die heutigen Großspeicher geladen" }
      : { before: "", amount, after: ` GWh hätte die ${factor}-fache Großspeicher-Flotte geladen` };
  }
  return factor === 1
    ? { before: "Today's large storage would have charged ", amount, after: " GWh" }
    : { before: `A ${factor}× large-storage fleet would have charged `, amount, after: " GWh" };
}

export function chargedWouldHave(
  chargedGwh: number,
  factor: LiveDispatchFactor,
  language: AppLanguage
): string | null {
  const parts = chargedWouldHaveParts(chargedGwh, factor, language);
  if (!parts) {
    return null;
  }
  return `${parts.before}${parts.amount}${parts.after}`;
}

/**
 * One fleet notation.
 * ×1 stays at the rounded stand (4,5 GW · 7,9 GWh).
 * A multiple shows the scaled model value, then the two-decimal basis it was multiplied from,
 * so 5 × 4,52 GW is visibly not 5 × 4,5.
 */
export function fleetSizeLabel(factor: number, powerMw: number, energyMwh: number, language: AppLanguage): string {
  const powerGw = powerMw / 1000;
  const energyGwh = energyMwh / 1000;
  const powerDigits = Math.abs(powerGw) >= 1 ? 1 : 2;
  const energyDigits = Math.abs(energyGwh) >= 1 ? 1 : 2;
  const power = formatQuantity(powerGw, language, powerDigits);
  const energy = formatQuantity(energyGwh, language, energyDigits);
  const shown = `×${factor}: ${power} GW · ${energy} GWh`;
  if (factor === 1) {
    return shown;
  }
  const basis = formatQuantity(powerGw / factor, language, 2);
  return `${shown} (${factor} × ${basis} GW)`;
}

/** Smallest factor at which charged energy covers the day’s surplus. Null when nothing was stored. */
export function fullSurplusFactor(
  stories: Record<LiveDispatchFactor, LiveDispatchStory>
): LiveDispatchFactor | null {
  for (const factor of LIVE_DISPATCH_FACTORS) {
    const story = stories[factor];
    if (dayHasSurplus(story.surplusGwh) && story.chargedGwh + SURPLUS_EPS_GWH >= story.surplusGwh) {
      return factor;
    }
  }
  return null;
}

export function saturationNote(factor: LiveDispatchFactor, language: AppLanguage): string {
  return language === "de"
    ? `Ab ×${factor} ist der ganze Mittagsüberschuss gespeichert. Mehr Speicher bringt an diesem Tag nichts mehr, weil kein Strom übrig ist.`
    : `From ×${factor} the whole midday surplus is stored. More storage does nothing more on this day, because no electricity is left.`;
}

export function sliderValueText(factor: LiveDispatchFactor, afterGw: number | null, language: AppLanguage): string {
  if (afterGw === null || !Number.isFinite(afterGw)) {
    return language === "de" ? `×${factor}, keine Abendspitze` : `×${factor}, no evening peak`;
  }
  const shown = formatGw1(afterGw, language);
  return language === "de" ? `×${factor}, Abendspitze ${shown} GW` : `×${factor}, evening peak ${shown} GW`;
}

export function surplusHours(story: LiveDispatchStory): number {
  const quarters = story.points.filter((point) => point.hour < 17 && point.ohneMw < 0).length;
  return quarters * 0.25;
}

export type CalloutAnchor = {
  id: "night" | "midday" | "evening";
  point: LiveDispatchPoint;
};

/** Night near 03:00, the deepest midday quarter, and the evening maximum. Positions follow the day. */
export function calloutAnchors(points: LiveDispatchPoint[]): CalloutAnchor[] {
  if (points.length === 0) {
    return [];
  }
  const nightPool = points.filter((point) => point.hour < 6);
  const night = nearestHour(nightPool.length > 0 ? nightPool : points, 3);
  const midday = points.reduce((best, point) => (point.ohneMw < best.ohneMw ? point : best), points[0]);
  const eveningPool = points.filter((point) => point.hour >= 17);
  const evening = (eveningPool.length > 0 ? eveningPool : points).reduce(
    (best, point) => (point.ohneMw > best.ohneMw ? point : best),
    eveningPool[0] ?? points[0]
  );
  const anchors: CalloutAnchor[] = [];
  if (night) {
    anchors.push({ id: "night", point: night });
  }
  if (midday && midday.ohneMw < 0) {
    anchors.push({ id: "midday", point: midday });
  }
  if (evening) {
    anchors.push({ id: "evening", point: evening });
  }
  return anchors;
}

function nearestHour(points: LiveDispatchPoint[], hour: number): LiveDispatchPoint | null {
  return points.reduce<LiveDispatchPoint | null>((best, point) => {
    if (!best || Math.abs(point.hour - hour) < Math.abs(best.hour - hour)) {
      return point;
    }
    return best;
  }, null);
}

export function quarterLabel(hour: number): string {
  let whole = Math.floor(hour);
  let minute = Math.round((hour - whole) * 60);
  if (minute === 60) {
    whole += 1;
    minute = 0;
  }
  return `${String(whole % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
