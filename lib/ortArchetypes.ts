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

/** Badge v2 „netzdienlich (Modell)“ — spec §4.5 */
export function assessBadgeV2(input: BadgeV2Input): BadgeV2Result {
  const dt = input.dtHours ?? DT;
  const l0 = input.L0n1;
  const l1 = input.L1n1;
  const n = Math.min(l0.length, l1.length);
  let over100Before = 0;
  let over100After = 0;
  const critical = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    if (l0[i] > 100) {
      over100Before += 1;
    }
    if (l1[i] > 100) {
      over100After += 1;
    }
    if (l0[i] >= 90) {
      critical.add(i);
    }
  }
  if (critical.size === 0) {
    return {
      id: "neutral",
      criticalHours: 0,
      over100Before,
      over100After,
      hint: "kein Engpass an diesem Tag",
    };
  }
  for (const i of critical) {
    if (l1[i] > 100 && l1[i] > l0[i] + 0.5) {
      return { id: "belastend", criticalHours: critical.size * dt, over100Before, over100After, hint: null };
    }
  }
  let relief = 0;
  let maxL0 = 0;
  let maxL1 = 0;
  for (const t of critical) {
    relief += (l0[t] - l1[t]) * dt;
    maxL0 = Math.max(maxL0, l0[t]);
    maxL1 = Math.max(maxL1, l1[t]);
  }
  if (relief > 0 && maxL1 <= maxL0) {
    return { id: "netzdienlich", criticalHours: critical.size * dt, over100Before, over100After, hint: null };
  }
  return { id: "neutral", criticalHours: critical.size * dt, over100Before, over100After, hint: null };
}

export function badgeForArchetype(arch: OrtArchetype, mode: OrtMode): BadgeV2Result {
  const series = arch.series.modes[mode];
  if (!arch.hasEngpass) {
    const l0 = arch.series.L0n1;
    const l1 = series.L1n1;
    const n = Math.min(l0.length, l1.length);
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
    return {
      id: "neutral",
      criticalHours: 0,
      over100Before,
      over100After,
      hint: "kein Engpass an diesem Tag",
    };
  }
  return assessBadgeV2({ L0n1: arch.series.L0n1, L1n1: series.L1n1 });
}

export function archetypeByKey(key: "land" | "stadt"): OrtArchetype {
  const data = loadOrtArchetypes();
  return data.archetypes[key];
}
