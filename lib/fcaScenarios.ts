import type { AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";

import {
  FCA_HORIZON,
  FCA_HOUR_MAX,
  FCA_HOUR_MIN,
  formIndex,
  type FcaForm,
  type FcaTable,
  type FcaYearKey,
} from "@/lib/fcaTableSchema";

export const FCA_DEFAULTS = {
  powerMw: 103.5,
  energyMwh: 238.5,
  limitMw: 51.75,
  form: "fest" as FcaForm,
  delayMonths: 12,
  startMonth: 1,
  year: "12m" as FcaYearKey,
};

export type FcaRaw = {
  power: string;
  energy: string;
  limit: string;
  form: FcaForm;
  delay: string;
  startMonth: number;
  year: FcaYearKey;
};

export type FcaField = "power" | "energy" | "limit" | "delay" | "ratio";

export type FcaErrors = Partial<Record<FcaField, string>>;

export type FcaInputs = {
  powerMw: number;
  energyMwh: number;
  limitMw: number;
  form: FcaForm;
  delayMonths: number;
  startMonth: number;
  year: FcaYearKey;
};

const POWER_TEXT = "Leistung und Kapazität müssen größer als 0 sein.";
const LIMIT_TEXT = "Bitte eine Zahl von 0 oder größer eingeben.";
const RATIO_TEXT = "Das Verhältnis von Kapazität zu Leistung liegt außerhalb von 0,5 bis 6 Stunden. Dafür rechnet das Modell nicht.";
const DELAY_RANGE_TEXT = "Bitte höchstens 48 Monate.";
const DELAY_TEXT = "Bitte eine ganze Zahl von 0 bis 48 Monaten eingeben.";

export function defaultRaw(language: AppLanguage = "de"): FcaRaw {
  const digits = language === "de" ? "," : ".";
  const num = (value: number) => value.toString().replace(".", digits);
  return {
    power: num(FCA_DEFAULTS.powerMw),
    energy: num(FCA_DEFAULTS.energyMwh),
    limit: num(FCA_DEFAULTS.limitMw),
    form: FCA_DEFAULTS.form,
    delay: String(FCA_DEFAULTS.delayMonths),
    startMonth: FCA_DEFAULTS.startMonth,
    year: FCA_DEFAULTS.year,
  };
}

export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function parseForm(value: string | null): FcaForm {
  if (value === "fest" || value === "abend" || value === "mittag") {
    return value;
  }
  return "fest";
}

export function parseYear(value: string | null): FcaYearKey {
  return value === "2025" ? "2025" : "12m";
}

export function parseStartMonth(value: string | null): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) {
    return parsed;
  }
  return 1;
}

export function rawFromQuery(params: URLSearchParams, language: AppLanguage = "de"): FcaRaw {
  const base = defaultRaw(language);
  return {
    power: params.get("p") ?? base.power,
    energy: params.get("e") ?? base.energy,
    limit: params.get("g") ?? base.limit,
    form: parseForm(params.get("form")),
    delay: params.get("v") ?? base.delay,
    startMonth: parseStartMonth(params.get("start")),
    year: parseYear(params.get("jahr")),
  };
}

export function queryFromRaw(raw: FcaRaw): string {
  const params = new URLSearchParams();
  params.set("p", raw.power.trim().replace(",", "."));
  params.set("e", raw.energy.trim().replace(",", "."));
  params.set("g", raw.limit.trim().replace(",", "."));
  params.set("form", raw.form);
  params.set("v", raw.delay.trim().replace(",", "."));
  params.set("start", String(raw.startMonth));
  params.set("jahr", raw.year);
  return params.toString();
}

export function validateRaw(raw: FcaRaw): { errors: FcaErrors; inputs: FcaInputs | null } {
  const errors: FcaErrors = {};
  const power = parseDecimal(raw.power);
  const energy = parseDecimal(raw.energy);
  const limit = parseDecimal(raw.limit);
  const delay = parseDecimal(raw.delay);

  if (power === null || energy === null || power <= 0 || energy <= 0) {
    errors.power = POWER_TEXT;
    errors.energy = POWER_TEXT;
  } else {
    if (power < 0.1 || power > 1000) {
      errors.power = "Leistung muss zwischen 0,1 und 1.000 MW liegen.";
    }
    if (energy < 0.1 || energy > 6000) {
      errors.energy = "Kapazität muss zwischen 0,1 und 6.000 MWh liegen.";
    }
    if (!errors.power && !errors.energy) {
      const hours = energy / power;
      if (hours < FCA_HOUR_MIN || hours > FCA_HOUR_MAX) {
        errors.ratio = RATIO_TEXT;
      }
    }
  }

  if (limit === null || limit < 0) {
    errors.limit = LIMIT_TEXT;
  } else if (power !== null && power > 0 && limit > power * 10) {
    errors.limit = "Bitte eine Grenze bis zum Zehnfachen der Leistung eingeben.";
  }

  if (delay === null || !Number.isInteger(delay) || delay < 0) {
    errors.delay = DELAY_TEXT;
  } else if (delay > 48) {
    errors.delay = DELAY_RANGE_TEXT;
  }

  if (Object.keys(errors).length > 0 || power === null || energy === null || limit === null || delay === null) {
    return { errors, inputs: null };
  }

  return {
    errors,
    inputs: {
      powerMw: power,
      energyMwh: energy,
      limitMw: limit,
      form: raw.form,
      delayMonths: delay,
      startMonth: raw.startMonth,
      year: raw.year,
    },
  };
}

function bracket(grid: readonly number[], value: number): { index: number; next: number; share: number } {
  if (value <= grid[0]) {
    return { index: 0, next: 0, share: 0 };
  }
  const last = grid.length - 1;
  if (value >= grid[last]) {
    return { index: last, next: last, share: 0 };
  }
  let index = 0;
  while (index < last - 1 && grid[index + 1] < value) {
    index += 1;
  }
  const span = grid[index + 1] - grid[index];
  const share = span === 0 ? 0 : (value - grid[index]) / span;
  return { index, next: index + 1, share };
}

/** Bilinear interpolation of monthly €/MW. The chord sits slightly under the true value. */
export function interpolateMonths(table: FcaTable, year: FcaYearKey, form: FcaForm, hours: number, limitShare: number): number[] {
  const grid = table.years[year].values[formIndex(form)];
  const h = bracket(table.hours, hours);
  const g = bracket(table.limits, limitShare);
  const months: number[] = [];
  for (let month = 0; month < 12; month += 1) {
    const v00 = grid[h.index][g.index][month];
    const v10 = grid[h.next][g.index][month];
    const v01 = grid[h.index][g.next][month];
    const v11 = grid[h.next][g.next][month];
    const value =
      (1 - h.share) * (1 - g.share) * v00 +
      h.share * (1 - g.share) * v10 +
      (1 - h.share) * g.share * v01 +
      h.share * g.share * v11;
    months.push(value < 0 && value > -1e-6 ? 0 : value);
  }
  return months;
}

export type ScenarioSeries = {
  /** Cumulative model revenue in euro, index 0..36. */
  cumulativeA: number[];
  cumulativeB: number[];
  cumulativeC: number[];
  /** Same series as a share of one year of A, in percent. */
  percentA: number[];
  percentB: number[];
  percentC: number[];
  yearAEur: number;
  yearBEur: number;
  monthlyAEur: number[];
  monthlyBEur: number[];
  lossPct: number;
  remainPct: number;
  delayPct: number;
  delayEur: number;
  /** First month 1..36 where C catches B, or null when it does not. */
  breakevenMonth: number | null;
  limitBinds: boolean;
  zeroLimit: boolean;
};

function cumulative(months: number[], count: number): number[] {
  const out = [0];
  let sum = 0;
  for (let index = 0; index < count; index += 1) {
    sum += months[index] ?? 0;
    out.push(sum);
  }
  return out;
}

export function scenarioSeries(table: FcaTable, inputs: FcaInputs): ScenarioSeries | null {
  const hours = inputs.energyMwh / inputs.powerMw;
  if (!Number.isFinite(hours) || hours < FCA_HOUR_MIN || hours > FCA_HOUR_MAX) {
    return null;
  }
  const share = Math.min(Math.max(inputs.limitMw / inputs.powerMw, 0), 1);
  const perMwA = interpolateMonths(table, inputs.year, inputs.form, hours, 1);
  const perMwB = interpolateMonths(table, inputs.year, inputs.form, hours, share);
  const monthlyA = perMwA.map((value) => value * inputs.powerMw);
  const monthlyB = perMwB.map((value) => value * inputs.powerMw);
  if (monthlyA.some((value) => !Number.isFinite(value)) || monthlyB.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const sequence = (monthly: number[]) =>
    Array.from({ length: FCA_HORIZON }, (_, index) => monthly[(inputs.startMonth - 1 + index) % 12]);
  const seqA = sequence(monthlyA);
  const seqB = sequence(monthlyB);
  const cumulativeA = cumulative(seqA, FCA_HORIZON);
  const cumulativeB = cumulative(seqB, FCA_HORIZON);
  const cumulativeC = [0];
  for (let month = 1; month <= FCA_HORIZON; month += 1) {
    if (month <= inputs.delayMonths) {
      cumulativeC.push(0);
    } else {
      cumulativeC.push(cumulativeA[month] - cumulativeA[inputs.delayMonths]);
    }
  }
  const yearAEur = monthlyA.reduce((sum, value) => sum + value, 0);
  const yearBEur = monthlyB.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(yearAEur) || yearAEur <= 0) {
    return null;
  }
  const toPercent = (series: number[]) => series.map((value) => (value / yearAEur) * 100);
  const delayEur = Array.from({ length: inputs.delayMonths }, (_, index) => monthlyA[(inputs.startMonth - 1 + index) % 12]).reduce(
    (sum, value) => sum + value,
    0
  );
  const lossPct = (1 - yearBEur / yearAEur) * 100;
  let breakevenMonth: number | null = null;
  const lossFree = Math.abs(lossPct) < 1e-6;
  if (!(lossFree && inputs.delayMonths > 0)) {
    for (let month = 1; month <= FCA_HORIZON; month += 1) {
      if (cumulativeC[month] + 1e-6 >= cumulativeB[month]) {
        breakevenMonth = month;
        break;
      }
    }
  }
  return {
    cumulativeA,
    cumulativeB,
    cumulativeC,
    percentA: toPercent(cumulativeA),
    percentB: toPercent(cumulativeB),
    percentC: toPercent(cumulativeC),
    yearAEur,
    yearBEur,
    monthlyAEur: monthlyA,
    monthlyBEur: monthlyB,
    lossPct,
    remainPct: (yearBEur / yearAEur) * 100,
    delayPct: (delayEur / yearAEur) * 100,
    delayEur,
    breakevenMonth,
    limitBinds: inputs.limitMw < inputs.powerMw,
    zeroLimit: inputs.limitMw === 0 && inputs.form === "fest",
  };
}

export function roundToThousands(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value / 1000) * 1000;
}

const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthName(index: number, language: AppLanguage): string {
  const names = language === "de" ? MONTHS_DE : MONTHS_EN;
  return names[(index - 1 + 12) % 12] ?? names[0];
}

function roundPct(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function mwPhrase(value: number, language: AppLanguage): string {
  const digits = Number.isInteger(value) ? 0 : 2;
  return `${formatQuantity(value, language, digits)} MW`;
}

export type ScenarioCopy = {
  hero: string;
  disclaimer: string;
  result: string;
  cardA: string;
  cardB: string;
  cardC: string;
  chart: string;
  edges: string[];
};

export function scenarioCopy(inputs: FcaInputs, series: ScenarioSeries, language: AppLanguage): ScenarioCopy {
  const de = language === "de";
  const remain = roundPct(series.remainPct);
  const loss = roundPct(series.lossPct);
  const delay = roundPct(series.delayPct);
  const limit = mwPhrase(inputs.limitMw, language);
  const share = roundPct((Math.min(inputs.limitMw, inputs.powerMw) / inputs.powerMw) * 100);
  const zeroText = de
    ? "Mit einer Grenze von 0 MW kann der Speicher im Modell nichts handeln."
    : "With a limit of 0 MW the battery cannot trade anything in the model.";
  const unboundText = de
    ? "Die Grenze liegt über der Speicherleistung. Sie bremst nichts."
    : "The limit is above the battery power. It does not slow anything down.";
  const noDelayText = de
    ? "Ohne Verzögerung gibt es keine Mehrkosten durch Warten."
    : "With no delay there is no extra model cost from waiting.";
  const longWaitText = de
    ? "Nach 36 Monaten hat der verzögerte Anschluss im Modell noch nichts erlöst."
    : "After 36 months the delayed connection has still earned nothing in the model.";
  const neverText = de
    ? "Die flexible Variante verliert im Modell nichts, Warten lohnt sich im Modell nie."
    : "The flexible case loses nothing in the model, so waiting never pays in the model.";
  const edges: string[] = [];
  if (series.zeroLimit) {
    edges.push(zeroText);
  }
  if (!series.limitBinds) {
    edges.push(unboundText);
  }
  if (inputs.delayMonths === 0) {
    edges.push(noDelayText);
  }
  if (inputs.delayMonths >= FCA_HORIZON) {
    edges.push(longWaitText);
  }
  if (Math.abs(series.lossPct) < 1e-6 && inputs.delayMonths > 0) {
    edges.push(neverText);
  }

  const hero = series.zeroLimit
    ? zeroText
    : !series.limitBinds
      ? unboundText
      : de
        ? `Mit ${limit} Grenze bleiben im Modell rund ${formatQuantity(remain, language, 0)} % des Erlöses.`
        : `With a ${limit} limit, about ${formatQuantity(remain, language, 0)}% of model revenue remains.`;

  let wait = "";
  if (inputs.delayMonths === 0) {
    wait = de ? "Ohne Verzögerung gibt es keine Mehrkosten durch Warten." : "With no delay there is no extra model cost from waiting.";
  } else if (inputs.delayMonths === 12) {
    wait = de ? "Wer 12 Monate wartet, verliert im Modell ein ganzes Jahr Erlös." : "Waiting 12 months loses one whole year of model revenue.";
  } else if (inputs.delayMonths >= FCA_HORIZON) {
    wait = de
      ? "Nach 36 Monaten hat der verzögerte Anschluss im Modell noch nichts erlöst."
      : "After 36 months the delayed connection has still earned nothing in the model.";
  } else {
    wait = de
      ? `Wer ${inputs.delayMonths} Monate wartet, verliert im Modell rund ${formatQuantity(delay, language, 0)} % eines Jahres.`
      : `Waiting ${inputs.delayMonths} months loses about ${formatQuantity(delay, language, 0)}% of one model year.`;
  }

  let place = "";
  if (Math.abs(series.lossPct) < 1e-6 && inputs.delayMonths > 0) {
    place = de
      ? "Die flexible Variante verliert im Modell nichts, Warten lohnt sich im Modell nie."
      : "The flexible case loses nothing in the model, so waiting never pays in the model.";
  } else if (series.breakevenMonth === null) {
    place = de
      ? "Bei diesen Annahmen liegt die flexible Variante nach 36 Monaten noch vorn. Der Gleichstand liegt nicht innerhalb von 36 Monaten."
      : "On these assumptions the flexible case is still ahead after 36 months. The crossover is not within 36 months.";
  } else if (inputs.delayMonths === 0) {
    place = de ? "Ohne Verzögerung ist der verzögerte Anschluss derselbe wie der volle Anschluss." : "With no delay the delayed connection is the same as the full connection.";
  } else {
    place = de
      ? `Der Gleichstand liegt im Modell im Monat ${series.breakevenMonth}.`
      : `In the model the crossover is in month ${series.breakevenMonth}.`;
  }

  const limitClause = de
    ? `Mit einer Grenze von ${limit} (${formatQuantity(share, language, 0)} % der Leistung) bleiben im Modell rund ${formatQuantity(remain, language, 0)} % des Erlöses.`
    : `With a limit of ${limit} (${formatQuantity(share, language, 0)}% of power), about ${formatQuantity(remain, language, 0)}% of model revenue remains.`;

  const result = [series.zeroLimit ? zeroText : !series.limitBinds ? unboundText : limitClause, wait, place].filter(Boolean).join(" ");

  const cardC = inputs.delayMonths >= FCA_HORIZON
    ? de
      ? "Nach 36 Monaten hat der verzögerte Anschluss im Modell noch nichts erlöst."
      : "After 36 months the delayed connection has still earned nothing in the model."
    : inputs.delayMonths === 0
      ? de
        ? "Ohne Verzögerung gibt es keine Mehrkosten durch Warten."
        : "With no delay there is no extra model cost from waiting."
      : inputs.delayMonths === 12
        ? de
          ? "Verzögert um 12 Monate: entgeht im Modell ein ganzes Jahr Erlös (100 % eines Jahres)."
          : "Delayed by 12 months: one whole year of model revenue is missed (100% of a year)."
        : de
          ? `Verzögert um ${inputs.delayMonths} Monate: entgeht im Modell rund ${formatQuantity(delay, language, 0)} % eines Jahres.`
          : `Delayed by ${inputs.delayMonths} months: about ${formatQuantity(delay, language, 0)}% of one model year is missed.`;

  const chart = de
    ? `${result} Linie A ist durchgezogen, Linie B gestrichelt, Linie C gepunktet. Die Achse ist Prozent eines Jahres Modellerlös von A.`
    : `${result} Line A is solid, line B is dashed, line C is dotted. The axis is percent of one year of A’s model revenue.`;

  return {
    hero,
    disclaimer: de
      ? "Das ist eine Modellrechnung. Es ist keine Prüfung des Netzanschlusses und keine Aussage, ob der Netzknoten den Speicher aufnehmen kann. Das beurteilt der Netzbetreiber."
      : "This is a model calculation. It is not a check of the grid connection and not a statement about whether the node can take the battery. The grid operator decides that.",
    result,
    cardA: de ? "Anschluss voll: 100 % Modellerlös (Bezugswert)." : "Full connection: 100% model revenue (reference).",
    cardB: de
      ? `Flexibel: ${formatQuantity(remain, language, 0)} % des Modellerlöses bleiben, Verlust ${formatQuantity(loss, language, 0)} %.`
      : `Flexible: ${formatQuantity(remain, language, 0)}% of model revenue remains, loss ${formatQuantity(loss, language, 0)}%.`,
    cardC,
    chart,
    edges,
  };
}

export function limitValueText(limitMw: number, powerMw: number, language: AppLanguage): string {
  const percent = powerMw > 0 ? (limitMw / powerMw) * 100 : 0;
  const percentDigits = Number.isInteger(Math.round(percent * 10) / 10) && Math.abs(percent - Math.round(percent)) < 0.05 ? 0 : 1;
  const mwDigits = Math.abs(limitMw - Math.round(limitMw)) < 0.001 ? 0 : 2;
  if (language === "de") {
    return `${formatQuantity(percent, "de", percentDigits)} Prozent, ${formatQuantity(limitMw, "de", mwDigits)} Megawatt`;
  }
  return `${formatQuantity(percent, "en", percentDigits)} percent, ${formatQuantity(limitMw, "en", mwDigits)} megawatts`;
}

export const CORE_TO_OPTIMIZER = 2.57;
export const EXAMPLE_CORE_YEAR_EUR = 3_778_603;
export const EXAMPLE_OPTIMIZER_YEAR_EUR = 9_712_347;
