import raw from "@/lib/__fixtures__/total-power-de-2026-10-30.raw.json";
import { auffaelligkeitForDay, kopfMetric } from "@/lib/auffaelligkeit";
import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";

const FLEET_POWER_MW = 4515.54022;
const FLEET_ENERGY_MWH = 7860.01657;

describe("Auffälligkeit pipeline (Energy-Charts fixture → records)", () => {
  const parsed = parsePowerPayload(raw);
  if (!parsed) {
    throw new Error("fixture parse failed");
  }
  const days = residualDaysFromSlots(parsed);
  const records = buildTagesKennzahlRecords({
    days,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    prices: [],
    powerMw: FLEET_POWER_MW,
    energyMwh: FLEET_ENERGY_MWH,
  });

  it("has enough history to score 2026-10-29", () => {
    const idx = records.findIndex((r) => r.dateKey === "2026-10-29");
    expect(idx).toBeGreaterThanOrEqual(30);
    expect(kopfMetric(records, "2026-10-29")).not.toBeNull();
  });

  it("evening peak time is Europe/Berlin (not UTC slice)", () => {
    const day = records.find((r) => r.dateKey === "2026-10-29");
    expect(day?.eveningPeakAt).toMatch(/^\d{2}:\d{2}$/);
    expect(day?.eveningPeakAt).not.toMatch(/16:15/);
  });
});
