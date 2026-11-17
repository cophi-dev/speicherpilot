import { MONAT_REGELR_GRAPH_CAPTION, MONAT_REGELR_MODEL_FOOTNOTE } from "@/lib/monatReglerPflichtzeile";

describe("monatReglerPflichtzeile", () => {
  it("Kurzzeile unter Graphen", () => {
    expect(MONAT_REGELR_GRAPH_CAPTION).toBe("national, kein (n\u22121), nicht Abregelung");
  });

  it("Fußnote am Seitenende ohne Euro und ohne netzdienlich", () => {
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Netzknoten");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Day-Ahead");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).toContain("Stresstest");
    expect(MONAT_REGELR_MODEL_FOOTNOTE).not.toMatch(/€|netzdienlich/i);
  });
});