import { parseNews } from "@/lib/newsFeed";
import news from "@/data/news.json";

describe("news feed", () => {
  it("ships an empty file and renders no headlines", () => {
    expect(parseNews(news)).toEqual([]);
    expect(parseNews([])).toEqual([]);
  });

  it("keeps at most three valid public items", () => {
    const item = (n: number) => ({
      date: "2026-10-21",
      source: "BNetzA",
      url: `https://www.bundesnetzagentur.de/example-${n}`,
      headline: `Meldung ${n}`,
    });
    expect(parseNews([item(1), item(2), item(3), item(4)])).toHaveLength(3);
    expect(parseNews([{ ...item(1), url: "not a url" }])).toEqual([]);
    expect(parseNews(null)).toEqual([]);
  });
});
