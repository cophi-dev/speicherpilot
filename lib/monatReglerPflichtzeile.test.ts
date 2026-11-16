import { MONAT_REGELR_GRAPH_CAPTION } from "@/lib/monatReglerPflichtzeile";

describe("monatReglerPflichtzeile", () => {
  it("enthält Pflichtbestandteile ohne Euro und ohne netzdienlich", () => {
    expect(MONAT_REGELR_GRAPH_CAPTION).toContain("national");
    expect(MONAT_REGELR_GRAPH_CAPTION).toContain("(n\u22121)");
    expect(MONAT_REGELR_GRAPH_CAPTION).not.toContain("(n\u2212\u22121)");
    expect(MONAT_REGELR_GRAPH_CAPTION).toContain("nicht Abregelung");
    expect(MONAT_REGELR_GRAPH_CAPTION).toContain("Stresstest ohne Preisrückwirkung");
    expect(MONAT_REGELR_GRAPH_CAPTION).not.toMatch(/€|netzdienlich/i);
  });
});