import { formatQuantity } from "@/lib/formatQuantity";
import {
  dreiZieleMethodikBullets,
  dreiZieleX2Werte,
  formatDreiZieleGegenrechnungDe,
  formatModellFlotteKurz,
} from "@/lib/methodikDreiZiele";
import { monthStatsForRun } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("Methodik ×2-Gegenrechnung aus dem Monat-Bundle", () => {
  const bundle = loadNationalFleetMonthBundle();
  const werte = dreiZieleX2Werte(bundle);
  const markt = monthStatsForRun(bundle, 2, "markt");
  const spitze = monthStatsForRun(bundle, 2, "spitze");

  it("liest dieselben ×2-Werte wie /monat (monthStatsForRun)", () => {
    expect(werte.marktChargeGwh).toBe(markt.chargeGwh);
    expect(werte.spitzeChargeGwh).toBe(spitze.chargeGwh);
    expect(werte.marktReductionGw).toBe(markt.peakReductionGw);
    expect(werte.marktChargeGwh).toBeCloseTo(494.18, 2);
    expect(werte.spitzeChargeGwh).toBeCloseTo(12.83, 2);
    expect(werte.marktReductionGw).toBeCloseTo(0.37, 2);
  });

  it("formatiert de-DE wie bisher und enthält keine alten 4,58/8-Werte", () => {
    const line = formatDreiZieleGegenrechnungDe(werte);
    expect(line).toBe(
      `Gegenrechnung, heutige Flotte + eine weitere (×2): Markt ${formatQuantity(markt.chargeGwh, "de", 2)} GWh, Spitze ${formatQuantity(spitze.chargeGwh, "de", 2)} GWh, Senkung Markt ${formatQuantity(markt.peakReductionGw, "de", 2)} GW.`,
    );
    expect(line).toContain("Markt 494,18 GWh");
    expect(line).toContain("Spitze 12,83 GWh");
    expect(line).toContain("Senkung Markt 0,37 GW");
    expect(line).not.toMatch(/485,45/);
    expect(line).not.toMatch(/12,49/);
    const bullets = dreiZieleMethodikBullets(bundle);
    expect(bullets).toContain(line);
    expect(bullets.some((b) => b.includes(`Monatslauf ${formatModellFlotteKurz("de")}`))).toBe(true);
  });
});
