import { berlinDayFraction, plotXFromHour, plotXFromSlot } from "@/lib/lueckeChartGeometry";
import type { ResidualSlot } from "@/lib/windSolarResidual";

function slot(h: number, m: number): ResidualSlot {
  return {
    timestampIso: "",
    hourBerlin: h,
    minuteBerlin: m,
    loadMw: 1,
    windMw: 0,
    solarMw: 0,
  };
}

describe("lueckeChartGeometry", () => {
  const padLeft = 36;
  const plotW = 300;

  it("aligns 18:15 marker with hour grid at 18:00/24", () => {
    const s1515 = slot(18, 15);
    const xMarker = plotXFromSlot(s1515, padLeft, plotW);
    const x18 = plotXFromHour(18, padLeft, plotW);
    const x24 = plotXFromHour(24, padLeft, plotW);
    expect(berlinDayFraction(s1515)).toBeCloseTo(18.25 / 24, 6);
    expect(xMarker - x18).toBeCloseTo((0.25 / 24) * plotW, 2);
    expect(x24 - padLeft).toBe(plotW);
  });
});
