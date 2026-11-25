import karte from "@/data/bess-karte-3d/karte3d.json";
import { k4Punkte, k4Rangkorrelation } from "@/lib/bessKarte3d/k4";
import type { BundeslandKarteDatum } from "@/lib/bessKarte3d/types";

const laender = (karte as unknown as { bundeslaender: BundeslandKarteDatum[] }).bundeslaender;

describe("K4 Rangkorrelation (speicherpilot 25.11 14:42)", () => {
  it("nutzt 14 Länder (Hamburg und Berlin k. A.)", () => {
    const p = k4Punkte(laender);
    expect(p).toHaveLength(14);
    expect(p.map((x) => x.bundesland)).not.toEqual(expect.arrayContaining(["Hamburg", "Berlin"]));
  });

  it("ergibt aus ungerundeten Werten −0,02", () => {
    const r = k4Rangkorrelation(laender);
    expect(r).toBeCloseTo(-0.0198, 3);
    expect(r.toFixed(2)).toBe("-0.02");
  });

  it("kippt mit auf eine Nachkommastelle gerundeten Quoten auf −0,03 (Bindungen), daher nie runden", () => {
    expect(k4Rangkorrelation(laender, 1).toFixed(2)).toBe("-0.03");
  });
});
