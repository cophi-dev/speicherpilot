import { fleetChartTickIndices } from "@/lib/nationalFleetCharts";
import type { FleetChartPoint } from "@/lib/nationalFleetCharts";

function monthPoint(day: string): FleetChartPoint {
  return {
    i: 0,
    ts: `2026-10-${day}T00:00`,
    label: `${day}.`,
    rGw: 60,
    rpGw: 58,
    cMw: 0,
    dMw: 0,
    socGwh: 5,
  };
}

describe("fleetChartTickIndices (month)", () => {
  it("liefert 1/8/15/22/29 und Monatsende innen", () => {
    const points: FleetChartPoint[] = [];
    for (let d = 1; d <= 31; d += 1) {
      const day = String(d).padStart(2, "0");
      points.push({ ...monthPoint(day), i: points.length });
    }
    const ticks = fleetChartTickIndices(points, "month");
    const labels = ticks.map((t) => t.label);
    expect(labels).toEqual(["1.", "8.", "15.", "22.", "29.", "31."]);
    expect(ticks[ticks.length - 1]?.align).toBe("end");
  });
});
