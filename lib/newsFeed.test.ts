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
  it("ships the curated KW46 bundle with einordnung", () => {
    expect(parseNews([])).toEqual([]);
    const items = parseNews(news);
    expect(items).toHaveLength(6);
    expect(items[0].headline).toContain("Übertragungsnetzkosten");
    const archiv = items.find((item) => item.date === "2026-10-21");
    expect(archiv?.einordnung).toContain("Antragsverfahren");
    expect(archiv?.teaser).toContain("Missbrauchsverfahren");
  });

  it("omits the 21.10. archiv row from the home teaser", () => {
    const items = parseNews(news);
    const home = newsForHome(items);
    expect(home).toHaveLength(3);
    expect(home.some((item) => item.date === "2026-10-21")).toBe(false);
    expect(home[0].date).toBe("2026-11-12");
    expect(home[0].headline).toContain("Übertragungsnetzkosten");
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