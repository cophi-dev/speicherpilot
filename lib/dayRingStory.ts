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

export type RingView = "uhr" | "linie";

export function parseRingView(value: string | null | undefined): RingView {
  return value === "linie" ? "linie" : "uhr";
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
export function chargedWouldHave(
  chargedGwh: number,
  factor: LiveDispatchFactor,
  language: AppLanguage
): string | null {
  if (chargedGwh <= SURPLUS_EPS_GWH) {
    return null;
  }
  const amount = formatGwh(chargedGwh, language);
  if (language === "de") {
    return factor === 1
      ? `${amount} GWh hätten die heutigen Großspeicher geladen`
      : `${amount} GWh hätte die ${factor}-fache Großspeicher-Flotte geladen`;
  }
  return factor === 1
    ? `Today's large storage would have charged ${amount} GWh`
    : `A ${factor}× large-storage fleet would have charged ${amount} GWh`;
}

/** “×5 = 22,6 GW · 39,3 GWh” from the scaled fleet the model actually ran. */
export function fleetSizeLabel(factor: number, powerMw: number, energyMwh: number, language: AppLanguage): string {
  const powerGw = powerMw / 1000;
  const energyGwh = energyMwh / 1000;
  const powerDigits = Math.abs(powerGw) >= 1 ? 1 : 2;
  const energyDigits = Math.abs(energyGwh) >= 1 ? 1 : 2;
  const power = formatQuantity(powerGw, language, powerDigits);
  const energy = formatQuantity(energyGwh, language, energyDigits);
  return `×${factor} = ${power} GW · ${energy} GWh`;
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
    ? `Ab ×${factor} ist der Überschuss dieses Tages voll gespeichert.`
    : `From ×${factor} this day’s surplus is fully stored.`;
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
