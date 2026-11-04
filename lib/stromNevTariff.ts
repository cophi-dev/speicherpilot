/**
 * § 17 StromNEV network tariff by utilisation duration (Benutzungsdauer).
 * Model price sheet for MS — not a particular grid operator.
 */

export const MODEL_TARIFF_MS = {
  kEurPerKwYear: 250,
  g0: 0.15,
  gk: 0.55,
  tKHours: 2500,
  hoursPerYear: 8760,
  labelDe: "Modell-Preisblatt Mittelspannung (Größenordnung veröffentlichter Preisblätter, kein bestimmter Netzbetreiber)",
} as const;

const T_K = MODEL_TARIFF_MS.tKHours;
const G0 = MODEL_TARIFF_MS.g0;
const GK = MODEL_TARIFF_MS.gk;
const M_U = (GK - G0) / T_K;
const M_O = (1 - GK) / (MODEL_TARIFF_MS.hoursPerYear - T_K);
const G0_O = GK - M_O * T_K;

export type TariffBand = "unter" | "ab";

export type StromNevTariffResult = {
  utilisationHours: number;
  band: TariffBand;
  lpEurPerKwYear: number;
  apEurPerKwh: number;
  totalEur: number;
};

export function gleichzeitigkeitsG(hours: number): number {
  if (hours <= 0) {
    return G0;
  }
  if (hours <= T_K) {
    return G0 + M_U * hours;
  }
  return G0_O + M_O * hours;
}

export function validateGleichzeitigkeitParams(g0: number, gk: number): void {
  if (g0 > 0.2) {
    throw new Error("g0 must be ≤ 0.2");
  }
  if (Math.abs(gleichzeitigkeitsG(MODEL_TARIFF_MS.hoursPerYear) - 1) > 1e-9) {
    throw new Error("g(8760) must equal 1");
  }
}

export function utilisationHours(maxKw: number, annualKwh: number): number {
  if (!(maxKw > 0)) {
    return 0;
  }
  return annualKwh / maxKw;
}

export function stromNevTariff(
  maxKw: number,
  annualKwh: number,
  kEurPerKwYear: number = MODEL_TARIFF_MS.kEurPerKwYear,
): StromNevTariffResult {
  const t = utilisationHours(maxKw, annualKwh);
  const band: TariffBand = t < T_K ? "unter" : "ab";
  let lp: number;
  let ap: number;
  if (band === "unter") {
    lp = kEurPerKwYear * G0;
    ap = kEurPerKwYear * M_U;
  } else {
    lp = kEurPerKwYear * G0_O;
    ap = kEurPerKwYear * M_O;
  }
  const total = lp * maxKw + ap * annualKwh;
  return {
    utilisationHours: t,
    band,
    lpEurPerKwYear: lp,
    apEurPerKwh: ap / 1000,
    totalEur: total,
  };
}

export function stromNevSavings(args: {
  pBeforeKw: number;
  wBeforeKwh: number;
  pAfterKw: number;
  wAfterKwh: number;
  kEurPerKwYear?: number;
}): {
  before: StromNevTariffResult;
  after: StromNevTariffResult;
  savingsEur: number;
  bandChanged: boolean;
} {
  const before = stromNevTariff(args.pBeforeKw, args.wBeforeKwh, args.kEurPerKwYear);
  const after = stromNevTariff(args.pAfterKw, args.wAfterKwh, args.kEurPerKwYear);
  return {
    before,
    after,
    savingsEur: before.totalEur - after.totalEur,
    bandChanged: before.band !== after.band,
  };
}

export function modelTariffUncertaintyFactor(): { low: number; high: number } {
  return { low: 0.7, high: 1.3 };
}
