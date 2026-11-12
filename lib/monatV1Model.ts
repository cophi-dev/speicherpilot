import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";
import { fleetPowerGwLabel } from "@/lib/fleetXkConvention";
import {
  getFleetRun,
  monthStatsForRun,
  NATIONAL_FLEET_FACTORS,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

const GRAPH_FACTORS: NationalFleetFactor[] = [1, 2, 5, 10];
const DT_H = 0.25;

export type MonatV1HeroPoint = {
  factor: NationalFleetFactor;
  spitzeGw: number;
  ueberschussGw: number;
  marktGw: number | null;
};

export type MonatV1DurationPoint = {
  factor: NationalFleetFactor;
  h176: number;
  h2: number;
  h4: number;
  powerGwLabel: string;
};

export type MonatV1PoolRow = {
  factor: NationalFleetFactor;
  poolSharePct: number;
  poolLabel: string;
  reductionGw: number;
};

export type MonatV1Model = {
  monthKey: string;
  refPeakGw: number;
  surplusPoolGwh: number;
  yMinGw: number;
  yMaxGw: number;
  yTicksGw: number[];
  hero: {
    points: MonatV1HeroPoint[];
    marktFromFactor3Gw: number;
    insightSpitzeX10Gw: number;
    kipppunktLabel: string;
    kipppunktFactor: number;
  };
  heroTable: {
    spitzeX1: number;
    spitzeX10: number;
    ueberschussX1: number;
    ueberschussX10: number;
    marktX1: number;
  };
  duration: MonatV1DurationPoint[];
  showMehrAlsLink: boolean;
  pool: MonatV1PoolRow[];
  compareX10: { ueberschussGw: number; spitzeGw: number };
  graphFootnote: string;
  pageFootnote: string;
};

function loadDurationSensitivity(): Record<string, Record<string, number>> {
  const path = join(process.cwd(), "data/national-fleet/2026-10/duration-sensitivity.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    peak_reduction_gw: Record<string, Record<string, number>>;
  };
  return raw.peak_reduction_gw;
}

function loadMarktFactor3PeakGw(): number {
  const path = join(process.cwd(), "data/national-fleet/2026-10/market-factor-3.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as { after_max_residual_mw: number };
  return raw.after_max_residual_mw / 1000;
}

function loadMarktKipppunktFactor(): number {
  const path = join(process.cwd(), "data/national-fleet/2026-10/market-kipppunkt.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as { factor_approx: number };
  return raw.factor_approx;
}

/** Day-Ahead-Erlös bei Markt ×2 (= 1× zusätzliche Flotte), Modellschätzung. */
export function marktAdditionEurMio(bundle: NationalFleetMonthBundle): number | null {
  try {
    const run = getFleetRun(bundle, 2, "markt");
    let eur = 0;
    for (let i = 0; i < run.intervalCount; i += 1) {
      eur += run.day_ahead_eur_mwh[i] * DT_H * (run.d_mw[i] - run.c_mw[i]);
    }
    return eur / 1_000_000;
  } catch {
    return null;
  }
}

function roundGw(v: number, decimals = 2): number {
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
}

export function buildMonatV1Model(bundle: NationalFleetMonthBundle): MonatV1Model {
  const refRow = bundle.summary["1"]?.surplus_wind_solar_over_load as Record<string, number> | undefined;
  const refPeakGw = roundGw((refRow?.baseline_max_residual_mw ?? 64_405.9) / 1000, 1);
  const surplusPoolGwh = (bundle.provenance?.month_surplus_pool_gwh as number | undefined) ?? 134.242;

  const heroPoints: MonatV1HeroPoint[] = GRAPH_FACTORS.map((factor) => {
    const spitze = monthStatsForRun(bundle, factor, "spitze");
    const ueberschuss = monthStatsForRun(bundle, factor, "ueberschuss");
    const markt =
      factor >= 3 ? monthStatsForRun(bundle, factor, "markt") : null;
    return {
      factor,
      spitzeGw: roundGw(spitze.peakAfterGw, 2),
      ueberschussGw: roundGw(ueberschuss.peakAfterGw, 2),
      marktGw: markt ? roundGw(markt.peakAfterGw, 2) : null,
    };
  });

  const marktX3 = loadMarktFactor3PeakGw();
  const marktPeaks = [
    ...heroPoints.filter((p) => p.marktGw != null).map((p) => p.marktGw as number),
    marktX3,
  ];
  const allPeaks = [
    ...heroPoints.flatMap((p) => [p.spitzeGw, p.ueberschussGw]),
    ...marktPeaks,
    refPeakGw,
  ];
  const yMaxRaw = Math.max(...allPeaks);
  const yMaxGw = Math.ceil(yMaxRaw / 5) * 5;
  const yMinGw = 40;
  const yTicksGw =
    yMaxGw <= 100
      ? [40, 50, 60, 70, 80, 90, 100].filter((t) => t >= yMinGw && t <= yMaxGw)
      : [40, 60, 80, 100, 120].filter((t) => t <= yMaxGw);

  const dur = loadDurationSensitivity();
  const duration: MonatV1DurationPoint[] = GRAPH_FACTORS.map((factor) => ({
    factor,
    h176: dur[String(factor)]["1.76"],
    h2: dur[String(factor)]["2"],
    h4: dur[String(factor)]["4"],
    powerGwLabel: fleetPowerGwLabel(factor, factor === 10 ? 0 : 1),
  }));

  const x5h4 = duration.find((d) => d.factor === 5)!.h4;
  const x10h176 = duration.find((d) => d.factor === 10)!.h176;
  const showMehrAlsLink = x5h4 > x10h176 + 0.05;

  const pool: MonatV1PoolRow[] = GRAPH_FACTORS.map((factor) => {
    const st = monthStatsForRun(bundle, factor, "ueberschuss");
    const share = st.surplusCaptureSharePct ?? 0;
    const label =
      share >= 99.9 ? "voll" : `${Math.round(share)} %`;
    return {
      factor,
      poolSharePct: share,
      poolLabel: label,
      reductionGw: roundGw(st.peakReductionGw, 2),
    };
  });

  const spitze10 = monthStatsForRun(bundle, 10, "spitze");
  const ueber10 = monthStatsForRun(bundle, 10, "ueberschuss");
  const spitze1 = monthStatsForRun(bundle, 1, "spitze");
  const ueber1 = monthStatsForRun(bundle, 1, "ueberschuss");
  const markt1 = monthStatsForRun(bundle, 1, "markt");

  const graphFootnote =
    "national, kein Netzengpass, Vollvoraussicht · Modell";
  const pageFootnote = `${FLEET_XK_FOOTNOTE_SHORT} Flottenbasis ${formatFleetBasisDe()}.`;

  return {
    monthKey: bundle.monthKey,
    refPeakGw,
    surplusPoolGwh,
    yMinGw,
    yMaxGw,
    yTicksGw,
    hero: {
      points: heroPoints,
      marktFromFactor3Gw: roundGw(marktX3, 2),
      insightSpitzeX10Gw: roundGw(spitze10.peakAfterGw, 1),
      kipppunktLabel: "ab ≈×3,9",
      kipppunktFactor: loadMarktKipppunktFactor(),
    },
    heroTable: {
      spitzeX1: roundGw(spitze1.peakAfterGw, 1),
      spitzeX10: roundGw(spitze10.peakAfterGw, 1),
      ueberschussX1: roundGw(ueber1.peakAfterGw, 1),
      ueberschussX10: roundGw(ueber10.peakAfterGw, 1),
      marktX1: roundGw(markt1.peakAfterGw, 1),
    },
    duration,
    showMehrAlsLink,
    pool,
    compareX10: {
      ueberschussGw: roundGw(ueber10.peakReductionGw, 2),
      spitzeGw: roundGw(spitze10.peakReductionGw, 2),
    },
    graphFootnote,
    pageFootnote,
  };
}

const FLEET_XK_FOOTNOTE_SHORT =
  "Zusatzflotte = (k−1)× Basis; ×1 = Ist ohne Zusatz. Unterzeile: k-mal Gesamtflotte.";

function formatFleetBasisDe(): string {
  const gw = (NATIONAL_BASE_FLEET.powerMw / 1000).toFixed(2).replace(".", ",");
  const gwh = (NATIONAL_BASE_FLEET.energyMwh / 1000).toFixed(2).replace(".", ",");
  const h = (NATIONAL_BASE_FLEET.energyMwh / NATIONAL_BASE_FLEET.powerMw).toFixed(2).replace(".", ",");
  return `${gw} GW / ${gwh} GWh (≈ ${h} h)`;
}

