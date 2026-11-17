import {
  DISPLAY_NBSP,
  formatDeDurationH,
  formatDeGw,
  formatDeGwGwhLine,
  formatDeGwh,
  formatDePercentInt,
} from "@/lib/displayUnitFormat";

describe("displayUnitFormat", () => {
  it("NBSP zwischen Zahl und Einheit", () => {
    expect(formatDeGw(34.8, 1)).toBe(`34,8${DISPLAY_NBSP}GW`);
    expect(formatDeGwGwhLine(4.69, 8.27)).toBe(`4,69${DISPLAY_NBSP}GW / 8,27${DISPLAY_NBSP}GWh`);
    expect(formatDeDurationH("1,76")).toBe(`1,76${DISPLAY_NBSP}h`);
    expect(formatDeDurationH("4")).toBe(`4${DISPLAY_NBSP}h`);
    expect(formatDePercentInt(42)).toBe(`42${DISPLAY_NBSP}%`);
    expect(formatDeGwh(134.2, 1)).toBe(`134,2${DISPLAY_NBSP}GWh`);
  });
});