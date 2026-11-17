/**
 * @jest-environment node
 */
import { buildMonatV1Model } from "@/lib/monatV1Model";
import {
  monthStatsForRun,
  NATIONAL_FLEET_FACTORS,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetBundleMeta, loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { buildMarktInsights } from "@/lib/marktInsights";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STRATEGIES: NationalFleetStrategyUi[] = ["ueberschuss", "spitze", "markt"];
const MONTHS = ["2026-10", "2026-11"] as const;

describe("Monatsflotte — keine fehlende Summary auf Kernrouten", () => {
  it.each(MONTHS)("%s: alle Faktor×Fahrweise-KPIs aus Meta oder Läufen", (monthKey) => {
    const bundle = loadNationalFleetMonthBundle(monthKey);
    for (const factor of NATIONAL_FLEET_FACTORS) {
      for (const strategy of STRATEGIES) {
        expect(() => monthStatsForRun(bundle, factor, strategy)).not.toThrow();
      }
    }
    expect(() => buildMonatV1Model(bundle)).not.toThrow();
  });

  it.each(MONTHS)("%s: Start-Insights (Meta-only) bauen ohne Fehler", (monthKey) => {
    const meta = loadNationalFleetBundleMeta(monthKey);
    const bundleStub = { ...meta, runs: {} as typeof meta & { runs?: never } };
    expect(() =>
      buildMarktInsights({
        records: [],
        fleetPowerGw: 4.64,
        fleetEnergyGwh: 8.15,
        fleetBundle: bundleStub as never,
      }),
    ).not.toThrow();
  });

  it("2026-11: Überschuss-Pool 0 GWh in Meta", () => {
    const meta = loadNationalFleetBundleMeta("2026-11");
    expect(meta.provenance?.month_surplus_pool_gwh).toBe(0);
  });
});

describe("Monat-Seiten smoke (Quelltext)", () => {
  it("Kompromiss-Teaser nur für Oktober verdrahtet", () => {
    const src = readFileSync(join(process.cwd(), "app/monat/[monat]/page.tsx"), "utf8");
    expect(src).toMatch(/monat === "2026-10".*loadEps70Teaser/);
  });
});