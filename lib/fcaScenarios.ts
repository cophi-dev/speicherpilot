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

function groupedInteger(value: string, separator: string): boolean {
  const groups = value.split(separator);
  if (groups.length === 0 || groups.some((group) => !/^\d+$/.test(group))) {
    return false;
  }
  if (groups.length === 1) {
    return groups[0].length > 0;
  }
  return groups[0].length >= 1 && groups[0].length <= 3 && groups.slice(1).every((group) => group.length === 3);
}

/**
 * Reads a decimal. Comma is the German decimal mark, dot the English one.
 * A grouped thousands mark is accepted in either sign (`1.000` and `1,000` are 1000).
 * `1.000` is never read as 1. A dot in a URL value stays the decimal mark when the
 * fraction is not a group of three (`103.5`).
 */
export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed || /e/i.test(trimmed)) {
    return null;
  }
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!body || body.startsWith("+") || body.startsWith("-")) {
    return null;
  }
  const lastDot = body.lastIndexOf(".");
  const lastComma = body.lastIndexOf(",");
  let normalized = "";
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalIsDot = lastDot > lastComma;
    const parts = body.split(decimalIsDot ? "." : ",");
    if (parts.length !== 2) {
      return null;
    }
    const [intPart, fraction] = parts;
    if (!groupedInteger(intPart, decimalIsDot ? "," : ".") || !/^\d+$/.test(fraction)) {
      return null;
    }
    const thousand = decimalIsDot ? "," : ".";
    normalized = `${intPart.split(thousand).join("")}.${fraction}`;
  } else if (lastComma >= 0 && /^\d{1,3}(,\d{3})+$/.test(body)) {
    normalized = body.split(",").join("");
  } else if (lastComma >= 0 && /^\d+,\d+$/.test(body)) {
    normalized = body.replace(",", ".");
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(body) && !/^0\.\d{3}$/.test(body)) {
    normalized = body.split(".").join("");
  } else if (/^\d+(\.\d+)?$/.test(body)) {
    normalized = body;
  } else {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }
  return negative ? -value : value;
}

export function serializeDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const negative = value < 0;
  const rounded = Math.round(Math.abs(value) * 1_000_000) / 1_000_000;
  const text = rounded.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return negative ? `-${text}` : text;
}

export function formatInputNumber(value: number, language: AppLanguage): string {
  const text = serializeDecimal(value);
  return language === "de" ? text.replace(".", ",") : text;
}

function queryNumber(raw: string): string {
  const value = parseDecimal(raw);
  return value === null ? raw.trim() : serializeDecimal(value);
}

function displayNumber(param: string | null, fallback: string, language: AppLanguage): string {
  if (param === null) {
    return fallback;
  }
  const value = parseDecimal(param);
  return value === null ? param : formatInputNumber(value, language);
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
    power: displayNumber(params.get("p"), base.power, language),
    energy: displayNumber(params.get("e"), base.energy, language),
    limit: displayNumber(params.get("g"), base.limit, language),
    form: parseForm(params.get("form")),
    delay: displayNumber(params.get("v"), base.delay, language),
    startMonth: parseStartMonth(params.get("start")),
    year: parseYear(params.get("jahr")),
  };
}

export function queryFromRaw(raw: FcaRaw): string {
  const params = new URLSearchParams();
  params.set("p", queryNumber(raw.power));
  params.set("e", queryNumber(raw.energy));
  params.set("g", queryNumber(raw.limit));
  params.set("form", raw.form);
  params.set("v", queryNumber(raw.delay));
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
      const caughtUp = cumulativeC[month] + 1e-6 >= cumulativeB[month];
      const bothZero = Math.abs(cumulativeC[month]) < 1e-4 && Math.abs(cumulativeB[month]) < 1e-4;
      if (caughtUp && !bothZero) {
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
  return `${formatQuantity(value, language, digits)}\u00A0MW`;
}

function pctPhrase(value: number, language: AppLanguage): string {
  return `${formatQuantity(roundPct(value), language, 0)}\u00A0%`;
}

function windowPhrase(form: FcaForm, language: AppLanguage): string {
  if (form === "abend") {
    return language === "de" ? "im Abendfenster" : "in the evening window";
  }
  if (form === "mittag") {
    return language === "de" ? "im Mittagsfenster" : "in the midday window";
  }
  return "";
}

function bothIdle(series: ScenarioSeries): boolean {
  return series.cumulativeB.every((value) => Math.abs(value) < 1e-4) && series.cumulativeC.every((value) => Math.abs(value) < 1e-4);
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
  const remain = pctPhrase(series.remainPct, language);
  const loss = pctPhrase(series.lossPct, language);
  const delay = pctPhrase(series.delayPct, language);
  const limit = mwPhrase(inputs.limitMw, language);
  const share = pctPhrase((Math.min(inputs.limitMw, inputs.powerMw) / inputs.powerMw) * 100, language);
  const window = windowPhrase(inputs.form, language);
  const windowBit = window ? ` ${window}` : "";
  const idle = bothIdle(series);
  const zeroText = de
    ? "Mit einer Grenze von 0 MW kann der Speicher im Modell nichts handeln."
    : "With a limit of 0 MW the battery cannot trade anything in the model.";
  const unboundText = de
    ? `Die Grenze liegt über der Speicherleistung. Sie bremst${windowBit} nichts.`
    : `The limit is above the battery power. It does not slow anything down${windowBit}.`;
  const noDelayText = de
    ? "Ohne Verzögerung gibt es keine Mehrkosten durch Warten."
    : "With no delay there is no extra model cost from waiting.";
  const longWaitText = de
    ? "Nach 36 Monaten hat der verzögerte Anschluss im Modell noch nichts erlöst."
    : "After 36 months the delayed connection has still earned nothing in the model.";
  const neverText = de
    ? "Die flexible Variante verliert im Modell nichts, Warten lohnt sich im Modell nie."
    : "The flexible case loses nothing in the model, so waiting never pays in the model.";
  const idleText = de
    ? "B und C erlösen im Modell nichts. Es gibt keinen Gleichstand."
    : "B and C earn nothing in the model. There is no crossover.";
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
  if (idle) {
    edges.push(idleText);
  }

  const hero = series.zeroLimit
    ? zeroText
    : !series.limitBinds
      ? unboundText
      : de
        ? `Mit ${limit} Grenze${windowBit} bleiben im Modell rund ${remain} des Erlöses.`
        : `With a ${limit} limit${windowBit}, about ${remain} of model revenue remains.`;

  let wait = "";
  if (inputs.delayMonths === 0) {
    wait = noDelayText;
  } else if (inputs.delayMonths === 1) {
    wait = de
      ? `Wer 1 Monat wartet, verliert im Modell rund ${delay} eines Jahres.`
      : `Waiting 1 month loses about ${delay} of one model year.`;
  } else if (inputs.delayMonths === 12) {
    wait = de ? "Wer 12 Monate wartet, verliert im Modell ein ganzes Jahr Erlös." : "Waiting 12 months loses one whole year of model revenue.";
  } else if (inputs.delayMonths >= FCA_HORIZON) {
    wait = longWaitText;
  } else {
    wait = de
      ? `Wer ${inputs.delayMonths} Monate wartet, verliert im Modell rund ${delay} eines Jahres.`
      : `Waiting ${inputs.delayMonths} months loses about ${delay} of one model year.`;
  }

  let place = "";
  if (idle) {
    place = idleText;
  } else if (Math.abs(series.lossPct) < 1e-6 && inputs.delayMonths > 0) {
    place = neverText;
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
    ? `Mit einer Grenze von ${limit}${windowBit} (${share} der Leistung) bleiben im Modell rund ${remain} des Erlöses.`
    : `With a limit of ${limit}${windowBit} (${share} of power), about ${remain} of model revenue remains.`;

  const result = [series.zeroLimit ? zeroText : !series.limitBinds ? unboundText : limitClause, wait, place].filter(Boolean).join(" ");

  const cardC = inputs.delayMonths >= FCA_HORIZON
    ? longWaitText
    : inputs.delayMonths === 0
      ? noDelayText
      : inputs.delayMonths === 1
        ? de
          ? `Verzögert um 1 Monat: entgeht im Modell rund ${delay} eines Jahres.`
          : `Delayed by 1 month: about ${delay} of one model year is missed.`
        : inputs.delayMonths === 12
          ? de
            ? "Verzögert um 12 Monate: entgeht im Modell ein ganzes Jahr Erlös (100\u00A0% eines Jahres)."
            : "Delayed by 12 months: one whole year of model revenue is missed (100\u00A0% of a year)."
          : de
            ? `Verzögert um ${inputs.delayMonths} Monate: entgeht im Modell rund ${delay} eines Jahres.`
            : `Delayed by ${inputs.delayMonths} months: about ${delay} of one model year is missed.`;

  const chart = de
    ? `${result} Linie A ist durchgezogen, Linie B gestrichelt, Linie C gepunktet. Die Achse ist Prozent eines Jahres Modellerlös von A.`
    : `${result} Line A is solid, line B is dashed, line C is dotted. The axis is percent of one year of A’s model revenue.`;

  return {
    hero,
    disclaimer: de
      ? "Das ist eine Modellrechnung. Es ist keine Prüfung des Netzanschlusses und keine Aussage, ob der Netzknoten den Speicher aufnehmen kann. Das beurteilt der Netzbetreiber."
      : "This is a model calculation. It is not a check of the grid connection and not a statement about whether the node can take the battery. The grid operator decides that.",
    result,
    cardA: de ? "Anschluss voll: 100\u00A0% Modellerlös (Bezugswert)." : "Full connection: 100\u00A0% model revenue (reference).",
    cardB: de
      ? `Flexibel: ${remain} des Modellerlöses bleiben, Verlust ${loss}.`
      : `Flexible: ${remain} of model revenue remains, loss ${loss}.`,
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
