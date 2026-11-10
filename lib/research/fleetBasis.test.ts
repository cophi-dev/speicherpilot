import { formatGwSenkung, formatReductionTickGw, GW_MINUS } from "@/lib/research/fleetBasis";

describe("GW_MINUS display", () => {
  it("uses Unicode minus U+2212 in Senkung and ticks", () => {
    expect(GW_MINUS).toBe("\u2212");
    expect(formatGwSenkung(7.5)).toBe("\u22127,5 GW");
    expect(formatReductionTickGw(5)).toBe("\u22125");
    expect(formatReductionTickGw(0)).toBe("0");
  });
});
