import { parseStorageFactor, shiftBerlinDateKey, storageDayCatalog } from "@/lib/storageDays";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

function day(dateBerlin: string, windMw: number, solarMw: number): ResidualDay {
  const slots: ResidualSlot[] = [
    {
      timestampIso: `${dateBerlin}T10:00:00.000Z`,
      hourBerlin: 10,
      minuteBerlin: 0,
      loadMw: 40_000,
      windMw,
      solarMw,
    },
  ];
  return { dateBerlin, slots };
}

describe("storage days", () => {
  const days = [
    day("2026-10-19", 10_000, 1_000),
    day("2026-10-20", 2_000, 20_000),
    day("2026-10-21", 4_000, 4_000),
    day("2026-09-27", 80_000, 80_000),
  ];

  it("picks yesterday and the sunniest and windiest days inside the Berlin month", () => {
    const catalog = storageDayCatalog(days, "2026-10-21");
    expect(catalog.yesterdayKey).toBe("2026-10-20");
    expect(catalog.yesterday).toBe("2026-10-20");
    expect(catalog.sunniest).toBe("2026-10-20");
    expect(catalog.windiest).toBe("2026-10-19");
    expect(catalog.sunniest).not.toBe("2026-09-27");
  });

  it("reads only the snap factors", () => {
    expect(parseStorageFactor("10")).toBe(10);
    expect(parseStorageFactor("4")).toBe(1);
    expect(parseStorageFactor(null)).toBe(1);
    expect(shiftBerlinDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});