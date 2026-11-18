import { DISPLAY_NBSP, insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { findDisplayUnitSpaceViolations } from "@/lib/displayUnitNbspGuard";

const UNIT_TOKENS = [
  "%",
  "€",
  "MW",
  "MWh",
  "GW",
  "GWh",
  "kWh",
  "h",
  "Uhr",
  "Viertelstunden",
  "Tage",
] as const;

describe("displayUnitNbsp policy (B1)", () => {
  it("erlaubt kein normales Leerzeichen zwischen Zahl und Einheit nach Normalisierung", () => {
    const samples = [
      "4,64 GW / 8,15 GWh",
      "Round-Trip 85 %",
      "Σ 0,25 h",
      "um 18:30 Uhr",
      "35 040 Viertelstunden",
      "70-Prozent-Kompromiss 23 %",
      "unter 0,05 GWh",
      "15-min-Auflösung 24 h",
    ];
    for (const raw of samples) {
      const normalized = insertDisplayUnitNbsp(raw);
      expect(findDisplayUnitSpaceViolations(normalized)).toEqual([]);
    }
  });

  it.each(UNIT_TOKENS)("normalisiert Zahl vor %s", (unit) => {
    const raw = `12,3 ${unit}`;
    const normalized = insertDisplayUnitNbsp(raw);
    expect(normalized).toContain(DISPLAY_NBSP);
    expect(findDisplayUnitSpaceViolations(normalized)).toEqual([]);
  });

  it("regex erkennt typische Verstöße", () => {
    expect(findDisplayUnitSpaceViolations("3,9 GW")).toEqual([" "]);
    expect(findDisplayUnitSpaceViolations(`3,9${DISPLAY_NBSP}GW`)).toEqual([]);
  });
});