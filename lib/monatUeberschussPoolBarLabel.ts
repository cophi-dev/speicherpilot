/** Balken-%‑Label: bei 0 % links am Balkenanfang, sonst zentriert im Füllstreifen. */
export function ueberschussPoolBarLabelLayout(
  fillW: number,
  poolX: number,
): { x: number; textAnchor: "start" | "middle"; onDarkFill: boolean } {
  if (fillW <= 0) {
    return { x: poolX + 4, textAnchor: "start", onDarkFill: false };
  }
  const onDarkFill = fillW > 36;
  return { x: poolX + fillW / 2, textAnchor: "middle", onDarkFill };
}