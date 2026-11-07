import { formatPanelGwh } from "@/lib/homeDayGwhDisplay";

describe("formatPanelGwh", () => {
  it("shows — for null, 0,0 for exact zero, <0,05 for tiny surplus", () => {
    expect(formatPanelGwh(null)).toBe("—");
    expect(formatPanelGwh(0)).toBe("0,0");
    expect(formatPanelGwh(0.01, { surplusBand: true })).toBe("<0,05");
    expect(formatPanelGwh(0.01)).toBe("0,0");
    expect(formatPanelGwh(1.5)).toBe("1,5");
  });
});
