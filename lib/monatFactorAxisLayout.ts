/** X-Achse Flottenstufe: Ticks enden mindestens 4 px über der ×-Label-Zeile. */
export const MONAT_FACTOR_TICK_BELOW_PLOT = 4;
export const MONAT_FACTOR_MULT_Y = 20;
export const MONAT_FACTOR_GW_Y = 38;

export function monatFactorAxisY(plotBottom: number): {
  tickEnd: number;
  multLabel: number;
  gwLabel: number;
} {
  const tickEnd = plotBottom + MONAT_FACTOR_TICK_BELOW_PLOT;
  const multLabel = plotBottom + MONAT_FACTOR_MULT_Y;
  const gwLabel = plotBottom + MONAT_FACTOR_GW_Y;
  return { tickEnd, multLabel, gwLabel };
}

export function monatHeroBottomPadding(minFromBase: number, scaledBase: number): number {
  return Math.max(minFromBase, scaledBase, MONAT_FACTOR_GW_Y + 18);
}