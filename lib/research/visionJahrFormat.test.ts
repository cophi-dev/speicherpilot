import {
  formatVisionBisGw,
  formatVisionDurationDe,
  formatVisionFleetGwGwhLine,
  formatVisionGwhPlain,
  formatVisionGwPlain,
  formatVisionPoolHeaderGwh,
} from "@/lib/research/visionJahrFormat";

const NBSP = "\u00a0";

describe("visionJahrFormat", () => {
  it("NBSP zwischen Zahl und Einheit", () => {
    expect(formatVisionGwPlain(34.8)).toBe(`34,8${NBSP}GW`);
    expect(formatVisionFleetGwGwhLine(4.7, 8.27)).toBe(`4,70${NBSP}GW / 8,27${NBSP}GWh`);
    expect(formatVisionDurationDe("1,76")).toBe(`1,76${NBSP}h`);
    expect(formatVisionPoolHeaderGwh(134.2)).toBe(`Pool 134,2${NBSP}GWh`);
    expect(formatVisionGwPlain(41.1)).toBe(`41,1${NBSP}GW`);
    expect(formatVisionBisGw(158.2)).toBe(`bis 158,2${NBSP}GW`);
    expect(formatVisionGwhPlain(8.27, 2)).toBe(`8,27${NBSP}GWh`);
  });
});