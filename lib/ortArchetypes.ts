import rawArchetypes from "@/data/ort/ort-archetypes.json";

import {
  ortArchetypesFileSchema,
  type OrtArchetype,
  type OrtArchetypesFile,
  type OrtBadgeId,
  type OrtMode,
} from "@/lib/ortArchetypesSchema";

let cached: OrtArchetypesFile | null = null;

export function loadOrtArchetypes(): OrtArchetypesFile {
  if (cached) {
    return cached;
  }
  cached = ortArchetypesFileSchema.parse(rawArchetypes);
  return cached;
}

export type BadgeV2Input = {
  L0n1: number[];
  L1n1: number[];
  dtHours?: number;
};

export type BadgeV2Result = {
  id: OrtBadgeId;
  criticalHours: number;
  over100Before: number;
  over100After: number;
  hint: string | null;
};

const DT = 0.25;
const WORSEN_EPS_PP = 0.5;
const BASELINE_STRESS_PP = 90;

function isUsableSeries(values: number[]): boolean {
  return values.length > 0 && values.every((value) => Number.isFinite(value));
}

function countOver100(l0: number[], l1: number[], n: number) {
  let over100Before = 0;
  let over100After = 0;
  for (let i = 0; i < n; i += 1) {
    if (l0[i] > 100) {
      over100Before += 1;
    }
    if (l1[i] > 100) {
      over100After += 1;
    }
  }
  return { over100Before, over100After };
}

function baselineStressIndices(l0: number[], n: number): Set<number> {
  const indices = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    if (l0[i] >= BASELINE_STRESS_PP) {
      indices.add(i);
    }
  }
  return indices;
}

/** Badge v2 „netzdienlich (Modell)“ — spec §4.5 */
export function assessBadgeV2(input: BadgeV2Input): BadgeV2Result {
  const dt = input.dtHours ?? DT;
  const l0 = input.L0n1;
  const l1 = input.L1n1;

  if (!isUsableSeries(l0) || !isUsableSeries(l1)) {
    return {
      id: "neutral",
      criticalHours: 0,
      over100Before: 0,
      over100After: 0,
      hint: "Zeitreihe unvollständig — nicht bewertet",
    };
  }
  if (l0.length !== l1.length) {
    return {
      id: "neutral",
      criticalHours: 0,
      over100Before: 0,
      over100After: 0,
      hint: "Zeitreihe ungleich lang — nicht bewertet",
    };
  }

  const n = l0.length;
  const { over100Before, over100After } = countOver100(l0, l1, n);
  const baselineStress = baselineStressIndices(l0, n);

  // Schaden zuerst (alle qh): neue Überlast >100 % und Verschärfung >0,5 pp gegenüber L0.
  for (let i = 0; i < n; i += 1) {
    if (l1[i] > 100 && l1[i] > l0[i] + WORSEN_EPS_PP) {
      return {
        id: "belastend",
        criticalHours: baselineStress.size * dt,
        over100Before,
        over100After,
        hint: null,
      };
    }
  }

  if (baselineStress.size === 0) {
    return {
      id: "neutral",
      criticalHours: 0,
      over100Before,
      over100After,
      hint: "kein Engpass an diesem Tag",
    };
  }

  let relief = 0;
  for (const t of baselineStress) {
    relief += (l0[t] - l1[t]) * dt;
  }
  const maxL0 = Math.max(...l0);
  const maxL1 = Math.max(...l1);
  if (relief > 0 && maxL1 <= maxL0) {
    return {
      id: "netzdienlich",
      criticalHours: baselineStress.size * dt,
      over100Before,
      over100After,
      hint: null,
    };
  }
  return {
    id: "neutral",
    criticalHours: baselineStress.size * dt,
    over100Before,
    over100After,
    hint: null,
  };
}

export function badgeForArchetype(arch: OrtArchetype, mode: OrtMode): BadgeV2Result {
  const series = arch.series.modes[mode];
  return assessBadgeV2({ L0n1: arch.series.L0n1, L1n1: series.L1n1 });
}

export function archetypeByKey(key: "land" | "stadt"): OrtArchetype {
  const data = loadOrtArchetypes();
  return data.archetypes[key];
}
