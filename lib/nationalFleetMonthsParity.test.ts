import { NATIONAL_FLEET_MONTH_KEYS } from "@/lib/nationalMonthFleetModel";
import { discoverNationalFleetMonthKeys, nationalFleetDataMonthAvailable } from "@/lib/nationalMonthFleetModel.server";

describe("national fleet month availability", () => {
  it("NATIONAL_FLEET_MONTH_KEYS entspricht data/national-fleet/*/manifest.json", () => {
    const discovered = discoverNationalFleetMonthKeys();
    expect(discovered).toEqual([...NATIONAL_FLEET_MONTH_KEYS]);
    for (const key of NATIONAL_FLEET_MONTH_KEYS) {
      expect(nationalFleetDataMonthAvailable(key)).toBe(true);
    }
  });

  it("lädt November-Taglauf für 2026-11-15", () => {
    const { loadNationalFleetRunSeries } = jest.requireActual<
      typeof import("@/lib/nationalMonthFleetModel.server")
    >("@/lib/nationalMonthFleetModel.server");
    const { sliceFleetDay } = jest.requireActual<typeof import("@/lib/nationalMonthFleetModel")>(
      "@/lib/nationalMonthFleetModel",
    );
    const run = loadNationalFleetRunSeries(2, "spitze", { monthKey: "2026-11", dayKey: "2026-11-15" });
    const slice = sliceFleetDay(run, "2026-11-15");
    expect(slice?.indices.length).toBeGreaterThan(80);
  });
});