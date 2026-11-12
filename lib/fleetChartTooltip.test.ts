import { fleetTooltipRows, fleetTooltipTime } from "@/lib/fleetChartTooltip";
import type { FleetChartPoint } from "@/lib/nationalFleetCharts";

const point: FleetChartPoint = {
  i: 12,
  ts: "2026-10-25T14:15:00",
  label: "14:15",
  rGw: 54.2952,
  rpGw: 51.6823,
  cMw: 1200.4,
  dMw: 0,
  socGwh: 4.125,
};

describe("fleetChartTooltip", () => {
  it("rundet nicht genauer als die Achse (2 Dezimalstellen) und liest aus den Daten", () => {
    const rows = fleetTooltipRows(point);
    expect(rows.map((r) => r.label)).toEqual(["Restlast", "mit Speicher", "Laden", "Entladen", "SoC"]);
    expect(rows[0]?.value).toBe("54,30 GW");
    expect(rows[1]?.value).toBe("51,68 GW");
    expect(rows[2]?.value).toBe("1,20 GW");
    expect(rows[3]?.value).toBe("0,00 GW");
    expect(rows[4]?.value).toBe("4,13 GWh");
  });

  it("hängt die ×1-Vergleichskurve an, wenn vorhanden", () => {
    const rows = fleetTooltipRows(point, 53.012);
    expect(rows[2]?.label).toBe("×1 Vergleich");
    expect(rows[2]?.value).toBe("53,01 GW");
  });

  it("nimmt die Uhrzeit aus dem Zeitstempel", () => {
    expect(fleetTooltipTime(point)).toBe("14:15");
  });
});
