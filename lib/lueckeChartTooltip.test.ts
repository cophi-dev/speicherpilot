import { formatBerlinChartTimeFromSlot } from "@/lib/formatBerlinChartTime";
import { nearestIndexFromClientX } from "@/lib/chartNearestIndex";
import { lueckeTooltipRows } from "@/lib/lueckeChartTooltip";

describe("lueckeChartTooltip", () => {
  const slot = {
    timestampIso: "2026-11-09T16:15:00.000Z",
    hourBerlin: 17,
    minuteBerlin: 15,
    loadMw: 72600,
    windMw: 3000,
    solarMw: 1200,
  };

  it("zeigt dasselbe GW wie die Daten (1 Dezimalstelle)", () => {
    const rows = lueckeTooltipRows(slot);
    expect(rows[0]?.value).toBe("72,6 GW");
    expect(rows[2]?.value).toBe("68,4 GW");
  });

  it("mappt Pointer-Position auf Slot-Index", () => {
    const rect = { left: 20, width: 310 };
    const idx = nearestIndexFromClientX(20 + 155, rect, 96);
    expect(idx).toBe(48);
    expect(formatBerlinChartTimeFromSlot(slot.hourBerlin, slot.minuteBerlin)).toBe("17:15");
    expect(lueckeTooltipRows({ ...slot })[2]?.value).toBe("68,4 GW");
  });
});
