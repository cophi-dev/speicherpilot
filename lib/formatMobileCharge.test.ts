import { formatMobileChargeLabel } from "@/lib/formatMobileCharge";

describe("formatMobileChargeLabel", () => {
  it("formats GWh below 1000", () => {
    expect(formatMobileChargeLabel(485.45)).toBe("485 GWh");
  });

  it("formats TWh from 1000 GWh", () => {
    expect(formatMobileChargeLabel(2422)).toBe("2,4 TWh");
    expect(formatMobileChargeLabel(4854.54)).toBe("4,9 TWh");
  });
});
