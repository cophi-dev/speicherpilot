import { assessBadgeV2, type BadgeV2Input, type BadgeV2Result } from "@/lib/ortArchetypes";

export type BadgeV2Audit = BadgeV2Result & {
  ruleId: "ort-badge-v2";
  ruleSummary: string;
  criticalQuarterHours: number[];
  worseningEvidence: Array<{ qh: number; l0: number; l1: number; delta: number }>;
  /** Σ(L0−L1)·dt über qh mit L0≥90 — Einheit Prozentpunkt·Stunden (pp·h), nicht MWh. */
  reliefPpHours: number;
  maxL0All: number;
  maxL1All: number;
};

const DT = 0.25;
const WORSEN_EPS = 0.5;

/**
 * Recomputes badge v2 and returns interval evidence (not using stored JSON badge as input).
 */
export function auditBadgeV2(input: BadgeV2Input): BadgeV2Audit {
  const base = assessBadgeV2(input);
  const dt = input.dtHours ?? DT;
  const l0 = input.L0n1;
  const l1 = input.L1n1;
  const n = Math.min(l0.length, l1.length);
  const baselineStress = new Set<number>();
  const worsening: BadgeV2Audit["worseningEvidence"] = [];

  for (let i = 0; i < n; i += 1) {
    if (l0[i] >= 90) {
      baselineStress.add(i);
    }
    if (l1[i] > 100 && l1[i] > l0[i] + WORSEN_EPS) {
      worsening.push({ qh: i, l0: l0[i], l1: l1[i], delta: l1[i] - l0[i] });
    }
  }

  let relief = 0;
  for (const t of baselineStress) {
    relief += (l0[t] - l1[t]) * dt;
  }
  const maxL0All = n > 0 ? Math.max(...l0.slice(0, n)) : 0;
  const maxL1All = n > 0 ? Math.max(...l1.slice(0, n)) : 0;

  return {
    ...base,
    ruleId: "ort-badge-v2",
    ruleSummary:
      "Schaden global: L1 > 100 % und L1 > L0+0,5 pp (alle qh). Entlastungsintegral nur L0≥90. Netzdienlich nur wenn Relief > 0 und max(L1)≤max(L0) über alle qh. Sonst neutral.",
    criticalQuarterHours: [...baselineStress].sort((a, b) => a - b),
    worseningEvidence: worsening.slice(0, 8),
    reliefPpHours: relief,
    maxL0All,
    maxL1All,
    hint:
      base.hint ??
      (worsening.length > 0
        ? `Verschärfung ab qh ${worsening[0].qh} (+${worsening[0].delta.toFixed(1)} pp)`
        : base.id === "netzdienlich"
          ? `Entlastung ${relief.toFixed(2)} pp·h in Basis-Engpassfenster`
          : null),
  };
}
