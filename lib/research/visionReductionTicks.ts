/** Y-Ticks für Senkungs-Achse (0 unten, yMax oben) — −15/−16 nicht überlagern. */
export function visionReductionYTicks(yMax: number): number[] {
  const ticks = [0, 5, 10, 15, yMax]
    .filter((v, i, arr) => arr.indexOf(v) === i)
  if (yMax > 15.5 && ticks.includes(15)) {
    return ticks.filter((t) => t !== 15);
  }
  return ticks;
}