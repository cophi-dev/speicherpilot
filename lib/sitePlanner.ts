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
 * - Dispatch, per day, market mode: discharge to hold import at the limit; charge
 *   earlier the same day when later excess exceeds stored energy; then arbitrage
 *   on the remaining headroom if a dynamic tariff is on.
 * - Grid-serving mode uses the same limits and the same battery, but it does not
 *   arbitrage. It discharges to cut import above the shave target, absorbs
 *   on-site surplus without creating grid import, and precharges only up to the
 *   uncontrolled daily import peak or the cap, whichever is lower. It therefore
 *   does not raise the site's import peak.
 * - An optional import cap (flexible connection) lowers the shave target. An
 *   optional export cap absorbs what the battery can and treats the rest as
 *   scenario curtailment. That is not a SCADA measurement.
 * - Day-ahead prices, when not supplied, are a synthetic 15-minute seasonal shape
 *   in €/MWh, not an intraday order book and not a SMARD or Energy-Charts print.
 * - Demand-charge saving uses the annual maximum import before and after storage.
 * - Retail energy value applies only to peak-shaving charge/discharge. Charging
 *   while the site would otherwise export costs the feed-in tariff (lost export).
 * - Arbitrage cashflow is wholesale discharge minus wholesale charge on that
 *   15-minute price. Revenue stacking is not priced.
 * - OPEX is 1.5 % of CAPEX per year. Payback is undiscounted unless a discount
 *   rate is set. NPV discounts the same annual benefit. No degradation, no
 *   §19 StromNEV, no balancing energy.
 * - Voltage band is a planning hint from requested connection power, not a
 *   connection offer and not legal advice: ≤135 kW NS (VDE-AR-N 4105), above
 *   that up to 20 MW MS (VDE-AR-N 4110), above that HS (VDE-AR-N 4120).
 */

export type ExampleProfileId = "gewerbe" | "kuehlhaus" | "ladepark";
export type ManualShapeId = "G0" | "G1" | "L0";
export type VoltageLevel = "NS" | "MS" | "HS";
export type OperationMode = "market" | "grid-serving";
export type GridImpact = "reduces" | "increases" | "unchanged";
export type PvOrientation = "south" | "east-west";
export type ConnectionStatus = "ok" | "near" | "over";

/** Planning hints, not the legal scope of the technical connection rules. */
export const VOLTAGE_NS_MAX_KW = 135;
export const VOLTAGE_MS_MAX_KW = 20_000;

export type VoltageSuggestion = {
  level: VoltageLevel;
  rule: "VDE-AR-N 4105" | "VDE-AR-N 4110" | "VDE-AR-N 4120";
  href: string;
  basisKw: number;
};

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
  /** Market dispatch, or grid-serving dispatch with no arbitrage. Default market. */
  operation?: OperationMode;
  /** Flexible-connection import cap in kW. Omit to use the firm limit only. */
  importCapKw?: number | null;
  /** Flexible-connection export cap in kW. Omit to use the firm limit only. */
  exportCapKw?: number | null;
  /**
   * Planning rating for the connection load ratio. Omit to use the firm limit.
   * This is not a measured transformer.
   */
  transformerRatingKw?: number | null;
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
  /** Energy / power. Zero when either side is zero. */
  durationHours: number;
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
  /** −CAPEX plus the discounted annual benefit over the lifetime. */
  npvEur: number;
  /** Always null. Stacking is a placeholder and is not added to the benefit. */
  revenueStackingEur: null;
  operation: OperationMode;
  requestedConnectionKw: number;
  availableConnectionKw: number;
  voltageSuggestion: VoltageSuggestion;
  /** max(import, export) at the grid connection point, before and after storage. */
  gcpPeakBeforeKw: number;
  gcpPeakAfterKw: number;
  gridImpact: GridImpact;
  importImpact: GridImpact;
  /** Firm limit, unless the caller passed a planning rating. Not a measured transformer. */
  transformerRatingKw: number;
  transformerMeasured: false;
  transformerLoadBeforePct: number;
  transformerLoadAfterPct: number;
  importCapKw: number | null;
  exportCapKw: number | null;
  curtailmentKwh: number;
  capImportRespected: boolean;
  capExportRespected: boolean;
  gridSupport: GridSupportAssessment;
  loadBands: LoadBand[];
  topQuarterHours: TopQuarterHour[];
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

const VDE_HREFS = {
  NS: "https://www.vde.com/de/fnn/themen/tar/tar-niederspannung",
  MS: "https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-mittelspannung-vde-ar-n-4110",
  HS: "https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-hochspannung-vde-ar-n-4120",
} as const;

/** Planning hint from requested connection power. Not a connection offer or legal advice. */
export function suggestVoltage(requestedKw: number): VoltageSuggestion {
  const basisKw = Math.max(0, requestedKw);
  if (basisKw <= VOLTAGE_NS_MAX_KW) {
    return { level: "NS", rule: "VDE-AR-N 4105", href: VDE_HREFS.NS, basisKw };
  }
  if (basisKw <= VOLTAGE_MS_MAX_KW) {
    return { level: "MS", rule: "VDE-AR-N 4110", href: VDE_HREFS.MS, basisKw };
  }
  return { level: "HS", rule: "VDE-AR-N 4120", href: VDE_HREFS.HS, basisKw };
}

function optionalCap(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * Provisional grid-support rule. Thresholds are not final and wait on domain
 * confirmation. Change them only here; /methodik quotes the same numbers.
 */
export const GRID_SUPPORT_CONFIG = {
  provisional: true,
  /** Site load at or above this share of the connection limit counts as a peak window. */
  peakUtilisation: 0.9,
  /** Discharge energy in those windows required for `supportive`. */
  supportiveMinShare: 0.6,
  /** Lower bound of the mixed band. Below this, without a new peak, the result is market-driven. */
  mixedMinShare: 0.3,
} as const;

export type GridSupportConfig = typeof GRID_SUPPORT_CONFIG;
export type GridSupportStatus = "supportive" | "mixed" | "market" | "new-peak";

export type GridSupportAssessment = {
  status: GridSupportStatus;
  /** Share of discharge energy in peak windows. 0–1. */
  dischargeShareInPeaks: number;
  createsNewPeak: boolean;
  dischargeKwh: number;
  dischargeInPeakKwh: number;
  config: GridSupportConfig;
};

export type LoadBandId = "below50" | "50to75" | "75to90" | "above90";

export type LoadBand = {
  id: LoadBandId;
  chargeKwh: number;
  dischargeKwh: number;
};

export type TopQuarterHour = {
  index: number;
  dayIndex: number;
  hour: number;
  loadKw: number;
  gridAfterKw: number;
  bessKw: number;
};

export function assessGridSupport(args: {
  loadKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  gridKw: number[];
  /** Grid connection point before storage. Positive is import. */
  netKw: number[];
  limitKw: number;
  intervalHours: number;
  config?: GridSupportConfig;
}): GridSupportAssessment {
  const config = args.config ?? GRID_SUPPORT_CONFIG;
  const threshold = args.limitKw * config.peakUtilisation;
  let peakBefore = 0;
  for (const net of args.netKw) {
    if (net > peakBefore) {
      peakBefore = net;
    }
  }
  let dischargeKwh = 0;
  let dischargeInPeakKwh = 0;
  let createsNewPeak = false;
  const n = args.loadKw.length;
  for (let i = 0; i < n; i += 1) {
    const discharge = Math.max(0, args.dischargeKw[i] ?? 0) * args.intervalHours;
    dischargeKwh += discharge;
    if ((args.loadKw[i] ?? 0) >= threshold) {
      dischargeInPeakKwh += discharge;
    }
    const charge = args.chargeKw[i] ?? 0;
    const grid = args.gridKw[i] ?? 0;
    if (charge > 1e-6 && grid > peakBefore + 0.05) {
      createsNewPeak = true;
    }
  }
  const dischargeShareInPeaks = dischargeKwh > 0 ? dischargeInPeakKwh / dischargeKwh : 0;
  return {
    status: classifyGridSupport(dischargeShareInPeaks, createsNewPeak, config),
    dischargeShareInPeaks,
    createsNewPeak,
    dischargeKwh,
    dischargeInPeakKwh,
    config,
  };
}

/**
 * Connection-check settings that stay inside the model.
 * `fairGridAboveMva` is not shown. No public primary source names a Hamburg threshold, so the UI does not.
 * `flexibleCapFraction` is a scenario assumption, not a published connection limit.
 */
export const GRID_CONNECTION_CONFIG = {
  fairGridAboveMva: 1.5,
  fairGridFrom: "2026-H2",
  flexibleCapFraction: 0.8,
} as const;

export type GridConnectionConfig = typeof GRID_CONNECTION_CONFIG;

/** Higher of the uncontrolled site peak and the connection capacity entered by the user. */
export function connectionRequestKw(requestedPeakKw: number, enteredLimitKw: number) {
  const requested = Number.isFinite(requestedPeakKw) ? requestedPeakKw : 0;
  const entered = Number.isFinite(enteredLimitKw) ? enteredLimitKw : 0;
  return Math.max(0, requested, entered);
}

/** Internal flag. Not rendered, because no public primary source names this threshold. */
export function exceedsFairGrid(requestedKw: number, config: GridConnectionConfig = GRID_CONNECTION_CONFIG) {
  return requestedKw > config.fairGridAboveMva * 1000;
}

export function classifyGridSupport(
  dischargeShareInPeaks: number,
  createsNewPeak: boolean,
  config: GridSupportConfig = GRID_SUPPORT_CONFIG
): GridSupportStatus {
  if (createsNewPeak) {
    return "new-peak";
  }
  if (dischargeShareInPeaks >= config.supportiveMinShare) {
    return "supportive";
  }
  if (dischargeShareInPeaks >= config.mixedMinShare) {
    return "mixed";
  }
  return "market";
}

export function loadBandsFor(args: {
  loadKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  limitKw: number;
  intervalHours: number;
}): LoadBand[] {
  const bands: LoadBand[] = [
    { id: "below50", chargeKwh: 0, dischargeKwh: 0 },
    { id: "50to75", chargeKwh: 0, dischargeKwh: 0 },
    { id: "75to90", chargeKwh: 0, dischargeKwh: 0 },
    { id: "above90", chargeKwh: 0, dischargeKwh: 0 },
  ];
  const limit = args.limitKw > 0 ? args.limitKw : 0;
  for (let i = 0; i < args.loadKw.length; i += 1) {
    const ratio = limit > 0 ? (args.loadKw[i] ?? 0) / limit : 0;
    const band = ratio >= 0.9 ? bands[3] : ratio >= 0.75 ? bands[2] : ratio >= 0.5 ? bands[1] : bands[0];
    if (!band) {
      continue;
    }
    band.chargeKwh += Math.max(0, args.chargeKw[i] ?? 0) * args.intervalHours;
    band.dischargeKwh += Math.max(0, args.dischargeKw[i] ?? 0) * args.intervalHours;
  }
  return bands;
}

export function topQuarterHours(args: {
  loadKw: number[];
  chargeKw: number[];
  dischargeKw: number[];
  gridKw: number[];
  intervalMinutes: number;
  count?: number;
}): TopQuarterHour[] {
  const ranked = args.loadKw.map((loadKw, index) => ({ loadKw, index }));
  ranked.sort((a, b) => b.loadKw - a.loadKw || a.index - b.index);
  const count = args.count ?? 10;
  return ranked.slice(0, count).map(({ loadKw, index }) => {
    const stepsPerDay = args.intervalMinutes === 60 ? 24 : 96;
    const step = index % stepsPerDay;
    return {
      index,
      dayIndex: Math.floor(index / stepsPerDay),
      hour: (step * args.intervalMinutes) / 60,
      loadKw,
      gridAfterKw: args.gridKw[index] ?? 0,
      bessKw: (args.dischargeKw[index] ?? 0) - (args.chargeKw[index] ?? 0),
    };
  });
}

function impactOf(before: number, after: number): GridImpact {
  if (after < before - 0.05) {
    return "reduces";
  }
  if (after > before + 0.05) {
    return "increases";
  }
  return "unchanged";
}

function netPresentValue(capex: number, annual: number, lifetime: number, discountRate: number): number {
  let total = -capex;
  const years = Math.max(0, Math.floor(lifetime));
  for (let year = 1; year <= years; year += 1) {
    total += discountRate > 0 ? annual / Math.pow(1 + discountRate, year) : annual;
  }
  return total;
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
  curtailmentKwh: number;
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
  operation: OperationMode;
  importCapKw: number | null;
  exportCapKw: number | null;
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
  let curtailmentKwh = 0;
  const socMin = args.energyKwh * SOC_MIN;
  const socMax = args.energyKwh * SOC_MAX;
  const cycleCapKwh = Math.max(0, args.maxCyclesPerYear) * args.energyKwh;
  const shaveTo = Math.min(args.limitKw, args.importCapKw ?? args.limitKw);
  const market = args.operation === "market";

  for (let dayStart = 0; dayStart < n; dayStart += perDay) {
    const dayEnd = Math.min(n, dayStart + perDay);
    let dayPeakImport = 0;
    for (let i = dayStart; i < dayEnd; i += 1) {
      dayPeakImport = Math.max(dayPeakImport, args.netKw[i] ?? 0);
    }
    const chargeCeiling = market ? shaveTo : Math.min(shaveTo, Math.max(0, dayPeakImport));
    const futureExcess = new Array<number>(dayEnd - dayStart).fill(0);
    let running = 0;
    for (let i = dayEnd - 1; i >= dayStart; i -= 1) {
      running += Math.max(0, (args.netKw[i] ?? 0) - shaveTo) * dt;
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
      if (net > shaveTo && soc > socMin && args.powerKw > 0) {
        const socLimit = ((soc - socMin) * eta) / dt;
        discharge = Math.min(net - shaveTo, args.powerKw, Math.max(0, socLimit));
        mode = "peak";
      } else if (args.powerKw > 0 && args.energyKwh > 0) {
        const future = futureExcess[i - dayStart] ?? 0;
        const stored = Math.max(0, (soc - socMin) * eta);
        const socRoom = Math.max(0, (socMax - soc) / (eta * dt));
        if (!market && net < -1e-6) {
          charge = Math.min(args.powerKw, -net, socRoom);
          mode = charge > 0 ? "peak" : "none";
        } else if (future > stored + 0.25 && net < chargeCeiling) {
          const room = Math.max(0, chargeCeiling - Math.max(net, 0));
          const needKw = (future - stored) / (eta * dt);
          charge = Math.min(args.powerKw, room, Math.max(0, needKw), socRoom);
          mode = "peak";
        } else if (
          market &&
          args.dynamicTariff &&
          arbDischargeKwh < cycleCapKwh &&
          price <= p20 &&
          soc < socMax - args.energyKwh * 0.05 &&
          net < shaveTo * 0.9
        ) {
          const room = Math.max(0, shaveTo * 0.9 - Math.max(net, 0));
          charge = Math.min(args.powerKw * 0.8, room, socRoom);
          mode = charge > 0 ? "arb" : "none";
        } else if (
          market &&
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
      let extraCharge = 0;
      let grid = net + charge - discharge;
      if (args.exportCapKw != null && grid < -args.exportCapKw) {
        const needKw = -args.exportCapKw - grid;
        const powerLeft = Math.max(0, args.powerKw - charge);
        const socRoom = Math.max(0, (socMax - soc) / (eta * dt));
        extraCharge = Math.min(Math.max(0, needKw), powerLeft, socRoom);
        if (extraCharge > 0) {
          charge += extraCharge;
          soc += extraCharge * dt * eta;
          soc = Math.min(socMax, Math.max(socMin, soc));
          grid = net + charge - discharge;
        }
        if (grid < -args.exportCapKw - 1e-6) {
          curtailmentKwh += (-grid - args.exportCapKw) * dt;
          grid = -args.exportCapKw;
        }
      }
      chargeKw[i] = charge;
      dischargeKw[i] = discharge;
      gridKw[i] = grid;
      const dischargeKwh = discharge * dt;
      const pricedCharge = (charge - extraCharge) * dt;
      const extraKwh = extraCharge * dt;
      if (mode === "peak") {
        peakChargeKwh += pricedCharge + extraKwh;
        peakDischargeKwh += dischargeKwh;
        const chargePrice = net < 0 ? args.feedInEurPerKwh : args.retailEurPerKwh;
        retailNetEur += dischargeKwh * args.retailEurPerKwh - (pricedCharge + extraKwh) * chargePrice;
      } else if (mode === "arb") {
        arbChargeKwh += pricedCharge;
        arbDischargeKwh += dischargeKwh;
        const wholesale = price / 1000;
        arbitrageEur += dischargeKwh * wholesale - pricedCharge * wholesale;
        if (extraKwh > 0) {
          peakChargeKwh += extraKwh;
          const chargePrice = net < 0 ? args.feedInEurPerKwh : args.retailEurPerKwh;
          retailNetEur -= extraKwh * chargePrice;
        }
      } else if (extraKwh > 0) {
        peakChargeKwh += extraKwh;
        const chargePrice = net < 0 ? args.feedInEurPerKwh : args.retailEurPerKwh;
        retailNetEur -= extraKwh * chargePrice;
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
    arbitrageEur: market ? arbitrageEur : 0,
    curtailmentKwh,
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
  const operation = input.operation ?? "market";
  const importCapKw = optionalCap(input.importCapKw);
  const exportCapKw = optionalCap(input.exportCapKw);
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
    operation,
    importCapKw,
    exportCapKw,
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
  const npvEur = netPresentValue(capexEur, annualBenefitEur, input.lifetimeYears, input.discountRate);

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

  const gcpPeakBeforeKw = Math.max(peakImportBefore, peakExportBefore);
  const gcpPeakAfterKw = Math.max(peakImportAfter, peakExportAfter);
  const transformerRatingKw =
    input.transformerRatingKw != null && input.transformerRatingKw > 0 ? input.transformerRatingKw : input.limitKw;
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

  const gridSupport = assessGridSupport({
    loadKw: profile.samplesKw,
    chargeKw: dispatched.chargeKw,
    dischargeKw: dispatched.dischargeKw,
    gridKw: dispatched.gridKw,
    netKw,
    limitKw: input.limitKw,
    intervalHours: dt,
  });
  const loadBandRows = loadBandsFor({
    loadKw: profile.samplesKw,
    chargeKw: dispatched.chargeKw,
    dischargeKw: dispatched.dischargeKw,
    limitKw: input.limitKw,
    intervalHours: dt,
  });
  const topSlots = topQuarterHours({
    loadKw: profile.samplesKw,
    chargeKw: dispatched.chargeKw,
    dischargeKw: dispatched.dischargeKw,
    gridKw: dispatched.gridKw,
    intervalMinutes: profile.intervalMinutes,
  });

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
    durationHours: sized.powerKw > 0 ? sized.energyKwh / sized.powerKw : 0,
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
    npvEur,
    revenueStackingEur: null,
    operation,
    requestedConnectionKw: gcpPeakBeforeKw,
    availableConnectionKw: input.limitKw,
    voltageSuggestion: suggestVoltage(gcpPeakBeforeKw),
    gcpPeakBeforeKw,
    gcpPeakAfterKw,
    gridImpact: impactOf(gcpPeakBeforeKw, gcpPeakAfterKw),
    importImpact: impactOf(peakImportBefore, peakImportAfter),
    transformerRatingKw,
    transformerMeasured: false,
    transformerLoadBeforePct: transformerRatingKw > 0 ? gcpPeakBeforeKw / transformerRatingKw : 0,
    transformerLoadAfterPct: transformerRatingKw > 0 ? gcpPeakAfterKw / transformerRatingKw : 0,
    importCapKw,
    exportCapKw,
    curtailmentKwh: dispatched.curtailmentKwh,
    capImportRespected: importCapKw == null || peakImportAfter <= importCapKw + 1e-3,
    capExportRespected: exportCapKw == null || peakExportAfter <= exportCapKw + 1e-3,
    gridSupport,
    loadBands: loadBandRows,
    topQuarterHours: topSlots,
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
        ? "Preise aus der übergebenen 15-Minuten-Reihe. Kein separates Intraday-Orderbuch."
        : "Synthetisches 15-Minuten-Preisband in Day-Ahead-Form (Saison, Abendspitze, Solar-Dip). Kein Intraday-Orderbuch und kein Börsenfeed.",
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
