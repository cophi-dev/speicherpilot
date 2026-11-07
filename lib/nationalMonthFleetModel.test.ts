/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";
import {
  getFleetRun,
  nationalFleetMonthAvailable,
  replaySocFromAsymmetricStart,
  runKey,
  sliceFleetDay,
  verifyFleetRunSocPhysics,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("nationalMonthFleetModel Run9 bundle", () => {
  const bundle = loadNationalFleetMonthBundle();
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "data/national-fleet/2026-10/manifest.json"), "utf8"),
  );

  it("manifest quarter count", () => {
    expect(manifest.quarters).toBe(2980);
    expect(manifest.dstOct25Quarters).toBe(100);
  });

  it("has 12 runs", () => {
    expect(Object.keys(bundle.runs).length).toBe(12);
  });

  for (const factor of [1, 2, 5, 10] as const) {
    for (const strategy of ["ueberschuss", "spitze", "markt"] as const) {
      const key = runKey(factor, strategy);
      it(`SoC physics ${key}`, () => {
        const run = getFleetRun(bundle, factor, strategy);
        expect(run.intervalCount).toBe(2980);
        const eNom = NATIONAL_BASE_FLEET.energyMwh * factor;
        const maxRes = verifyFleetRunSocPhysics(run, 0.1 * eNom, 0.9 * eNom);
        expect(maxRes).toBeLessThan(0.001);
        const alt = replaySocFromAsymmetricStart(run, 0.25 * eNom);
        expect(alt.length).toBe(run.intervalCount + 1);
      });
    }
  }

  it("october month flag", () => {
    expect(nationalFleetMonthAvailable("2026-10")).toBe(true);
    expect(nationalFleetMonthAvailable("2026-11")).toBe(false);
  });

  it("day slice sums match daily csv order of magnitude", () => {
    const run = getFleetRun(bundle, 1, "ueberschuss");
    const slice = sliceFleetDay(run, "2026-10-29");
    expect(slice).not.toBeNull();
    expect(slice!.indices.length).toBe(96);
  });
});
