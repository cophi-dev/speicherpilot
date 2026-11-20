/** Verbotenes normales Leerzeichen zwischen Zahl und Einheit (Tests / Scans). */
export const DISPLAY_UNIT_BAD_SPACE_RE =
  /(?<=[\d\u2212][\d.,]*?) (?=(?:%|€|MW|MWh|GW|GWh|kWh|kW|MVA|h\b|Uhr|Viertelstunden|Tage)\b)/gu;

export function findDisplayUnitSpaceViolations(text: string): string[] {
  return [...text.matchAll(DISPLAY_UNIT_BAD_SPACE_RE)].map((m) => m[0]);
}