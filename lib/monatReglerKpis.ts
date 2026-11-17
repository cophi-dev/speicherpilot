import { formatGwAbs, formatGwReduction } from "@/lib/monatV1Format";
import { reglerRunKey, type MonatReglerCompact } from "@/lib/monatReglerAsset";
import {
  monthStatsForRun,
  type NationalFleetFactor,
  type NationalFleetMonthBundle,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

export type ReglerKpiSource = Pick<NationalFleetMonthBundle, "summary" | "provenance">;

export type ReglerLiveKpis = {
  peakAfterGw: number;
  deltaGw: number;
  deltaLabel: string;
  surplusCaptureGwh: number | null;
  surplusSharePct: number | null;
  marktQhAboveRef: number | null;
  marktDaysAboveRef: number | null;
  kipppunktFactor: number;
};

function reglerStatsFromCompact(
  compact: MonatReglerCompact,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
): ReturnType<typeof monthStatsForRun> | null {
  const key = reglerRunKey(factor, strategy);
  if (!key) {
    return null;
  }
  const run = compact.runs[key];
  if (!run) {
    return null;
  }
  const baselinePeakMw = Math.max(...compact.r);
  const afterPeakMw = Math.max(...run.rp);
  const dtH = 0.25;
  let chargeMwh = 0;
  let dischargeMwh = 0;
  for (let i = 0; i < run.c.length; i += 1) {
    chargeMwh += run.c[i]! * dtH;
    dischargeMwh += run.d[i]! * dtH;
  }
  return {
    chargeGwh: chargeMwh / 1000,
    dischargeGwh: dischargeMwh / 1000,
    lossGwh: 0,
    peakAfterGw: afterPeakMw / 1000,
    peakReductionGw: (baselinePeakMw - afterPeakMw) / 1000,
    peakReductionPct:
      baselinePeakMw !== 0 ? ((baselinePeakMw - afterPeakMw) / baselinePeakMw) * 100 : 0,
    surplusCaptureGwh: strategy === "ueberschuss" ? chargeMwh / 1000 : null,
    surplusCaptureSharePct:
      strategy === "ueberschuss" && compact.surplusPoolGwh > 1e-6
        ? (chargeMwh / 1000 / compact.surplusPoolGwh) * 100
        : null,
    socStartGwh: 0,
    socEndGwh: 0,
    fleetPowerGw: 0,
    fleetEnergyGwh: 0,
  };
}

export function reglerKpisFromBundle(
  source: ReglerKpiSource,
  factor: NationalFleetFactor,
  strategy: NationalFleetStrategyUi,
  compact: MonatReglerCompact,
): ReglerLiveKpis {
  const bundle = {
    monthKey: compact.monthKey,
    bundleId: "regler-kpi",
    provenance: source.provenance,
    summary: source.summary,
    marginal: [],
    physics: {},
    runs: {} as NationalFleetMonthBundle["runs"],
  };
  const fromCompact = reglerStatsFromCompact(compact, factor, strategy);
  const st =
    fromCompact ??
    monthStatsForRun(bundle, factor, strategy);
  const peakAfter = st.peakAfterGw;
  const reductionGw = st.peakReductionGw;
  let marktQh: number | null = null;
  let marktDays: number | null = null;
  if (strategy === "markt" && factor > 1) {
    const run = compact.runs[`${factor}_markt`];
    if (run) {
      const days = new Set<string>();
      let qh = 0;
      for (let i = 0; i < run.rp.length; i += 1) {
        if (run.rp[i]! > compact.refPeakMw + 1e-3) {
          qh += 1;
          const t0 = Date.parse(compact.t0);
          const ms = t0 + compact.tm[i]! * 60_000;
          const dk = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Berlin",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(ms);
          days.add(dk);
        }
      }
      marktQh = qh;
      marktDays = days.size;
    }
  }
  const deltaLabel =
    reductionGw >= -1e-6
      ? reductionGw > 1e-6
        ? formatGwReduction(reductionGw)
        : formatGwAbs(0)
      : `+${formatGwAbs(-reductionGw).replace(/\u00a0GW/, "")}\u00a0GW`;

  return {
    peakAfterGw: peakAfter,
    deltaGw: -reductionGw,
    deltaLabel,
    surplusCaptureGwh: st.surplusCaptureGwh,
    surplusSharePct: st.surplusCaptureSharePct,
    marktQhAboveRef: marktQh,
    marktDaysAboveRef: marktDays,
    kipppunktFactor: compact.marketKipppunktFactor,
  };
}

/** Stichprobe gegen Konzeptwerte (Toleranz für Rundung). */
export const KONZEPT_SPOT_CHECKS: Array<{
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  peakAfterGw: number;
  tolGw: number;
}> = [
  { factor: 1, strategy: "spitze", peakAfterGw: 64.41, tolGw: 0.05 },
  { factor: 10, strategy: "spitze", peakAfterGw: 50.43, tolGw: 0.05 },
  { factor: 10, strategy: "markt", peakAfterGw: 92.76, tolGw: 0.05 },
  { factor: 10, strategy: "ueberschuss", peakAfterGw: 56.7, tolGw: 0.1 },
];

export function verifyKonzeptSpotChecks(
  bundle: NationalFleetMonthBundle,
  checks = KONZEPT_SPOT_CHECKS,
): void {
  for (const row of checks) {
    const st = monthStatsForRun(bundle, row.factor, row.strategy);
    if (Math.abs(st.peakAfterGw - row.peakAfterGw) > row.tolGw) {
      throw new Error(
        `Konzept-Abweichung ×${row.factor} ${row.strategy}: ${st.peakAfterGw} vs ${row.peakAfterGw}`,
      );
    }
  }
}

export function formatReglerPeakLine(peakGw: number, refGw: number): string {
  return `Monatsspitze ${formatGwAbs(peakGw)} (Referenz ${formatGwAbs(refGw)})`;
}