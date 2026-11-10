/** battery-charts Großspeicher, Monatswert 31.10.2026 (nachrechnung v3). */
export const RESEARCH_FLEET_POWER_MW = 4_644.09022;
export const RESEARCH_FLEET_ENERGY_MWH = 8_152.4588;
export const RESEARCH_FLEET_DURATION_H = RESEARCH_FLEET_ENERGY_MWH / RESEARCH_FLEET_POWER_MW;

export const RESEARCH_FLEET_LABEL_DE = "4,64 GW / 8,15 GWh, Stand 31.10.";

export const RESEARCH_DISPATCH_RTE = 0.85;
export const RESEARCH_DISPATCH_ETA = Math.sqrt(RESEARCH_DISPATCH_RTE);
export const RESEARCH_QUARTER_H = 0.25;

export const RESEARCH_FACTORS = [2, 5, 10] as const;
export type ResearchFactor = (typeof RESEARCH_FACTORS)[number];

export const RESEARCH_DURATIONS_H = [1.7554479809395263, 2, 4] as const;
export type ResearchDurationH = (typeof RESEARCH_DURATIONS_H)[number];

export function researchDurationLabel(h: number): string {
  if (Math.abs(h - RESEARCH_FLEET_DURATION_H) < 0.02) return "1,76 h";
  if (Math.abs(h - 2) < 0.01) return "2 h";
  if (Math.abs(h - 4) < 0.01) return "4 h";
  return `${h.toFixed(2)} h`;
}

/** Zusatzflotte für ×k: (k−1) × Basis, optional andere Dauer. */
export function additionalFleetMw(factor: number, durationH = RESEARCH_FLEET_DURATION_H): {
  powerMw: number;
  energyMwh: number;
} {
  const add = Math.max(0, factor - 1);
  const powerMw = add * RESEARCH_FLEET_POWER_MW;
  const energyMwh = powerMw * durationH;
  return { powerMw, energyMwh };
}

export function formatGwSenkung(gw: number): string {
  const rounded = Math.round(gw * 10) / 10;
  const text = rounded.toFixed(1).replace(".", ",");
  return `−${text} GW`;
}
