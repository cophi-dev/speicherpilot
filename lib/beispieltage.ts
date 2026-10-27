import type { AppLanguage } from "@/components/language-context";
import raw from "@/data/beispieltage.json";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { formatQuantity } from "@/lib/formatQuantity";
import { beispieltageFileSchema, type BeispielScale, type Beispieltag, type BeispieltageFile } from "@/lib/beispieltageSchema";

export type { BeispielScale, Beispieltag, BeispieltageFile };

export const BEISPIEL_SCALES = [1, 2, 5, 10] as const;

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function loadBeispieltage(payload: unknown = raw): BeispieltageFile {
  return beispieltageFileSchema.parse(payload);
}

export const beispieltage: BeispieltageFile = loadBeispieltage();

export function beispieltagByDate(dateBerlin: string | null | undefined, file: BeispieltageFile = beispieltage): Beispieltag {
  return file.days.find((day) => day.dateBerlin === dateBerlin) ?? file.days[0];
}

export function scaleKey(scale: BeispielScale): "x1" | "x2" | "x5" | "x10" {
  if (scale === 2) return "x2";
  if (scale === 5) return "x5";
  if (scale === 10) return "x10";
  return "x1";
}

/** Hundreds for ×1 and ×2, thousands for ×5 and ×10, so the larger scales do not look more precise. */
export function displayEuro(amount: number, scale: BeispielScale): number {
  const step = scale >= 5 ? 1000 : 100;
  return Math.round(amount / step) * step;
}

export function formatModelEuro(amount: number, language: AppLanguage): string {
  return formatQuantity(amount, language, 0);
}

export function factorVersusMedian(revenueX1: number, medianX1: number): number {
  if (!(medianX1 > 0)) {
    return 1;
  }
  return Math.round((revenueX1 / medianX1) * 10) / 10;
}

export function berlinClock(iso: string): string {
  return clockFormat.format(new Date(iso));
}

export function berlinHourFraction(iso: string): number {
  const parts = clockFormat.formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour + minute / 60;
}

export function shortBerlinDate(dateKey: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "long",
  })
    .format(new Date(`${dateKey}T12:00:00Z`))
    .replace(/\u00a0/g, " ");
}

export function dayAheadPoints(day: Beispieltag): DayAheadPricePoint[] {
  return day.slotStartIso.map((iso, index) => ({
    unixMs: Date.parse(iso),
    eurPerMwh: day.prices[index] ?? Number.NaN,
  }));
}

export function chartAriaLabel(day: Beispieltag, language: AppLanguage): string {
  const when = shortBerlinDate(day.dateBerlin, language);
  const low = formatQuantity(Math.round(day.stats.minEurPerMwh), language, 0);
  const high = formatQuantity(Math.round(day.stats.maxEurPerMwh), language, 0);
  if (language === "de") {
    return `Preis und Fahrweise am ${when}: Laden mittags bei ${low} Euro je Megawattstunde, Abgabe am Abend bei bis zu ${high} Euro`;
  }
  return `Price and dispatch on ${when}: charging at midday at ${low} euro per megawatt-hour, discharging in the evening at up to ${high} euro`;
}

export function liveResultLabel(day: Beispieltag, scale: BeispielScale, language: AppLanguage): string {
  const shown = formatModelEuro(displayEuro(day.revenueEur[scaleKey(scale)], scale), language);
  const when = shortBerlinDate(day.dateBerlin, language);
  if (language === "de") {
    return `Modellerlös ×${scale} am ${when}: rund ${shown} Euro, Modellschätzung`;
  }
  return `Model revenue ×${scale} on ${when}: about ${shown} €, model estimate`;
}

export function scaleSizeLabel(scale: BeispielScale, language: AppLanguage, powerMw: number, energyMwh: number): string {
  const power = powerMw * scale;
  const energy = energyMwh * scale;
  const powerDigits = Number.isInteger(power) ? 0 : 1;
  const energyDigits = Number.isInteger(energy) ? 0 : 1;
  const powerText = formatQuantity(power, language, powerDigits);
  const energyText = formatQuantity(energy, language, energyDigits);
  if (language === "de") {
    return `${scale} Speicher wie Bollingstedt: ${powerText} MW / ${energyText} MWh`;
  }
  return `${scale} ${scale === 1 ? "battery" : "batteries"} like Bollingstedt: ${powerText} MW / ${energyText} MWh`;
}

export function thousandsLabel(revenueX1: number, language: AppLanguage): string {
  const thousands = Math.round(revenueX1 / 1000);
  const text = formatQuantity(thousands, language, 0);
  return language === "de" ? `${text} Tsd. €` : `${text}k €`;
}

export function breakdownText(day: Beispieltag, scale: BeispielScale, language: AppLanguage): string {
  const charge = formatModelEuro(displayEuro(Math.abs(day.parts.chargingEur) * scale, scale), language);
  const discharge = formatModelEuro(displayEuro(Math.abs(day.parts.dischargingEur) * scale, scale), language);
  if (day.parts.chargingEur > 0) {
    const low = formatQuantity(Math.round(day.stats.minEurPerMwh), language, 0);
    if (language === "de") {
      return `Davon vom Laden: rund ${charge} €, ohne Netzentgelte, Umlagen, Steuern. Der Preis lag mittags bei ${low} €/MWh, der Speicher bekommt dann Geld fürs Abnehmen von Strom. Vom Abgeben am Abend: rund ${discharge} €.`;
    }
    return `Of that, from charging: about ${charge} €, without grid fees, levies and taxes. At midday the price was ${low} €/MWh, so the battery is paid to take power. From discharging in the evening: about ${discharge} €.`;
  }
  if (language === "de") {
    return `Laden kostet rund ${charge} €, ohne Netzentgelte, Umlagen, Steuern. Abgeben am Abend bringt rund ${discharge} €. Der Rest ist der Modellerlös.`;
  }
  return `Charging costs about ${charge} €, without grid fees, levies and taxes. Discharging in the evening brings about ${discharge} €. The rest is the model revenue.`;
}

export function comparisonText(day: Beispieltag, scale: BeispielScale, file: BeispieltageFile, language: AppLanguage): string {
  const medianDay = file.days.find((item) => item.role === "median") ?? file.days[3];
  if (day.role === "median") {
    return language === "de"
      ? "Das ist der mittlere Tag des Jahres: Die Hälfte der Tage lag darunter."
      : "This is the middle day of the year: half of the days were below it.";
  }
  const shownMedian = formatModelEuro(displayEuro(file.medianDayRevenueX1 * scale, scale), language);
  const factor = formatQuantity(factorVersusMedian(day.revenueEur.x1, file.medianDayRevenueX1), language, 1);
  const when = day.textDe.title;
  const medianWhen = medianDay.textDe.title;
  if (language === "de") {
    return `Zum Vergleich: ein normaler Tag (${medianWhen}) kommt im selben Modell auf rund ${shownMedian} €. Der ${when.replace(" 2026", "")} liegt beim ${factor}-Fachen. Rang ${day.rankByModelRevenueX1} von 365 Tagen.`;
  }
  return `For comparison: an ordinary day (${medianDay.textEn.title}) comes to about ${shownMedian} € in the same model. ${day.textEn.title} is ${factor} times that. Rank ${day.rankByModelRevenueX1} of 365 days.`;
}

export const HINTS: readonly { de: string; en: string; tips: Array<"preisnehmer" | "intraday" | "regelleistung" | "vollzyklen" | "soc" | "modellschaetzung"> }[] = [
  {
    de: "Preisnehmer: nur malgenommen, keine Prognose.",
    en: "Price taker: just multiplied, not a forecast.",
    tips: ["preisnehmer"],
  },
  {
    de: "Nur Day-Ahead. Intraday und Regelleistung fehlen.",
    en: "Day-ahead only. Intraday and balancing power are missing.",
    tips: ["intraday"],
  },
  {
    de: "Höchstens ein Teilzyklus, rund 0,35.",
    en: "At most a partial cycle, about 0.35.",
    tips: ["vollzyklen"],
  },
  {
    de: "Kein Versprechen: eine Modellschätzung.",
    en: "No promise: a model estimate.",
    tips: ["modellschaetzung"],
  },
  {
    de: "Wirkungsgrad 85 %, Ladezustand 10 bis 90 %.",
    en: "Round-trip efficiency 85%, state of charge 10 to 90%.",
    tips: ["soc"],
  },
];

/** The methodology sentence that names where euro figures are allowed. */
export const EURO_SCOPE = {
  de: "Euro-Beträge stehen im aufklappbaren Annahmen-Block und in den Beispieltagen, jeweils als Modellschätzung.",
  en: "Euro amounts appear in the collapsible assumptions block and in the example days, in each case as a model estimate.",
} as const;
