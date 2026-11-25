/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";

import { REFERENCE_FLEET_REPO_FACTOR } from "@/lib/auffaelligkeitWoche";
import { auffaelligkeitWocheAvailable, loadAuffaelligkeitWocheTag, loadWocheFleetRunSeries } from "@/lib/auffaelligkeitWoche.server";
import { loadTagFleetRunSeries } from "@/lib/nationalMonthFleetModel.server";
import { NATIONAL_REFERENCE_FLEET_USABLE_ENERGY_GWH } from "@/lib/nationalFleetReference";
import { sliceFleetDay } from "@/lib/nationalMonthFleetModel";

describe("auffaelligkeitWoche", () => {
  it("liefert 6,52 GWh nutzbare Energie (80 % von 8,15 GWh)", () => {
    expect(NATIONAL_REFERENCE_FLEET_USABLE_ENERGY_GWH).toBeCloseTo(6.521967, 3);
  });

  it("legt die Lücken 17., 19. und 24.11 als Wochen-Dateien vor", () => {
    for (const day of ["2026-11-17", "2026-11-19", "2026-11-24"]) {
      expect(auffaelligkeitWocheAvailable(day)).toBe(true);
      expect(existsSync(`data/auffaelligkeit-woche/tage/${day}.json`)).toBe(true);
    }
  });

  it("nimmt den Spitzen-Fahrplan der Wochen-Datei, nicht den alten Tageslauf ohne Erlösziel", () => {
    const doc = loadAuffaelligkeitWocheTag("2026-11-24");
    expect(doc?.fahrweisen.spitze.erloesEur).toBeCloseTo(920502.03, 2);
    // Der alte /tag-Fahrplan ohne Erlösziel stünde bei 469 T€.
    expect(doc?.fahrweisen.spitze.erloesEur).toBeGreaterThan(800000);

    const loaded = loadTagFleetRunSeries(REFERENCE_FLEET_REPO_FACTOR, "spitze", {
      monthKey: "2026-11",
      dayKey: "2026-11-24",
    });
    expect(loaded.source).toBe("woche");
    const slice = sliceFleetDay(loaded.run, "2026-11-24");
    expect(slice).not.toBeNull();
    expect((slice!.maxRMw - slice!.maxRPrimeMw) / 1000).toBeCloseTo(3.1214, 3);
    expect(slice!.chargeMwh).toBeCloseTo(14148.1, 0);

    const wocheRun = loadWocheFleetRunSeries("2026-11-24", "spitze");
    expect(wocheRun?.c_mw).toEqual(loaded.run.c_mw);
  });

  it("fällt ohne Wochen-Datei und ohne Tagesdatei auf den Monatslauf zurück", () => {
    const loaded = loadTagFleetRunSeries(5, "spitze", { monthKey: "2026-11", dayKey: "2026-11-25" });
    expect(loaded.source).toBe("month");
  });
});
