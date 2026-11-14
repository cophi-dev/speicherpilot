import { formatNewsDate, newsForExternPage, newsForHome, parseNews } from "@/lib/newsFeed";
import news from "@/data/news.json";

const baseItem = {
  date: "2026-10-21",
  source: "BNetzA",
  url: "https://www.bundesnetzagentur.de/example",
  headline: "Meldung",
  einordnung: "Ein Satz zur Reichweite.",
};

describe("news feed", () => {
  it("ships the curated Bundesnetzagentur item with einordnung", () => {
    expect(parseNews([])).toEqual([]);
    const items = parseNews(news);
    expect(items).toHaveLength(1);
    expect(items[0].sourceShort).toBe("energate / Windindustrie in Deutschland");
    expect(items[0].einordnung).toContain("Antragsverfahren");
    expect(items[0].teaser).toContain("Missbrauchsverfahren");
  });

  it("rejects items without einordnung", () => {
    expect(parseNews([{ ...baseItem, einordnung: undefined }])).toEqual([]);
  });

  it("keeps euro-free headlines only", () => {
    expect(parseNews([{ ...baseItem, headline: "Speicher für 12 € geplant" }])).toEqual([]);
    expect(parseNews([baseItem])).toHaveLength(1);
  });

  it("limits home to three newest rows", () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      ...baseItem,
      date: `2026-10-${String(20 - index).padStart(2, "0")}`,
      headline: `Meldung ${index}`,
    }));
    expect(newsForHome(parseNews(items))).toHaveLength(3);
    expect(newsForHome(parseNews(items))[0].headline).toBe("Meldung 0");
  });

  it("filters extern list by rolling weeks", () => {
    const old = { ...baseItem, date: "2026-05-01", headline: "Alt" };
    const recent = { ...baseItem, date: "2026-11-01", headline: "Neu" };
    const list = parseNews([old, recent]);
    const windowed = newsForExternPage(list, 10, new Date("2026-11-14T12:00:00Z"));
    expect(windowed.map((item) => item.headline)).toEqual(["Neu"]);
  });

  it("formats a Berlin calendar date as 21. Okt. 2026", () => {
    expect(formatNewsDate("2026-10-21")).toBe("21. Okt. 2026");
    expect(formatNewsDate("2026-05-01")).toBe("1. Mai 2026");
    expect(formatNewsDate("not-a-date")).toBe("not-a-date");
  });
});