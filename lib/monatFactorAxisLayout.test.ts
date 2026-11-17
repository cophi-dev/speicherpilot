import { MONAT_FACTOR_MULT_Y, monatFactorAxisY } from "@/lib/monatFactorAxisLayout";

describe("monatFactorAxisY", () => {
  it("hält mindestens 4 px zwischen Tick-Ende und ×-Label", () => {
    const plotBottom = 320;
    const { tickEnd, multLabel } = monatFactorAxisY(plotBottom);
    expect(tickEnd - plotBottom).toBe(4);
    expect(multLabel - tickEnd).toBeGreaterThanOrEqual(4);
    expect(multLabel).toBe(plotBottom + MONAT_FACTOR_MULT_Y);
  });
});