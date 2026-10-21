/**
 * Site planner: load profile, PV, grid connection, tariff → storage size,
 * peak shaving, arbitrage, payback, and a grid-connection check.
 *
 * Every series this module synthesises is labelled `synthetic: true`.
 * Callers must not present those numbers as measured.
 *
 * Assumptions (also returned on every result):
 * - Interval energy is average kW × Δt. A non-leap illustrative year is 365 × 96
 *   quarter-hours when an example profile is used.
 * - PV is a clear-sky shape scaled so a south array yields about 950 kWh/kWp·a
 *   and east-west about 800 kWh/kWp·a. It is not a weather year.
 * - Round-trip efficiency splits evenly: η_ch = η_dis = √RTE. DoD window is 10–95 % SoC.
 * - Autosize: P is the 95th percentile of daily import peaks above the connection
 *   limit (kW). E is the 95th percentile of daily excess energy (kWh) divided by
 *   η_dis and by the usable SoC window (0.85).
 * - Dispatch, per day: discharge to hold import at the limit; charge earlier the
 *   same day when later excess exceeds stored energy; then arbitrage on the
 *   remaining headroom if a dynamic tariff is on.
 * - Day-ahead prices, when not supplied, are a synthetic seasonal shape in €/MWh,
 *   not a SMARD or Energy-Charts print.
 * - Demand-charge saving uses the annual maximum import before and after storage.
 * - Retail energy value applies only to peak-shaving charge/discharge. Charging
 *   while the site would otherwise export costs the feed-in tariff (lost export).
 * - Arbitrage cashflow is wholesale discharge minus wholesale charge.
 * - OPEX is 1.5 % of CAPEX per year. Payback is undiscounted unless a discount
 *   rate is set. No degradation, no §19 StromNEV, no balancing energy.
 */

export type ExampleProfileId = "gewerbe" | "kuehlhaus" | "ladepark";
export type ManualShapeId = "G0" | "G1" | "L0";
export type VoltageLevel = "NS" | "MS";
export type PvOrientation = "south" | "east-west";
export type ConnectionStatus = "ok" | "near" | "over";

export type LoadProfile = {
  samplesKw: number[];
  intervalMinutes: 15 | 60;
  synthetic: boolean;
  label: string;
  sourceNote: string;
  rowCount: number;
  gapCount: number;
  interpolatedGaps: number;
  warnings: string[];
};

export type SitePlannerInput = {
  profile: LoadProfile;
  pvEnabled: boolean;
  pvKwp: number;
  pvOrientation: PvOrientation;
  pvSeriesKw?: number[] | null;
  limitKw: number;
  voltage: VoltageLevel;
  demandChargeEurPerKwYear: number;
  energyPriceCtPerKwh: number;
  feedInCtPerKwh: number;
  dynamicTariff: boolean;
  priceEurPerMwh?: number[] | null;
  autoSize: boolean;
  manualPowerKw: number;
  manualEnergyKwh: number;
  /** 0–1, e.g. 0.9 */
  roundTripEfficiency: number;
  capexEurPerKwh: number;
  maxCyclesPerYear: number;
  lifetimeYears: number;
  /** 0–1. Zero means undiscounted simple payback. */
  discountRate: number;
};

export type PlannerAssumptions = {
  syntheticProfile: boolean;
  syntheticPv: boolean;
  syntheticPrices: boolean;
  roundTripEfficiency: number;
  usableSocWindow: number;
  opexFractionOfCapex: number;
  sizingRule: string;
  priceNote: string;
  excluded: string[];
};

export type CashflowYear = {
  year: number;
  annualEur: number;
  cumulativeEur: number;
};

export type SensitivityCell = {
  capexFactor: number;
  priceFactor: number;
  paybackYears: number | null;
  base: boolean;
};

export type SitePlan = {
  powerKw: number;
  energyKwh: number;
  cRate: number;
  peakImportBeforeKw: number;
  peakImportAfterKw: number;
  peakExportBeforeKw: number;
  peakExportAfterKw: number;
  exceedanceHoursBefore: number;
  exceedanceHoursAfter: number;
  demandChargeSavingsEur: number;
  retailNetEur: number;
  arbitrageEur: number;
  exportDeltaEur: number;
  opexEur: number;
  annualBenefitEur: number;
  capexEur: number;
  paybackYears: number | null;
  fullCycles: number;
  connection: ConnectionStatus;
  reserveFraction: number;
  checks: {
    importWithinLimit: boolean;
    exportWithinLimit: boolean;
    exceedanceHoursZero: boolean;
    reserveAtLeast10Pct: boolean;
  };
  /** Quarter-hour or hourly samples for the peak day (and a median day). */
  peakDay: DaySeries;
  medianDay: DaySeries;
  /** Duration curve, import kW, sorted descending. Downsampled. */
  durationBeforeKw: number[];
  durationAfterKw: number[];
  cashflow: CashflowYear[];
  sensitivity: SensitivityCell[];
  assumptions: PlannerAssumptions;
  /** Grid import after storage, same length as the profile. Positive = import. */
  gridKw: number[];
};

export type DaySeries = {
  dayIndex: number;
  loadKw: number[];
  pvKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  gridKw: number[];
  priceEurPerMwh: number[];
};

const OPEX_FRACTION = 0.015;
const SOC_MIN = 0.1;
const SOC_MAX = 0.95;
const USABLE_WINDOW = SOC_MAX - SOC_MIN;
const EXAMPLE_DAYS = 365;
const EXAMPLE_INTERVAL_MINUTES = 15 as const;

export function defaultPlannerEconomics() {
  return {
    demandChargeEurPerKwYear: 120,
    energyPriceCtPerKwh: 21.4,
    feedInCtPerKwh: 8,
    roundTripEfficiency: 0.9,
    capexEurPerKwh: 500,
    maxCyclesPerYear: 400,
    lifetimeYears: 15,
    discountRate: 0,
    limitKw: 1000,
    pvKwp: 250,
    voltage: "MS" as const,
  };
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, p));
  const index = (sorted.length - 1) * clamped;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) {
    return sorted[lo] ?? 0;
  }
  const weight = index - lo;
  return (sorted[lo] ?? 0) * (1 - weight) + (sorted[hi] ?? 0) * weight;
}

function stepsPerDay(intervalMinutes: number) {
  return Math.round((24 * 60) / intervalMinutes);
}

function dtHours(intervalMinutes: number) {
  return intervalMinutes / 60;
}

function dayShape(kind: ExampleProfileId | ManualShapeId, dayIndex: number, rng: () => number): number[] {
  const month = Math.min(11, Math.floor((dayIndex % EXAMPLE_DAYS) / 30.4167));
  const weekend = dayIndex % 7 >= 5;
  const winter = month <= 1 || month >= 10;
  const summer = month >= 5 && month <= 7;
  const samples: number[] = [];
  for (let i = 0; i < 96; i += 1) {
    const t = i / 4;
    let value = 0;
    if (kind === "gewerbe" || kind === "G0") {
      value =
        420 +
        260 * Math.exp(-Math.pow((t - 11) / 3.2, 2)) +
        820 * Math.exp(-Math.pow((t - 18.5) / 1.4, 2)) +
        90 * Math.sin((t / 24) * 2 * Math.PI) +
        normal(rng) * 12;
      if (weekend) {
        value = 260 + (value - 260) * 0.42;
      }
    } else if (kind === "kuehlhaus" || kind === "G1") {
      value = 680 + 70 * Math.sin(((t - 15) / 24) * 2 * Math.PI) + normal(rng) * 10;
      if (kind === "G1") {
        value += 220 * Math.exp(-Math.pow((t - 19) / 2, 2));
      }
    } else {
      value =
        90 +
        280 * Math.exp(-Math.pow((t - 8) / 1.3, 2)) +
        980 * Math.exp(-Math.pow((t - 19.2) / 1.6, 2)) +
        normal(rng) * 14;
      if (weekend) {
        value *= 0.85;
      }
    }
    if (winter) {
      value *= 1.05;
    } else if (summer) {
      value *= 0.95;
    }
    samples.push(Math.max(20, value));
  }
  return samples;
}

function buildExampleSamples(kind: ExampleProfileId): number[] {
  const rng = mulberry32(kind === "gewerbe" ? 7 : kind === "kuehlhaus" ? 11 : 19);
  const samples: number[] = [];
  for (let day = 0; day < EXAMPLE_DAYS; day += 1) {
    samples.push(...dayShape(kind, day, rng));
  }
  return samples;
}

export function exampleProfile(kind: ExampleProfileId): LoadProfile {
  const labels: Record<ExampleProfileId, string> = {
    gewerbe: "Beispiel Gewerbe",
    kuehlhaus: "Beispiel Kühlhaus",
    ladepark: "Beispiel Ladepark",
  };
  const samplesKw = buildExampleSamples(kind);
  return {
    samplesKw,
    intervalMinutes: EXAMPLE_INTERVAL_MINUTES,
    synthetic: true,
    label: labels[kind],
    sourceNote: "BEISPIELDATEN · synthetisches Profil, nicht gemessen",
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

export function manualAnnualProfile(shape: ManualShapeId, annualKwh: number): LoadProfile {
  const safeAnnual = Number.isFinite(annualKwh) ? Math.max(0, annualKwh) : 0;
  const rng = mulberry32(shape === "G0" ? 31 : shape === "G1" ? 37 : 41);
  const raw: number[] = [];
  for (let day = 0; day < EXAMPLE_DAYS; day += 1) {
    raw.push(...dayShape(shape, day, rng));
  }
  const rawKwh = raw.reduce((sum, kw) => sum + kw, 0) * dtHours(EXAMPLE_INTERVAL_MINUTES);
  const scale = rawKwh > 0 ? safeAnnual / rawKwh : 0;
  const samplesKw = raw.map((kw) => kw * scale);
  return {
    samplesKw,
    intervalMinutes: EXAMPLE_INTERVAL_MINUTES,
    synthetic: true,
    label: `Jahresverbrauch ${shape}`,
    sourceNote: "BEISPIELDATEN · BDEW-ähnliche Form, skaliert auf den Jahresverbrauch, nicht gemessen",
    rowCount: samplesKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const normalised = trimmed.includes(",") && !trimmed.includes(".")
    ? trimmed.replace(",", ".")
    : trimmed.replace(/\./g, "").includes(",")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed;
  const value = Number(normalised.replace(/\s/g, ""));
  return Number.isFinite(value) ? value : null;
}

function splitCsvLine(line: string): string[] {
  const delimiter = line.includes(";") ? ";" : ",";
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

export type CsvParseResult =
  | { ok: true; profile: LoadProfile }
  | { ok: false; message: string; line?: number };

export function parseLoadProfileCsv(text: string): CsvParseResult {
  if (text.length > 10 * 1024 * 1024) {
    return { ok: false, message: "Datei größer als 10 MB." };
  }
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 2) {
    return { ok: false, message: "CSV braucht eine Kopfzeile und mindestens einen Wert." };
  }
  const headerCells = splitCsvLine(lines[0] ?? "");
  const header = headerCells.join(" ").toLowerCase();
  const hasHeader = /[a-zäöü]/i.test(header);
  const start = hasHeader ? 1 : 0;
  const energyUnit = /kwh/.test(header) && !/\bkw\b/.test(header);
  const timestampCol = headerCells.findIndex((cell) => /time|zeit|date|datum|timestamp/i.test(cell));
  const valueCol = headerCells.findIndex((cell) => /kw|kwh|last|load|power|wert|value/i.test(cell));
  const rows: { t: number | null; value: number }[] = [];
  const warnings: string[] = [];
  let gapCount = 0;
  for (let i = start; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i] ?? "");
    const valueRaw = valueCol >= 0 ? cells[valueCol] : cells[cells.length - 1];
    const value = parseNumber(valueRaw ?? "");
    if (value === null) {
      gapCount += 1;
      warnings.push(`Zeile ${i + 1}: Wert fehlt`);
      continue;
    }
    let t: number | null = null;
    if (timestampCol >= 0 && cells[timestampCol]) {
      const parsed = Date.parse(cells[timestampCol] ?? "");
      t = Number.isFinite(parsed) ? parsed : null;
    }
    rows.push({ t, value });
  }
  if (rows.length < 4) {
    return { ok: false, message: "Zu wenige gültige Werte.", line: start + 1 };
  }
  let intervalMinutes: 15 | 60 = 15;
  if (rows.every((row) => row.t !== null)) {
    const deltas: number[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const deltaMin = ((rows[i]?.t ?? 0) - (rows[i - 1]?.t ?? 0)) / 60000;
      if (deltaMin > 0) {
        deltas.push(deltaMin);
      }
    }
    const median = percentile(deltas, 0.5);
    if (median > 40 && median < 80) {
      intervalMinutes = 60;
    } else if (median < 10 || median > 80) {
      return { ok: false, message: `Intervall ${Math.round(median)} min wird nicht unterstützt. Erwartet 15 oder 60.` };
    }
    let interpolated = 0;
    const filled: number[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      filled.push(rows[i]?.value ?? 0);
      if (i === rows.length - 1) {
        break;
      }
      const deltaMin = ((rows[i + 1]?.t ?? 0) - (rows[i]?.t ?? 0)) / 60000;
      const missing = Math.round(deltaMin / intervalMinutes) - 1;
      if (missing > 0 && missing < 8) {
        const left = rows[i]?.value ?? 0;
        const right = rows[i + 1]?.value ?? left;
        for (let step = 1; step <= missing; step += 1) {
          filled.push(left + ((right - left) * step) / (missing + 1));
          interpolated += 1;
        }
      } else if (missing >= 8) {
        gapCount += missing;
        warnings.push(`Zeile ${i + start + 1}: Lücke von ${missing} Intervallen, nicht interpoliert`);
      }
    }
    const samplesKw = energyUnit
      ? filled.map((value) => value * (60 / intervalMinutes))
      : filled;
    return {
      ok: true,
      profile: {
        samplesKw,
        intervalMinutes,
        synthetic: false,
        label: "CSV-Lastprofil",
        sourceNote: "Hochgeladenes Profil · im Browser verarbeitet",
        rowCount: samplesKw.length,
        gapCount,
        interpolatedGaps: interpolated,
        warnings,
      },
    };
  }
  const samplesKw = energyUnit
    ? rows.map((row) => row.value * (60 / intervalMinutes))
    : rows.map((row) => row.value);
  if (gapCount > 0) {
    warnings.unshift(`${gapCount} Lücken übersprungen`);
  }
  return {
    ok: true,
    profile: {
      samplesKw,
      intervalMinutes,
      synthetic: false,
      label: "CSV-Lastprofil",
      sourceNote: "Hochgeladenes Profil · im Browser verarbeitet",
      rowCount: samplesKw.length,
      gapCount,
      interpolatedGaps: 0,
      warnings,
    },
  };
}

/** Clear-sky PV kW. `clear` is tuned so south ≈ 950 kWh/kWp·a over 365 quarter-hours. */
export function pvPowerKw(input: {
  dayIndex: number;
  hour: number;
  kwp: number;
  orientation: PvOrientation;
}): number {
  if (input.kwp <= 0) {
    return 0;
  }
  const summer = Math.cos(((input.dayIndex - 172) / 365) * 2 * Math.PI);
  const dayLength = 10 + 4 * summer;
  const half = dayLength / 2;
  if (input.hour < 12 - half || input.hour > 12 + half) {
    return 0;
  }
  const x = (input.hour - 12) / half;
  const clear = 0.78 + 0.16 * summer;
  // Scale keeps a 1 kWp south array near 950 kWh/a on this clear-sky year.
  const yieldScale = 0.547;
  if (input.orientation === "south") {
    const bell = Math.cos((x * Math.PI) / 2);
    return input.kwp * Math.max(0, bell) * clear * 0.92 * yieldScale;
  }
  const east = Math.exp(-Math.pow((input.hour - (12 - half * 0.45)) / (half * 0.38), 2));
  const west = Math.exp(-Math.pow((input.hour - (12 + half * 0.45)) / (half * 0.38), 2));
  return input.kwp * (0.62 * east + 0.62 * west) * clear * yieldScale;
}

export function syntheticPriceEurPerMwh(dayIndex: number, hour: number): number {
  const winter = Math.cos(((dayIndex - 15) / 365) * 2 * Math.PI);
  const shape = 62 + 28 * Math.sin(((hour - 8) / 24) * 2 * Math.PI) + 18 * winter;
  const evening = 36 * Math.exp(-Math.pow((hour - 18.5) / 2.1, 2));
  const solarDip = -28 * Math.exp(-Math.pow((hour - 13) / 2.4, 2));
  return Math.round((shape + evening + solarDip) * 10) / 10;
}

function buildAlignedSeries(profile: LoadProfile, input: SitePlannerInput) {
  const dt = dtHours(profile.intervalMinutes);
  const perDay = stepsPerDay(profile.intervalMinutes);
  const pvKw = profile.samplesKw.map((_, index) => {
    if (!input.pvEnabled || input.pvKwp <= 0) {
      return 0;
    }
    const supplied = input.pvSeriesKw?.[index];
    if (supplied !== undefined && Number.isFinite(supplied)) {
      return Math.max(0, supplied);
    }
    const hour = ((index % perDay) * profile.intervalMinutes) / 60;
    const dayIndex = Math.floor(index / perDay);
    return pvPowerKw({
      dayIndex,
      hour,
      kwp: input.pvKwp,
      orientation: input.pvOrientation,
    });
  });
  const priceEurPerMwh = profile.samplesKw.map((_, index) => {
    const supplied = input.priceEurPerMwh?.[index];
    if (supplied !== undefined && Number.isFinite(supplied)) {
      return supplied;
    }
    const hour = ((index % perDay) * profile.intervalMinutes) / 60;
    const dayIndex = Math.floor(index / perDay);
    return syntheticPriceEurPerMwh(dayIndex, hour);
  });
  const netKw = profile.samplesKw.map((load, index) => load - (pvKw[index] ?? 0));
  return { dt, perDay, pvKw, priceEurPerMwh, netKw };
}

export function sizeStorage(input: {
  netKw: number[];
  limitKw: number;
  intervalMinutes: number;
  roundTripEfficiency: number;
}): { powerKw: number; energyKwh: number } {
  const perDay = stepsPerDay(input.intervalMinutes);
  const dt = dtHours(input.intervalMinutes);
  const etaDis = Math.sqrt(Math.min(1, Math.max(0.1, input.roundTripEfficiency)));
  const dailyPeak: number[] = [];
  const dailyEnergy: number[] = [];
  for (let start = 0; start < input.netKw.length; start += perDay) {
    const slice = input.netKw.slice(start, start + perDay);
    let peak = 0;
    let energy = 0;
    for (const net of slice) {
      const excess = Math.max(0, net - input.limitKw);
      peak = Math.max(peak, excess);
      energy += excess * dt;
    }
    dailyPeak.push(peak);
    dailyEnergy.push(energy);
  }
  const powerKw = Math.max(0, percentile(dailyPeak, 0.95));
  const energyKwh = Math.max(0, percentile(dailyEnergy, 0.95) / (etaDis * USABLE_WINDOW));
  return {
    powerKw: Math.round(powerKw * 10) / 10,
    energyKwh: Math.round(energyKwh * 10) / 10,
  };
}

type DispatchResult = {
  chargeKw: number[];
  dischargeKw: number[];
  gridKw: number[];
  arbChargeKwh: number;
  arbDischargeKwh: number;
  peakChargeKwh: number;
  peakDischargeKwh: number;
  retailNetEur: number;
  arbitrageEur: number;
  fullCycles: number;
};

function dispatchProfile(args: {
  netKw: number[];
  limitKw: number;
  powerKw: number;
  energyKwh: number;
  intervalMinutes: number;
  roundTripEfficiency: number;
  prices: number[];
  dynamicTariff: boolean;
  maxCyclesPerYear: number;
  retailEurPerKwh: number;
  feedInEurPerKwh: number;
}): DispatchResult {
  const n = args.netKw.length;
  const dt = dtHours(args.intervalMinutes);
  const perDay = stepsPerDay(args.intervalMinutes);
  const eta = Math.sqrt(Math.min(1, Math.max(0.1, args.roundTripEfficiency)));
  const chargeKw = new Array<number>(n).fill(0);
  const dischargeKw = new Array<number>(n).fill(0);
  const gridKw = new Array<number>(n).fill(0);
  let soc = args.energyKwh * 0.5;
  let arbChargeKwh = 0;
  let arbDischargeKwh = 0;
  let peakChargeKwh = 0;
  let peakDischargeKwh = 0;
  let retailNetEur = 0;
  let arbitrageEur = 0;
  const socMin = args.energyKwh * SOC_MIN;
  const socMax = args.energyKwh * SOC_MAX;
  const cycleCapKwh = Math.max(0, args.maxCyclesPerYear) * args.energyKwh;

  for (let dayStart = 0; dayStart < n; dayStart += perDay) {
    const dayEnd = Math.min(n, dayStart + perDay);
    const futureExcess = new Array<number>(dayEnd - dayStart).fill(0);
    let running = 0;
    for (let i = dayEnd - 1; i >= dayStart; i -= 1) {
      running += Math.max(0, (args.netKw[i] ?? 0) - args.limitKw) * dt;
      futureExcess[i - dayStart] = running;
    }
    const dayPrices = args.prices.slice(dayStart, dayEnd);
    const p20 = percentile(dayPrices, 0.2);
    const p80 = percentile(dayPrices, 0.8);
    for (let i = dayStart; i < dayEnd; i += 1) {
      const net = args.netKw[i] ?? 0;
      const price = args.prices[i] ?? 0;
      let discharge = 0;
      let charge = 0;
      let mode: "peak" | "arb" | "none" = "none";
      if (net > args.limitKw && soc > socMin && args.powerKw > 0) {
        const socLimit = ((soc - socMin) * eta) / dt;
        discharge = Math.min(net - args.limitKw, args.powerKw, Math.max(0, socLimit));
        mode = "peak";
      } else if (args.powerKw > 0 && args.energyKwh > 0) {
        const future = futureExcess[i - dayStart] ?? 0;
        const stored = Math.max(0, (soc - socMin) * eta);
        if (future > stored + 0.25 && net < args.limitKw) {
          const room = Math.max(0, args.limitKw - Math.max(net, 0));
          const needKw = (future - stored) / (eta * dt);
          const socRoom = Math.max(0, (socMax - soc) / (eta * dt));
          charge = Math.min(args.powerKw, room, Math.max(0, needKw), socRoom);
          mode = "peak";
        } else if (
          args.dynamicTariff &&
          arbDischargeKwh < cycleCapKwh &&
          price <= p20 &&
          soc < socMax - args.energyKwh * 0.05 &&
          net < args.limitKw * 0.9
        ) {
          const room = Math.max(0, args.limitKw * 0.9 - Math.max(net, 0));
          const socRoom = Math.max(0, (socMax - soc) / (eta * dt));
          charge = Math.min(args.powerKw * 0.8, room, socRoom);
          mode = charge > 0 ? "arb" : "none";
        } else if (
          args.dynamicTariff &&
          arbDischargeKwh < cycleCapKwh &&
          price >= p80 &&
          soc > args.energyKwh * 0.35 &&
          net > 0
        ) {
          const socLimit = ((soc - socMin) * eta) / dt;
          discharge = Math.min(net, args.powerKw * 0.8, Math.max(0, socLimit));
          mode = discharge > 0 ? "arb" : "none";
        }
      }
      if (discharge > 0) {
        soc -= (discharge * dt) / eta;
      }
      if (charge > 0) {
        soc += charge * dt * eta;
      }
      soc = Math.min(socMax, Math.max(socMin, soc));
      chargeKw[i] = charge;
      dischargeKw[i] = discharge;
      gridKw[i] = net + charge - discharge;
      const chargeKwh = charge * dt;
      const dischargeKwh = discharge * dt;
      if (mode === "peak") {
        peakChargeKwh += chargeKwh;
        peakDischargeKwh += dischargeKwh;
        const chargePrice = net < 0 ? args.feedInEurPerKwh : args.retailEurPerKwh;
        retailNetEur += dischargeKwh * args.retailEurPerKwh - chargeKwh * chargePrice;
      } else if (mode === "arb") {
        arbChargeKwh += chargeKwh;
        arbDischargeKwh += dischargeKwh;
        const wholesale = price / 1000;
        arbitrageEur += dischargeKwh * wholesale - chargeKwh * wholesale;
      }
    }
  }

  return {
    chargeKw,
    dischargeKw,
    gridKw,
    arbChargeKwh,
    arbDischargeKwh,
    peakChargeKwh,
    peakDischargeKwh,
    retailNetEur,
    arbitrageEur,
    fullCycles: args.energyKwh > 0 ? (peakDischargeKwh + arbDischargeKwh) / args.energyKwh : 0,
  };
}

function paybackYears(capex: number, annual: number, lifetime: number, discountRate: number): number | null {
  if (annual <= 0 || capex <= 0) {
    return null;
  }
  if (discountRate <= 0) {
    const years = capex / annual;
    return years > lifetime + 1 ? null : years;
  }
  let cumulative = 0;
  for (let year = 1; year <= lifetime; year += 1) {
    cumulative += annual / Math.pow(1 + discountRate, year);
    if (cumulative >= capex) {
      const previous = cumulative - annual / Math.pow(1 + discountRate, year);
      const span = cumulative - previous;
      return year - 1 + (span > 0 ? (capex - previous) / span : 0);
    }
  }
  return null;
}

function downsample(values: number[], target: number): number[] {
  if (values.length <= target) {
    return values;
  }
  const out: number[] = [];
  for (let i = 0; i < target; i += 1) {
    const index = Math.round((i / (target - 1)) * (values.length - 1));
    out.push(values[index] ?? 0);
  }
  return out;
}

function sliceDay(start: number, perDay: number, series: number[]): number[] {
  return series.slice(start, start + perDay);
}

export function planSite(input: SitePlannerInput): SitePlan {
  const profile = input.profile;
  const { dt, perDay, pvKw, priceEurPerMwh, netKw } = buildAlignedSeries(profile, input);
  const sized = input.autoSize
    ? sizeStorage({
        netKw,
        limitKw: input.limitKw,
        intervalMinutes: profile.intervalMinutes,
        roundTripEfficiency: input.roundTripEfficiency,
      })
    : {
        powerKw: Math.max(0, input.manualPowerKw),
        energyKwh: Math.max(0, input.manualEnergyKwh),
      };
  const retailEurPerKwh = input.energyPriceCtPerKwh / 100;
  const feedInEurPerKwh = input.feedInCtPerKwh / 100;
  const dispatched = dispatchProfile({
    netKw,
    limitKw: input.limitKw,
    powerKw: sized.powerKw,
    energyKwh: sized.energyKwh,
    intervalMinutes: profile.intervalMinutes,
    roundTripEfficiency: input.roundTripEfficiency,
    prices: priceEurPerMwh,
    dynamicTariff: input.dynamicTariff,
    maxCyclesPerYear: input.maxCyclesPerYear,
    retailEurPerKwh,
    feedInEurPerKwh,
  });

  let peakImportBefore = 0;
  let peakExportBefore = 0;
  let peakImportAfter = 0;
  let peakExportAfter = 0;
  let exceedBefore = 0;
  let exceedAfter = 0;
  let exportBeforeKwh = 0;
  let exportAfterKwh = 0;
  const importBefore: number[] = [];
  const importAfter: number[] = [];
  for (let i = 0; i < netKw.length; i += 1) {
    const before = netKw[i] ?? 0;
    const after = dispatched.gridKw[i] ?? 0;
    peakImportBefore = Math.max(peakImportBefore, before);
    peakExportBefore = Math.max(peakExportBefore, -before);
    peakImportAfter = Math.max(peakImportAfter, after);
    peakExportAfter = Math.max(peakExportAfter, -after);
    if (before > input.limitKw) {
      exceedBefore += dt;
    }
    if (after > input.limitKw + 1e-6) {
      exceedAfter += dt;
    }
    if (before < 0) {
      exportBeforeKwh += -before * dt;
    }
    if (after < 0) {
      exportAfterKwh += -after * dt;
    }
    importBefore.push(Math.max(0, before));
    importAfter.push(Math.max(0, after));
  }

  const demandChargeSavingsEur =
    Math.max(0, peakImportBefore - peakImportAfter) * Math.max(0, input.demandChargeEurPerKwYear);
  const exportDeltaEur = (exportAfterKwh - exportBeforeKwh) * feedInEurPerKwh;
  const capexEur = sized.energyKwh * Math.max(0, input.capexEurPerKwh);
  const opexEur = capexEur * OPEX_FRACTION;
  const annualBenefitEur =
    demandChargeSavingsEur +
    dispatched.retailNetEur +
    (input.dynamicTariff ? dispatched.arbitrageEur : 0) +
    exportDeltaEur -
    opexEur;
  const payback = paybackYears(capexEur, annualBenefitEur, input.lifetimeYears, input.discountRate);

  const dailyPeaks = [];
  for (let start = 0; start < netKw.length; start += perDay) {
    let peak = -Infinity;
    for (let i = start; i < Math.min(netKw.length, start + perDay); i += 1) {
      peak = Math.max(peak, netKw[i] ?? 0);
    }
    dailyPeaks.push({ start, peak });
  }
  const ranked = [...dailyPeaks].sort((a, b) => a.peak - b.peak);
  const peakDay = ranked[ranked.length - 1] ?? { start: 0, peak: 0 };
  const medianDay = ranked[Math.floor(ranked.length / 2)] ?? peakDay;

  const durationBeforeKw = downsample(
    [...importBefore].sort((a, b) => b - a),
    180
  );
  const durationAfterKw = downsample(
    [...importAfter].sort((a, b) => b - a),
    180
  );

  const cashflow: CashflowYear[] = [];
  let cumulative = -capexEur;
  cashflow.push({ year: 0, annualEur: -capexEur, cumulativeEur: cumulative });
  for (let year = 1; year <= input.lifetimeYears; year += 1) {
    const discounted = input.discountRate > 0 ? annualBenefitEur / Math.pow(1 + input.discountRate, year) : annualBenefitEur;
    cumulative += discounted;
    cashflow.push({ year, annualEur: discounted, cumulativeEur: cumulative });
  }

  const factors = [0.8, 1, 1.2];
  const sensitivity: SensitivityCell[] = [];
  for (const capexFactor of factors) {
    for (const priceFactor of factors) {
      const scaledCapex = capexEur * capexFactor;
      const scaledOpex = scaledCapex * OPEX_FRACTION;
      const scaledAnnual =
        (demandChargeSavingsEur +
          dispatched.retailNetEur +
          (input.dynamicTariff ? dispatched.arbitrageEur : 0) +
          exportDeltaEur) *
          priceFactor -
        scaledOpex;
      sensitivity.push({
        capexFactor,
        priceFactor,
        paybackYears: paybackYears(scaledCapex, scaledAnnual, input.lifetimeYears, input.discountRate),
        base: capexFactor === 1 && priceFactor === 1,
      });
    }
  }

  const reserveFraction = input.limitKw > 0 ? (input.limitKw - peakImportAfter) / input.limitKw : 0;
  const importWithinLimit = peakImportAfter <= input.limitKw + 1e-3;
  const exportWithinLimit = peakExportAfter <= input.limitKw + 1e-3;
  const connection: ConnectionStatus = !importWithinLimit || !exportWithinLimit
    ? "over"
    : peakImportAfter >= input.limitKw * 0.9
      ? "near"
      : "ok";

  const pricesAreSupplied = Array.isArray(input.priceEurPerMwh) && input.priceEurPerMwh.length > 0;
  const pvIsSupplied = Array.isArray(input.pvSeriesKw) && input.pvSeriesKw.length > 0;

  const toDay = (start: number): DaySeries => ({
    dayIndex: Math.floor(start / perDay),
    loadKw: sliceDay(start, perDay, profile.samplesKw),
    pvKw: sliceDay(start, perDay, pvKw),
    chargeKw: sliceDay(start, perDay, dispatched.chargeKw),
    dischargeKw: sliceDay(start, perDay, dispatched.dischargeKw),
    gridKw: sliceDay(start, perDay, dispatched.gridKw),
    priceEurPerMwh: sliceDay(start, perDay, priceEurPerMwh),
  });

  return {
    powerKw: sized.powerKw,
    energyKwh: sized.energyKwh,
    cRate: sized.energyKwh > 0 ? sized.powerKw / sized.energyKwh : 0,
    peakImportBeforeKw: peakImportBefore,
    peakImportAfterKw: peakImportAfter,
    peakExportBeforeKw: peakExportBefore,
    peakExportAfterKw: peakExportAfter,
    exceedanceHoursBefore: exceedBefore,
    exceedanceHoursAfter: exceedAfter,
    demandChargeSavingsEur,
    retailNetEur: dispatched.retailNetEur,
    arbitrageEur: input.dynamicTariff ? dispatched.arbitrageEur : 0,
    exportDeltaEur,
    opexEur,
    annualBenefitEur,
    capexEur,
    paybackYears: payback,
    fullCycles: dispatched.fullCycles,
    connection,
    reserveFraction,
    checks: {
      importWithinLimit,
      exportWithinLimit,
      exceedanceHoursZero: exceedAfter < 0.05,
      reserveAtLeast10Pct: reserveFraction >= 0.1 - 1e-6,
    },
    peakDay: toDay(peakDay.start),
    medianDay: toDay(medianDay.start),
    durationBeforeKw,
    durationAfterKw,
    cashflow,
    sensitivity,
    gridKw: dispatched.gridKw,
    assumptions: {
      syntheticProfile: profile.synthetic,
      syntheticPv: input.pvEnabled && !pvIsSupplied,
      syntheticPrices: input.dynamicTariff && !pricesAreSupplied,
      roundTripEfficiency: input.roundTripEfficiency,
      usableSocWindow: USABLE_WINDOW,
      opexFractionOfCapex: OPEX_FRACTION,
      sizingRule: input.autoSize
        ? "P = P95 der täglichen Importspitze über dem Anschluss. E = P95 der täglichen Überschussenergie / (η_dis · 0,85)."
        : "Leistung und Kapazität sind manuell gesetzt.",
      priceNote: pricesAreSupplied
        ? "Preise aus der übergebenen Zeitreihe."
        : "Synthetisches Day-Ahead-Profil (Saison + Abendspitze + Solar-Dip). Kein Börsenfeed.",
      excluded: [
        "Regelenergie",
        "§19 StromNEV",
        "SCADA",
        "Degradation",
        "Steuern und Finanzierung",
      ],
    },
  };
}

/** Fixed 24 h commercial example used on the home hero. Synthetic, seed 7, no PV. */
export function illustrativeCommercialDay() {
  const rng = mulberry32(7);
  const loadKw = dayShape("gewerbe", 200, rng);
  const profile: LoadProfile = {
    samplesKw: loadKw,
    intervalMinutes: 15,
    synthetic: true,
    label: "Beispielstandort · Gewerbe · 24 h",
    sourceNote: "BEISPIELDATEN · synthetisches Profil, nicht gemessen",
    rowCount: loadKw.length,
    gapCount: 0,
    interpolatedGaps: 0,
    warnings: [],
  };
  const economics = defaultPlannerEconomics();
  const plan = planSite({
    profile,
    pvEnabled: false,
    pvKwp: 0,
    pvOrientation: "south",
    limitKw: economics.limitKw,
    voltage: "MS",
    demandChargeEurPerKwYear: economics.demandChargeEurPerKwYear,
    energyPriceCtPerKwh: economics.energyPriceCtPerKwh,
    feedInCtPerKwh: economics.feedInCtPerKwh,
    dynamicTariff: false,
    autoSize: false,
    manualPowerKw: 310,
    manualEnergyKwh: 620,
    roundTripEfficiency: economics.roundTripEfficiency,
    capexEurPerKwh: economics.capexEurPerKwh,
    maxCyclesPerYear: economics.maxCyclesPerYear,
    lifetimeYears: economics.lifetimeYears,
    discountRate: 0,
  });
  return { profile, plan };
}
