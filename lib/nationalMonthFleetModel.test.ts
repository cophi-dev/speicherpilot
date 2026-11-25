/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getFleetRun,
  monthStatsForRun,
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseTagFleetFactor,
  NATIONAL_FLEET_FACTOR_LABEL_DE,
  fleetFactorChapterTitle,
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
        const eNom = monthStatsForRun(bundle, factor, strategy).fleetEnergyGwh * 1000;
        // SoC-Band des vorberechneten Laufs (Summary e_nominal), nicht die live ungerundete Basis
        const eNomRun =
          (bundle.summary[String(factor)]?.[
            strategy === "ueberschuss"
              ? "surplus_wind_solar_over_load"
              : strategy === "spitze"
                ? "min_peak_perfect_foresight"
                : "price_oriented_da_arbitrage"
          ] as { e_nominal_mwh?: number } | undefined)?.e_nominal_mwh ?? eNom;
        const maxRes = verifyFleetRunSocPhysics(run, 0.1 * eNomRun, 0.9 * eNomRun);
        expect(maxRes).toBeLessThan(0.001);
        const alt = replaySocFromAsymmetricStart(run, eNomRun > 0 ? 0.25 * eNomRun : 0);
        expect(alt.length).toBe(run.intervalCount + 1);
      });
    }
  }

  it("october month flag", () => {
    expect(nationalFleetMonthAvailable("2026-10")).toBe(true);
    expect(nationalFleetMonthAvailable("2026-11")).toBe(true);
    expect(nationalFleetMonthAvailable("2026-12")).toBe(false);
  });

  it("day slice sums match daily csv order of magnitude", () => {
    const run = getFleetRun(bundle, 1, "ueberschuss");
    const slice = sliceFleetDay(run, "2026-10-29");
    expect(slice).not.toBeNull();
    expect(slice!.indices.length).toBe(96);
  });

  it("2026-10-29 ×1 spitze: keine Fahrt ohne Zusatzflotte", () => {
    const run = getFleetRun(bundle, 1, "spitze");
    const slice = sliceFleetDay(run, "2026-10-29")!;
    expect(slice.indices.length).toBe(96);
    expect(slice.chargeMwh).toBeLessThan(0.001);
    expect(slice.dischargeMwh).toBeLessThan(0.001);
    expect(slice.maxRMw / 1000).toBeCloseTo(64.4059, 2);
    expect(slice.maxRPrimeMw / 1000).toBeCloseTo(64.4059, 2);
  });

  it("2026-10-29 ×2 spitze: null Wind-Solar-Überschuss, dennoch Peak-Senkung", () => {
    const run = getFleetRun(bundle, 2, "spitze");
    const slice = sliceFleetDay(run, "2026-10-29")!;
    expect(slice.positiveSurplusQuarterHours).toBe(0);
    expect(slice.chargeMwh / 1000).toBeCloseTo(6.62, 2);
    expect(slice.maxRPrimeMw / 1000).toBeCloseTo(60.82, 2);
  });

  it("DST 2026-10-25 has 100 quarters", () => {
    const run = getFleetRun(bundle, 2, "spitze");
    const slice = sliceFleetDay(run, "2026-10-25");
    expect(slice).not.toBeNull();
    expect(slice!.indices.length).toBe(100);
  });

  it("month stats charge equals qh sum for x1 ueberschuss", () => {
    const run = getFleetRun(bundle, 1, "ueberschuss");
    let charge = 0;
    for (let i = 0; i < run.intervalCount; i += 1) {
      charge += run.c_mw[i] * 0.25;
    }
    const stats = monthStatsForRun(bundle, 1, "ueberschuss");
    expect(stats.chargeGwh).toBeCloseTo(charge / 1000, 2);
  });

  it("global month peak from summary matches run max r_prime", () => {
    const run = getFleetRun(bundle, 1, "spitze");
    const stats = monthStatsForRun(bundle, 1, "spitze");
    const maxRp = Math.max(...run.r_prime_mw) / 1000;
    expect(stats.peakAfterGw).toBeCloseTo(maxRp, 3);
  });
});

describe("parseTagFleetFactor", () => {
  it("öffnet die Tag-Seite ohne Parameter bei der Referenzflotte (Stufe ×2)", () => {
    expect(parseTagFleetFactor(undefined)).toBe(2);
    expect(parseTagFleetFactor("1")).toBe(1);
    expect(parseTagFleetFactor("2")).toBe(2);
    expect(parseTagFleetFactor("5")).toBe(5);
  });

  it("lässt den globalen Default für Start und Monat bei ×2", () => {
    expect(parseFleetFactor(undefined)).toBe(2);
  });

  it("beschriftet die Stufen ohne ×1 für die Referenzflotte", () => {
    expect(NATIONAL_FLEET_FACTOR_LABEL_DE[1]).toBe("heute (Ist)");
    expect(NATIONAL_FLEET_FACTOR_LABEL_DE[2]).toBe("+4,6\u00a0GW");
    expect(NATIONAL_FLEET_FACTOR_LABEL_DE[5]).toBe("+18,6\u00a0GW");
    expect(NATIONAL_FLEET_FACTOR_LABEL_DE[10]).toBe("+41,8\u00a0GW");
    expect(fleetFactorChapterTitle(2, "spitze")).toBe("+4,6\u00a0GW wie heute, Spitze senken");
    expect(fleetFactorChapterTitle(1, "spitze")).toBe("heute (Ist), Spitze senken");
  });
});
