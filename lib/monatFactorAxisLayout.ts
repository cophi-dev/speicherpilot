/** X-Achse Flottenstufe: Ticks enden mindestens 4 px über der ×-Label-Zeile. */
export const MONAT_FACTOR_TICK_BELOW_PLOT = 4;
export const MONAT_FACTOR_MULT_Y = 20;
export const MONAT_FACTOR_GW_Y = 38;

export function monatFactorAxisY(plotBottom: number, narrow = false): {
  tickEnd: number;
  multLabel: number;
  gwLabel: number;
} {
  const tickEnd = plotBottom + MONAT_FACTOR_TICK_BELOW_PLOT;
  const multGap = narrow ? 26 : MONAT_FACTOR_MULT_Y;
  const gwGap = narrow ? 46 : MONAT_FACTOR_GW_Y;
  const multLabel = plotBottom + multGap;
  const gwLabel = plotBottom + gwGap;
  return { tickEnd, multLabel, gwLabel };
}

export function monatHeroBottomPadding(minFromBase: number, scaledBase: number): number {
  return Math.max(minFromBase, scaledBase, MONAT_FACTOR_GW_Y + 18);
}