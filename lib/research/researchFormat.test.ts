import { fourHourSensitivityLine } from "@/lib/research/researchFormat";

describe("fourHourSensitivityLine", () => {
  it("09.11.: strikt mehr als ×10 nur wenn 4h > ×10 (gerundet)", () => {
    expect(fourHourSensitivityLine(7.5, 7.46, 5)).toContain("mehr als ×10");
  });

  it("kein «mehr als» wenn Anzeige gleich wäre", () => {
    expect(fourHourSensitivityLine(6.2, 6.21)).not.toContain("mehr als");
    expect(fourHourSensitivityLine(7.46, 7.46)).not.toContain("mehr als");
  });
});
