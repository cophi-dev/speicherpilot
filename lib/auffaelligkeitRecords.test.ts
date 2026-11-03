import raw from "@/lib/__fixtures__/total-power-de-2026-10-30.raw.json";
import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";
import { parseWindSolarDays } from "@/lib/windSolarResidual";

const FLEET_POWER_MW = 4515.54022;
const FLEET_ENERGY_MWH = 7860.01657;

function recordsFromRaw() {
  const parsed = parsePowerPayload(raw);
  if (!parsed) {
    throw new Error("fixture parse failed");
  }
  const days = residualDaysFromSlots(parsed);
  return buildTagesKennzahlRecords({
    days,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    prices: [],
    powerMw: FLEET_POWER_MW,
    energyMwh: FLEET_ENERGY_MWH,
  });
}

describe("auffaelligkeitRecords Berlin times", () => {
  it("evening peak from pipeline uses Berlin clock (25.10. in frozen power fixture)", () => {
    const records = recordsFromRaw();
    const r = records.find((d) => d.dateKey === "2026-10-25");
    expect(r?.eveningPeakAt).toMatch(/^\d{2}:\d{2}$/);
    expect(r?.eveningPeakAt).not.toEqual("16:45");
  });

  it("formats peak time from ResidualSlot Berlin fields (synthetic slot)", () => {
    const payload = {
      unix_seconds: [1_761_406_800],
      production_types: [
        { name: "load", data: [50_000] },
        { name: "solar", data: [0] },
        { name: "wind onshore", data: [10_000] },
      ],
    };
    const days = parseWindSolarDays(payload);
    expect(days.length).toBe(1);
    const records = buildTagesKennzahlRecords({
      days,
      slots: [],
      offshorePresent: true,
      prices: [],
      powerMw: 4000,
      energyMwh: 8000,
    });
    expect(records[0]?.eveningPeakAt).toMatch(/^\d{2}:\d{2}$/);
  });
});
