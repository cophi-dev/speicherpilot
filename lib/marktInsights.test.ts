import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildMarktInsights, pickMarktInsightsForRoute, threeGoalsSummarySentence } from "@/lib/marktInsights";
import { buildThreeGoalsCompare } from "@/lib/nationalFleetThreeGoals";
import { loadNationalFleetBundleMeta } from "@/lib/nationalMonthFleetModel.server";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

const snapshot = JSON.parse(
  readFileSync(join(process.cwd(), "data/tag-pages/roll-snapshot.json"), "utf8"),
) as { records?: TagesKennzahlRecord[] };

describe("buildMarktInsights", () => {
  const records = (snapshot.records ?? []).slice(-31) as TagesKennzahlRecord[];

  it("fires trockenstrecke on 2026-11-08", () => {
    const all = buildMarktInsights({
      records,
      fleetPowerGw: 4.64,
      fleetEnergyGwh: 8.14,
      focusDayKey: "2026-11-08",
    });
    expect(all.some((i) => i.id === "trockenstrecke")).toBe(true);
  });

  it("fires drei_ziele with fleet bundle", () => {
    const all = buildMarktInsights({
      records,
      fleetPowerGw: 4.64,
      fleetEnergyGwh: 8.14,
      fleetBundle: loadNationalFleetBundleMeta() as never,
    });
    const drei = all.find((i) => i.id === "drei_ziele");
    expect(drei?.text).toMatch(/485/);
  });

  it("pickMarktInsightsForRoute respects order", () => {
    const all = buildMarktInsights({
      records,
      fleetPowerGw: 4.64,
      fleetEnergyGwh: 8.14,
      fleetBundle: loadNationalFleetBundleMeta() as never,
    });
    const start = pickMarktInsightsForRoute("start", all, 3);
    expect(start.length).toBeLessThanOrEqual(3);
    expect(start[0].id).toBe("trockenstrecke");
  });
});

describe("threeGoalsSummarySentence", () => {
  it("mentions three strategies", () => {
    const model = buildThreeGoalsCompare(loadNationalFleetBundleMeta() as never);
    const s = threeGoalsSummarySentence(model);
    expect(s).toMatch(/Markt/);
    expect(s).toMatch(/485/);
  });
});
