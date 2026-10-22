import { parseNews } from "@/lib/newsFeed";
import news from "@/data/news.json";

describe("news feed", () => {
  it("ships the curated Bundesnetzagentur item, and an empty list stays empty", () => {
    expect(parseNews([])).toEqual([]);
    expect(parseNews(news)).toEqual([
      {
        date: "2026-10-21",
        source: "energate / Windindustrie in Deutschland",
        url: "https://www.windindustrie-in-deutschland.de/energate/bundesnetzagentur-keine-pruefgebuehr-fuer-netzanschluesse-667e27",
        headline: "Bundesnetzagentur: Keine Prüfgebühr für Netzanschlussanträge",
        teaser:
          "Netzbetreiber dürfen für die Prüfung eines Anschlussantrags keine Gebühr verlangen, die später nicht auf das Projekt angerechnet wird. Anlass war ein Verfahren des Speicherentwicklers Mirai Power gegen TenneT.",
      },
    ]);
  });

  it("keeps at most three valid public items, with or without a teaser", () => {
    const item = (n: number) => ({
      date: "2026-10-21",
      source: "BNetzA",
      url: `https://www.bundesnetzagentur.de/example-${n}`,
      headline: `Meldung ${n}`,
    });
    expect(parseNews([item(1), item(2), item(3), item(4)])).toHaveLength(3);
    expect(parseNews([{ ...item(1), teaser: "Ein Satz dazu." }])[0].teaser).toBe("Ein Satz dazu.");
    expect(parseNews([{ ...item(1), url: "not a url" }])).toEqual([]);
    expect(parseNews(null)).toEqual([]);
  });
});
