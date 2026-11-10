import { fourHourSensitivityLine } from "@/lib/research/researchFormat";

describe("fourHourSensitivityLine", () => {
  it("×5: 4h auf ×10-Niveau ohne widersprüchliches «mehr als»", () => {
    expect(fourHourSensitivityLine(7.5, 7.46, 5)).toBe(
      "mit 4 h: −7,5 GW – so viel wie ×10 mit heutiger Speicherdauer"
    );
  });

  it("nur Basiszeile unter ×10-Niveau", () => {
    expect(fourHourSensitivityLine(6.2, 6.21, 5)).toBe("mit 4 h: −6,2 GW");
    expect(fourHourSensitivityLine(7.46, 7.46, 2)).toBe("mit 4 h: −7,5 GW");
  });
});
