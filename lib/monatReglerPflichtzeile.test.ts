import { MONAT_REGELR_GRAPH_CAPTION, MONAT_REGELR_MODEL_FOOTNOTE } from "@/lib/monatReglerPflichtzeile";

describe("monatReglerPflichtzeile", () => {
  it("Kurzzeile unter Graphen", () => {
    expect(MONAT_REGELR_GRAPH_CAPTION).toBe("Modell \u00b7 Annahmen unten");
  });

  it("Fußnote am Seitenende ohne Euro und ohne netzdienlich", () => {
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Netzknoten");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Day-Ahead");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Stresstest");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).not.toMatch(/€|netzdienlich/i);
  });
});