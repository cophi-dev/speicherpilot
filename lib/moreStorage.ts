import { formatQuantity } from "@/lib/formatQuantity";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import { niceAxis } from "@/lib/niceTicks";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";
import { windSolarSurplusMwh } from "@/lib/windSolarResidual";

/** Round-trip efficiency. Losses are taken on discharge, so stored energy is what left the surplus. */
export const MORE_STORAGE_ROUND_TRIP = 0.9;

/** Discharge starts at this Berlin hour. Earlier slots only charge. */
export const MORE_STORAGE_DISCHARGE_HOUR = 17;

const QUARTER_HOUR_H = 0.25;

export const MORE_STORAGE_STEPS = [
  { id: "today", factor: 1 },
  { id: "double", factor: 2 },
  { id: "triple", factor: 3 },
  { id: "five", factor: 5 },
  { id: "ten", factor: 10 },
] as const;

export type MoreStorageStepId = (typeof MORE_STORAGE_STEPS)[number]["id"];

type Copy = { de: string; en: string };

export type MoreStoragePoint = {
  /** Hours from Berlin midnight, 0–24. */
  hour: number;
  residualMw: number;
  /** Surplus taken into the battery, MW. Zero from 17:00. */
  chargeMw: number;
  /** Power delivered back from 17:00, MW. */
  dischargeMw: number;
};

export type MoreStorageStep = {
  id: MoreStorageStepId;
  factor: number;
  powerGw: number;
  energyGwh: number;
  /** Share of the day's wind-and-solar surplus that fit into the battery, 0–1. */
  storedShare: number;
  storedSurplusGwh: number;
  surplusGwh: number;
  /** How far the evening maximum falls. Null when 17:00 is not in the series. */
  peakReductionGw: number | null;
  eveningPeakGw: number | null;
  points: MoreStoragePoint[];
  title: Copy;
  fleetLabel: Copy;
  shareLabel: Copy;
  shareCaption: Copy;
  peakLabel: Copy;
  /** Plain-language reading of this multiplier. */
  reading: Copy;
  /** Set on every multiplier. Today is the measured fleet, so it has no multiple note. */
  estimateNote: Copy | null;
};

export type MoreStorageReport = {
  available: boolean;
  reason: "no-fleet" | "no-day" | null;
  fleet: LargeBatteryFleet | null;
  dateBerlin: string | null;
  /** True when today had no wind-and-solar surplus and an earlier day is shown. */
  fallback: boolean;
  partial: boolean;
  hasEvening: boolean;
  headline: Copy;
  subhead: Copy;
  sentence: Copy;
  footnote: Copy | null;
  yMinGw: number;
  yMaxGw: number;
  yTicksGw: number[];
  steps: MoreStorageStep[];
};

const STEP_TITLE: Record<MoreStorageStepId, Copy> = {
  today: { de: "Heute", en: "Today" },
  double: { de: "× 2", en: "× 2" },
  triple: { de: "× 3", en: "× 3" },
  five: { de: "× 5", en: "× 5" },
  ten: { de: "× 10", en: "× 10" },
};

const FACTOR_WORD_DE: Record<number, string> = {
  2: "doppelt",
  3: "dreimal",
  5: "fünfmal",
  10: "zehnmal",
};

const FACTOR_WORD_EN: Record<number, string> = {
  2: "twice",
  3: "three times",
  5: "five times",
  10: "ten times",
};

function gwhDigits(value: number): number {
  return value > 0 && value < 0.1 ? 2 : 1;
}

function quantity(value: number, language: "de" | "en", digits: number): string {
  return formatQuantity(value, language, digits);
}

function gw(value: number, language: "de" | "en", digits = 1): string {
  const used = value === 0 ? 0 : digits;
  return quantity(value, language, used);
}

function both(build: (language: "de" | "en") => string): Copy {
  return { de: build("de"), en: build("en") };
}

function noon(dateBerlin: string): Date {
  const [year, month, day] = dateBerlin.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function shortDate(dateBerlin: string): string {
  const [, month, day] = dateBerlin.split("-");
  return `${day}.${month}.`;
}

function longDate(dateBerlin: string, language: "de" | "en"): string {
  const date = noon(dateBerlin);
  const weekday = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    timeZone: "Europe/Berlin",
  }).format(date);
  const [year, month, day] = dateBerlin.split("-");
  return `${weekday}, ${day}.${month}.${year}`;
}

function spokenDate(dateBerlin: string, language: "de" | "en"): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(noon(dateBerlin));
}

function lastClock(slots: ResidualSlot[]): string {
  const last = slots[slots.length - 1];
  return `${String(last.hourBerlin).padStart(2, "0")}:${String(last.minuteBerlin).padStart(2, "0")}`;
}

type Dispatch = {
  points: MoreStoragePoint[];
  storedMwh: number;
  peakReductionGw: number | null;
  eveningPeakGw: number | null;
};

export function dispatchPeakFleet(slots: ResidualSlot[], powerMw: number, energyMwh: number): Dispatch {
  const residualMw = slots.map((slot) => slot.loadMw - slot.windMw - slot.solarMw);
  const surplusMw = residualMw.map((residual) => Math.max(0, -residual));
  let socMwh = 0;
  const chargeMw = slots.map((slot, index) => {
    if (slot.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR) {
      return 0;
    }
    const roomMw = Math.max(0, (energyMwh - socMwh) / QUARTER_HOUR_H);
    const charge = Math.min(surplusMw[index], powerMw, roomMw);
    socMwh += charge * QUARTER_HOUR_H;
    return charge;
  });
  const deliverableMwh = socMwh * MORE_STORAGE_ROUND_TRIP;
  const evening = slots
    .map((slot, index) => ({ index, residual: residualMw[index] }))
    .filter((slot) => slots[slot.index].hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR);
  const positive = evening.filter((slot) => slot.residual > 0);
  const dischargeMw = slots.map(() => 0);
  let eveningPeakGw: number | null = null;
  let peakReductionGw: number | null = null;

  if (evening.length > 0 && positive.length === 0) {
    eveningPeakGw = Math.max(...evening.map((slot) => slot.residual)) / 1000;
    peakReductionGw = 0;
  } else if (positive.length > 0) {
    const peakMw = Math.max(...positive.map((slot) => slot.residual));
    eveningPeakGw = peakMw / 1000;
    let lo = 0;
    let hi = peakMw;
    const feasible = (levelMw: number) => {
      let needMwh = 0;
      for (const slot of positive) {
        const cutMw = Math.max(0, slot.residual - levelMw);
        if (cutMw > powerMw + 1e-6) {
          return false;
        }
        needMwh += cutMw * QUARTER_HOUR_H;
      }
      return needMwh <= deliverableMwh + 1e-6;
    };
    if (feasible(hi)) {
      for (let step = 0; step < 48; step += 1) {
        const mid = (lo + hi) / 2;
        if (feasible(mid)) {
          hi = mid;
        } else {
          lo = mid;
        }
      }
      for (const slot of positive) {
        dischargeMw[slot.index] = Math.max(0, slot.residual - hi);
      }
    }
    const shaved = positive.map((slot) => slot.residual - dischargeMw[slot.index]);
    peakReductionGw = Math.max(0, peakMw - Math.max(...shaved)) / 1000;
  }

  return {
    points: slots.map((slot, index) => ({
      hour: slot.hourBerlin + slot.minuteBerlin / 60,
      residualMw: residualMw[index],
      chargeMw: chargeMw[index],
      dischargeMw: dischargeMw[index],
    })),
    storedMwh: socMwh,
    peakReductionGw,
    eveningPeakGw,
  };
}

function axisGw(points: MoreStoragePoint[]): { yMinGw: number; yMaxGw: number; yTicksGw: number[] } {
  let lo = 0;
  let hi = 0;
  for (const point of points) {
    lo = Math.min(lo, point.residualMw / 1000);
    hi = Math.max(hi, point.residualMw / 1000);
  }
  const axis = niceAxis(lo, hi);
  return { yMinGw: axis.min, yMaxGw: axis.max, yTicksGw: axis.ticks };
}

function headline(fallback: boolean, dateBerlin: string): Copy {
  if (fallback) {
    const short = shortDate(dateBerlin);
    return {
      de: `Letzter Überschusstag: ${short}`,
      en: `Last surplus day: ${short}`,
    };
  }
  return {
    de: "Was wäre mit mehr Großspeichern?",
    en: "What if there were more large storage?",
  };
}

function subhead(dateBerlin: string, partial: boolean, clock: string): Copy {
  return both((language) => {
    const when = longDate(dateBerlin, language);
    if (language === "de") {
      const until = partial ? `, veröffentlicht bis ${clock} Uhr` : "";
      return `${when}, echte Daten${until}. Speicher laden nur Überschuss und geben ihn ab 17 Uhr ab.`;
    }
    const until = partial ? `, published through ${clock}` : "";
    return `${when}, measured data${until}. Storage charges only on surplus and releases it from 17:00.`;
  });
}

function footnote(fleet: LargeBatteryFleet): Copy {
  const power = both((language) => gw(fleet.powerGw, language, 2));
  const energy = both((language) => quantity(fleet.energyGwh, language, 2));
  const duration = both((language) => quantity(fleet.durationHours, language, 1));
  if (fleet.source === "battery-charts") {
    return {
      de: `Großspeicher heute ${power.de} GW / ${energy.de} GWh, Stand ${fleet.updatedLabel.de}. Das sind ${duration.de} Stunden bei voller Leistung. Battery Charts, ISEA und PGS, RWTH Aachen, aus dem Marktstammdatenregister, CC BY 4.0. Großspeicher heißt dort mindestens 1.000 kWh oder 1.000 kW. Die Tagesreihe ist Last, Wind und Sonne, Energy-Charts, Fraunhofer ISE, CC BY 4.0. Modell: Start leer, 90 % Wirkungsgrad, Laden nur bei Wind plus Sonne über der Last, Abgabe ab 17 Uhr auf die Abendspitze. Modellschätzung, nicht gemessen.`,
      en: `Large storage today ${power.en} GW / ${energy.en} GWh, as of ${fleet.updatedLabel.en}. That is ${duration.en} hours at full power. Battery Charts, ISEA and PGS, RWTH Aachen, from the Marktstammdatenregister, CC BY 4.0. Large storage there means at least 1,000 kWh or 1,000 kW. The day series is load, wind and solar, Energy-Charts, Fraunhofer ISE, CC BY 4.0. Model: start empty, 90% round-trip efficiency, charge only while wind plus solar exceeds load, release from 17:00 onto the evening peak. A model estimate, not a measurement.`,
    };
  }
  return {
    de: `Großspeicher heute ${power.de} GW / ${energy.de} GWh im Jahr ${fleet.year}, Stand ${fleet.updatedLabel.de}. Energy-Charts / Fraunhofer ISE, Datengrundlage ${fleet.datasource}, CC BY 4.0. Die Tagesreihe ist Last, Wind und Sonne. Modell: Start leer, 90 % Wirkungsgrad, Laden nur bei Wind plus Sonne über der Last, Abgabe ab 17 Uhr auf die Abendspitze. Modellschätzung, nicht gemessen.`,
    en: `Large storage today ${power.en} GW / ${energy.en} GWh in ${fleet.year}, as of ${fleet.updatedLabel.en}. Energy-Charts / Fraunhofer ISE, data basis ${fleet.datasource}, CC BY 4.0. The day series is load, wind and solar. Model: start empty, 90% round-trip efficiency, charge only while wind plus solar exceeds load, release from 17:00 onto the evening peak. A model estimate, not a measurement.`,
  };
}

function factorLead(factor: number, language: "de" | "en"): string {
  if (factor === 1) {
    return language === "de" ? "Mit dem heutigen Großspeicher-Bestand" : "With today's large-storage fleet";
  }
  if (language === "de") {
    return `Mit ${FACTOR_WORD_DE[factor] ?? `${factor}-mal`} so viel Speicher`;
  }
  return `With ${FACTOR_WORD_EN[factor] ?? `${factor} times`} as much storage`;
}

function stepReading(input: {
  step: Pick<MoreStorageStep, "factor" | "shareLabel" | "storedSurplusGwh" | "surplusGwh" | "peakReductionGw" | "eveningPeakGw">;
  fallback: boolean;
  dateBerlin: string;
  partial: boolean;
  clock: string;
}): Copy {
  const whenDe = spokenDate(input.dateBerlin, "de");
  const whenEn = spokenDate(input.dateBerlin, "en");
  const untilDe = input.partial ? ` bis ${input.clock} Uhr` : "";
  const untilEn = input.partial ? ` through ${input.clock}` : "";
  const leadDe = input.fallback
    ? `Heute lag Wind plus Sonne nicht über der Last. Letzter Überschusstag: ${shortDate(input.dateBerlin)} `
    : "";
  const leadEn = input.fallback
    ? `Today, wind plus solar did not exceed load. Last surplus day: ${shortDate(input.dateBerlin)} `
    : "";
  const modelDe = input.step.factor === 1 ? " Das ist eine Modellschätzung, keine Messung." : " Das ist eine Modellschätzung, kein Ausbauziel und keine Messung.";
  const modelEn = input.step.factor === 1 ? " This is a model estimate, not a measurement." : " This is a model estimate, not a build target and not a measurement.";
  if (input.step.surplusGwh <= 0) {
    return {
      de: `${leadDe}An diesem Tag lag Wind plus Sonne in Deutschland nicht über der Last. Vom Überschuss gespeichert: 0 %.${modelDe}`,
      en: `${leadEn}On this day, wind plus solar in Germany did not exceed load. Share of surplus stored: 0%.${modelEn}`,
    };
  }
  const storedDe = quantity(input.step.storedSurplusGwh, "de", gwhDigits(input.step.storedSurplusGwh));
  const storedEn = quantity(input.step.storedSurplusGwh, "en", gwhDigits(input.step.storedSurplusGwh));
  let peakDe: string;
  let peakEn: string;
  if (input.step.peakReductionGw === null) {
    peakDe = " Die Stunden ab 17 Uhr sind in der Reihe noch nicht veröffentlicht.";
    peakEn = " The hours from 17:00 are not in the series yet.";
  } else if (input.step.eveningPeakGw === null || input.step.eveningPeakGw <= 0) {
    peakDe = " Ab 17 Uhr lag keine Abendspitze.";
    peakEn = " From 17:00 there was no evening peak.";
  } else {
    const cutDe = gw(input.step.peakReductionGw, "de");
    const cutEn = gw(input.step.peakReductionGw, "en");
    peakDe = ` Die Abendspitze wäre um ${cutDe} GW niedriger.`;
    peakEn = ` The evening peak would be ${cutEn} GW lower.`;
  }
  return {
    de: `${leadDe}${factorLead(input.step.factor, "de")} wären am ${whenDe}${untilDe} in Deutschland ${input.step.shareLabel.de} des Überschusses aus Wind und Sonne gespeichert worden, ${storedDe} GWh.${peakDe}${modelDe}`,
    en: `${leadEn}${factorLead(input.step.factor, "en")} would have stored ${input.step.shareLabel.en} of the wind-and-solar surplus in Germany on ${whenEn}${untilEn}, ${storedEn} GWh.${peakEn}${modelEn}`,
  };
}

function emptyReport(reason: "no-fleet" | "no-day", fleet: LargeBatteryFleet | null): MoreStorageReport {
  return {
    available: false,
    reason,
    fleet,
    dateBerlin: null,
    fallback: false,
    partial: false,
    hasEvening: false,
    headline: { de: "Was wäre mit mehr Großspeichern?", en: "What if there were more large storage?" },
    subhead: {
      de: "Für diese Rechnung fehlt gerade die Reihe.",
      en: "The series for this estimate is missing just now.",
    },
    sentence: {
      de: "Ohne Bestand oder ohne einen Tag mit Überschuss steht hier keine Schätzung.",
      en: "Without a fleet or a day that has surplus, there is no estimate here.",
    },
    footnote: fleet ? footnote(fleet) : null,
    yMinGw: -10,
    yMaxGw: 30,
    yTicksGw: [-10, 0, 10, 20, 30],
    steps: [],
  };
}

export function buildMoreStorage(input: {
  fleet: LargeBatteryFleet | null;
  day: ResidualDay | null;
  fallback: boolean;
  berlinTodayKey: string;
  /** Draw a dry day when the visitor picked it. The automatic view still refuses an empty surplus. */
  showWithoutSurplus?: boolean;
}): MoreStorageReport {
  if (!input.fleet) {
    return emptyReport("no-fleet", null);
  }
  if (!input.day || input.day.slots.length === 0) {
    return emptyReport("no-day", input.fleet);
  }

  const fleet = input.fleet;
  const day = input.day;
  const slots = day.slots;
  const surplusMwh = windSolarSurplusMwh(slots);
  if (surplusMwh <= 0 && !input.showWithoutSurplus) {
    return emptyReport("no-day", fleet);
  }
  const hasEvening = slots.some((slot) => slot.hourBerlin >= MORE_STORAGE_DISCHARGE_HOUR);
  const partial = day.dateBerlin === input.berlinTodayKey && slots.length < 96;
  const clock = lastClock(slots);
  const surplusGwh = surplusMwh / 1000;

  const steps = MORE_STORAGE_STEPS.map((step) => {
    const powerMw = fleet.powerGw * step.factor * 1000;
    const energyMwh = fleet.energyGwh * step.factor * 1000;
    const run = dispatchPeakFleet(slots, powerMw, energyMwh);
    const storedSurplusGwh = run.storedMwh / 1000;
    const storedShare = surplusGwh > 0 ? Math.min(1, storedSurplusGwh / surplusGwh) : 0;
    const shareLabel = both((language) => `${quantity(Math.round(storedShare * 100), language, 0)} %`);
    const built = {
      id: step.id,
      factor: step.factor,
      powerGw: fleet.powerGw * step.factor,
      energyGwh: fleet.energyGwh * step.factor,
      storedShare,
      storedSurplusGwh,
      surplusGwh,
      peakReductionGw: run.peakReductionGw,
      eveningPeakGw: run.eveningPeakGw,
      points: run.points,
      title: STEP_TITLE[step.id],
      fleetLabel: both(
        (language) =>
          `${gw(fleet.powerGw * step.factor, language)} GW · ${quantity(fleet.energyGwh * step.factor, language, 1)} GWh`
      ),
      shareLabel,
      shareCaption: { de: "vom Überschuss gespeichert", en: "of the surplus stored" },
      peakLabel: peakCopy(run.peakReductionGw, run.eveningPeakGw),
      estimateNote:
        step.factor === 1
          ? null
          : {
              de: "Modellschätzung · kein Ausbauziel",
              en: "Model estimate · not a build target",
            },
    };
    return {
      ...built,
      reading: stepReading({
        step: built,
        fallback: input.fallback,
        dateBerlin: day.dateBerlin,
        partial,
        clock,
      }),
    };
  });

  const today = steps[0];
  const axis = axisGw(today.points);

  return {
    available: true,
    reason: null,
    fleet,
    dateBerlin: day.dateBerlin,
    fallback: input.fallback,
    partial,
    hasEvening,
    headline: headline(input.fallback, day.dateBerlin),
    subhead: subhead(day.dateBerlin, partial, clock),
    sentence: today.reading,
    footnote: footnote(fleet),
    yMinGw: axis.yMinGw,
    yMaxGw: axis.yMaxGw,
    yTicksGw: axis.yTicksGw,
    steps,
  };
}

function peakCopy(reductionGw: number | null, eveningPeakGw: number | null): Copy {
  if (reductionGw === null || eveningPeakGw === null) {
    return { de: "Abend noch nicht veröffentlicht", en: "Evening not published yet" };
  }
  if (eveningPeakGw <= 0) {
    return { de: "keine Abendspitze", en: "no evening peak" };
  }
  return both((language) => {
    const cut = gw(reductionGw, language);
    return language === "de" ? `Abendspitze −${cut} GW` : `Evening peak −${cut} GW`;
  });
}
