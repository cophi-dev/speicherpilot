import raw from "@/lib/__fixtures__/total-power-de-2026-10-30.raw.json";
import { evaluateOverview } from "@/lib/overviewChain";
import { parsePowerPayload, residualDaysFromSlots, SURPLUS_DAY_GWH } from "@/lib/powerMix";
import { overviewBounds } from "@/lib/overviewRange";

const FLEET_POWER_MW = 4515.54022;
const FLEET_ENERGY_MWH = 7860.01657;
const TODAY_KEY = "2026-10-30";

const parsed = parsePowerPayload(raw);
if (!parsed) {
  throw new Error("fixture parse failed");
}
const days = residualDaysFromSlots(parsed);

function evaluateBlick(blick: "7tage" | "30tage") {
  const bounds = overviewBounds(blick, TODAY_KEY);
  return evaluateOverview({
    bounds,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    days,
    powerMw: FLEET_POWER_MW,
    energyMwh: FLEET_ENERGY_MWH,
    prices: [],
    lastSurplusDateBerlin: "2026-10-25",
    todayKey: TODAY_KEY,
  });
}

describe("overview checksum on frozen Energy-Charts data", () => {
  it("matches absorbed GWh for 7 and 30 days at reference date 2026-10-30", () => {
    const seven = evaluateBlick("7tage");
    expect(seven.factors[1].absorbedGwh).toBeCloseTo(12.576, 2);
    expect(seven.factors[2].absorbedGwh).toBeCloseTo(22.214, 2);
    expect(seven.factors[5].absorbedGwh).toBeCloseTo(41.078, 2);
    expect(seven.factors[10].absorbedGwh).toBeCloseTo(70.742, 2);

    const thirty = evaluateBlick("30tage");
    expect(thirty.factors[1].absorbedGwh).toBeCloseTo(51.03, 2);
    expect(thirty.factors[2].absorbedGwh).toBeCloseTo(84.501, 2);
    expect(thirty.factors[5].absorbedGwh).toBeCloseTo(116.05, 2);
    expect(thirty.factors[10].absorbedGwh).toBeCloseTo(145.714, 2);
  });

  it("keeps socMaxFraction plausible on day rows", () => {
    const thirty = evaluateBlick("30tage");
    const rows = thirty.factors[1].dayRows;
    for (const row of rows) {
      expect(row.socMaxFraction).toBeGreaterThanOrEqual(row.socEndFraction - 1e-6);
      expect(row.socMaxFraction).toBeLessThanOrEqual(0.9 + 1e-6);
      if (row.surplusGwh < SURPLUS_DAY_GWH) {
        expect(row.socMaxFraction).toBeCloseTo(0.1, 1);
      }
      if (row.surplusGwh >= 1) {
        expect(row.socMaxFraction).toBeGreaterThanOrEqual(0.89 - 1e-3);
      }
    }
  });
});
