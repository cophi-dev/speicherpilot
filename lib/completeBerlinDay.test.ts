import { pickLastCompleteDayKey, isCompleteBerlinDay } from "@/lib/completeBerlinDay";
import type { ResidualDay } from "@/lib/windSolarResidual";

function day(key: string, slotCount: number, lastHour = 23, lastMinute = 45): ResidualDay {
  const slots = Array.from({ length: slotCount }, (_, index) => ({
    timestampIso: `${key}T12:00:00.000Z`,
    hourBerlin: Math.floor(index / 4),
    minuteBerlin: (index % 4) * 15,
    loadMw: 40000,
    windMw: 20000,
    solarMw: 0,
  }));
  if (slots.length > 0) {
    const last = slots[slots.length - 1];
    last.hourBerlin = lastHour;
    last.minuteBerlin = lastMinute;
  }
  return { dateBerlin: key, slots };
}

describe("completeBerlinDay", () => {
  it("treats today as incomplete until 23:45", () => {
    const partial = day("2026-11-04", 8, 6, 0);
    expect(isCompleteBerlinDay(partial, "2026-11-04")).toBe(false);
    const full = day("2026-11-04", 96);
    expect(isCompleteBerlinDay(full, "2026-11-04")).toBe(true);
  });

  it("picks newest complete day", () => {
    const days = [day("2026-11-02", 96), day("2026-11-03", 96), day("2026-11-04", 12, 6, 0)];
    expect(pickLastCompleteDayKey(days, "2026-11-04")).toBe("2026-11-03");
  });
});
