import { knotenFazitSatz } from "@/lib/knoten/knotenFazit";
import type { KnotenDayRow } from "@/lib/knoten/knotenTypes";

const row = (over: Partial<KnotenDayRow>): KnotenDayRow => ({
  saison: "herbst",
  node: "wind",
  k: 5,
  day: "2026-10-24",
  qhBase: 0,
  qhMarkt: 18,
  qhKnoten: 0,
  mwhMarkt: 0,
  rMarkt: 1,
  rKnoten: 1,
  verlustPct: 6.7,
  pMw: 1,
  eMwh: 1,
  ...over,
});

describe("knotenFazitSatz", () => {
  it("nennt Windknoten Nord ohne Doppel-Suffix", () => {
    const s = knotenFazitSatz("wind", row({}));
    expect(s).toContain("Am Windknoten Nord");
    expect(s).not.toMatch(/Windknotenknoten/i);
  });

  it("nennt Solarknoten Süd und Stadtknoten korrekt", () => {
    expect(knotenFazitSatz("solar", row({ node: "solar", qhMarkt: 0 }))).toContain("Am Solarknoten Süd");
    expect(knotenFazitSatz("stadt", row({ node: "stadt" }))).toContain("Am Stadtknoten");
  });
});