import {
  dayPeakReductionGw,
  shouldShowFleetSaturationHint,
} from "@/lib/fleetDaySaturation";
import type { NationalFleetDaySlice } from "@/lib/nationalMonthFleetModel";

function slice(maxR: number, maxRp: number): NationalFleetDaySlice {
  return {
    dateKey: "2026-10-29",
    indices: [0],
    socStartMwh: 0,
    socEndMwh: 0,
    chargeMwh: 0,
    dischargeMwh: 0,
    maxRMw: maxR,
    maxRPrimeMw: maxRp,
    windSolarSurplusMwh: 0,
    positiveSurplusQuarterHours: 0,
  };
}

describe("fleetDaySaturation", () => {
  it("berechnet Tages-Spitzensenkung in GW", () => {
    expect(dayPeakReductionGw(slice(50_000, 48_000))).toBeCloseTo(2, 5);
  });

  it("zeigt Sättigung wenn ×5→×10 < 10 % von ×1→×5", () => {
    const x1 = slice(50_000, 49_000);
    const x5 = slice(50_000, 45_000);
    const x10 = slice(50_000, 44_650);
    expect(shouldShowFleetSaturationHint(x1, x5, x10)).toBe(true);
  });

  it("zeigt nichts wenn ×1→×5 kaum Senkung bringt", () => {
    const x1 = slice(50_000, 49_900);
    const x5 = slice(50_000, 49_000);
    const x10 = slice(50_000, 48_000);
    expect(shouldShowFleetSaturationHint(x1, x5, x10)).toBe(false);
  });

  it("zeigt nichts wenn ×5→×10 noch über 10 % von ×1→×5 liegt", () => {
    const x1 = slice(50_000, 49_000);
    const x5 = slice(50_000, 45_000);
    const x10 = slice(50_000, 44_000);
    expect(shouldShowFleetSaturationHint(x1, x5, x10)).toBe(false);
  });
});