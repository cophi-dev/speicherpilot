import { GLOSSARY, glossaryEntry } from "@/lib/glossary";

const REQUIRED = [
  "bess",
  "peak-shaving",
  "p95",
  "soc",
  "vollzyklen",
  "eur-per-kw-year",
  "jahresdauerlinie",
  "ns",
  "ms",
  "hs",
  "g0",
  "g1",
  "l0",
  "capex",
  "opex",
  "npv",
  "day-ahead",
  "day-ahead-price",
  "regelzone",
  "gebotszone",
  "wind-auf-see",
  "abregelung",
  "deutschland-live",
  "residuallast",
  "modellschaetzung",
  "kupferplatte",
  "quartier",
  "ortsnetzstation",
  "behind-the-meter",
  "front-of-meter",
  "fpa",
  "fca",
  "grossspeicher",
  "ladezustand",
  "netzgrenze",
  "baukostenzuschuss",
  "leistungspreis",
  "n-1",
  "statisch-dynamisch",
  "negative-preise",
  "preisnehmer",
  "preisspanne",
  "intraday",
  "regelleistung",
] as const;

describe("glossary", () => {
  it("defines every jargon term in German and English", () => {
    expect(GLOSSARY.map((entry) => entry.id)).toEqual([...REQUIRED]);
    for (const id of REQUIRED) {
      const entry = glossaryEntry(id);
      expect(entry.term.de.length).toBeGreaterThan(0);
      expect(entry.term.en.length).toBeGreaterThan(0);
      expect(entry.text.de.length).toBeGreaterThan(20);
      expect(entry.text.en.length).toBeGreaterThan(20);
    }
  });
});
