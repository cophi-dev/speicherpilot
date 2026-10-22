import { render, screen, within } from "@testing-library/react";

import NewsPreviewSection from "@/components/NewsPreviewSection";
import { LanguageContext } from "@/components/language-context";
import bundledNews from "@/data/news.json";

const renderNews = (language: "en" | "de" = "de", items?: unknown, place?: "page" | "home") =>
  render(
    <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
      <NewsPreviewSection items={items} place={place} />
    </LanguageContext.Provider>
  );

const item = (n: number, extra?: Record<string, string>) => ({
  date: `2026-10-${String(n).padStart(2, "0")}`,
  source: `Quelle ${n}`,
  url: `https://example.com/meldung-${n}`,
  headline: `Meldung ${n}`,
  ...extra,
});

describe("NewsPreviewSection", () => {
  it("renders the curated file as one source link, with a German date and no euro figures", () => {
    renderNews();
    const headline = screen.getByRole("link", { name: /Bundesnetzagentur: Keine Prüfgebühr für Netzanschlussanträge/i });
    expect(headline).toHaveAttribute(
      "href",
      "https://www.windindustrie-in-deutschland.de/energate/bundesnetzagentur-keine-pruefgebuehr-fuer-netzanschluesse-667e27"
    );
    expect(headline).toHaveAttribute("target", "_blank");
    expect(headline).toHaveAttribute("rel", "noopener noreferrer");
    expect(headline.getAttribute("href")).not.toContain("news.google.com");
    expect(headline).toHaveAccessibleName(/Lesen bei energate/i);
    expect(headline).toHaveAccessibleName(/öffnet in neuem Tab/);
    expect(headline).toHaveAttribute("title", "energate / Windindustrie in Deutschland");
    expect(headline.querySelectorAll("a")).toHaveLength(0);
    expect(screen.getByText("21. Okt. 2026")).toBeInTheDocument();
    expect(document.querySelector(".news-source")).toHaveTextContent("energate");
    expect(document.querySelector(".news-source")).toHaveAttribute("title", "energate / Windindustrie in Deutschland");
    expect(document.querySelector(".news-go-keep")?.textContent).toBe("energate\u00a0↗");
    expect(document.body.textContent).not.toContain("Windindustrie");
    expect(screen.getByText(/Mirai Power gegen TenneT/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Prüfgebühr/ })).toBeInTheDocument();
    expect(document.querySelectorAll(".news-list article")).toHaveLength(1);
    expect(document.querySelector(".is-new .news-row")).toBe(headline);
    expect(screen.getByRole("link", { name: "So prüfen wir Meldungen" })).toHaveAttribute("href", "/methodik");
    expect(document.body.textContent).not.toMatch(/€|\bEUR\b|\bEuro\b/);
    expect(JSON.stringify(bundledNews)).not.toContain("&nbsp;");
  });

  it("falls back to the long source when sourceShort is missing", () => {
    renderNews("de", [item(3)]);
    expect(document.querySelector(".news-source")).toHaveTextContent("Quelle 3");
    expect(screen.getByRole("link", { name: /Lesen bei Quelle 3/ })).toHaveAttribute("title", "Quelle 3");
    expect(document.querySelector(".news-go-keep")?.textContent).toBe("3\u00a0↗");
  });

  it("hides a teaser that repeats the title", () => {
    renderNews("de", [
      {
        date: "2026-10-21",
        source: "News Source",
        url: "https://example.com/same",
        headline: "Same line",
        teaser: "Same   line",
      },
    ]);
    expect(screen.getByRole("heading", { name: "Same line" })).toBeInTheDocument();
    expect(screen.getAllByText("Same line", { exact: false })).toHaveLength(1);
    expect(document.querySelector(".news-teaser")).toBeNull();
  });

  it("hides a teaser that matches the title after the source suffix is removed", () => {
    renderNews("de", [
      {
        date: "2026-10-21",
        source: "pv magazine",
        url: "https://example.com/suffix",
        headline: "Speicher am Netz - pv magazine",
        teaser: "Speicher am Netz",
      },
    ]);
    expect(screen.getByRole("heading", { name: "Speicher am Netz - pv magazine" })).toBeInTheDocument();
    expect(screen.queryByText("Speicher am Netz")).not.toBeInTheDocument();
    expect(document.querySelector(".news-source")?.textContent).toBe("pv magazine");
  });

  it("drops a teaser that states a euro amount and skips a headline that does", () => {
    renderNews("de", [
      item(1, { teaser: "Die Gebühr beträgt 50 Euro." }),
      { ...item(2), headline: "Speicher für 12 € geplant" },
    ]);
    expect(screen.getByRole("heading", { name: "Meldung 1" })).toBeInTheDocument();
    expect(screen.queryByText(/50 Euro/)).toBeNull();
    expect(screen.queryByRole("heading", { name: /12 €/ })).toBeNull();
  });

  it("keeps at most three rows, and the newest one is the marked row", () => {
    renderNews("de", [item(21), item(18), item(9), item(2)]);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Meldung 21" }).closest("li")).toHaveClass("is-new");
    expect(screen.queryByRole("heading", { name: "Meldung 2" })).toBeNull();
    const reordered = renderNews("de", [item(2), item(18), item(21)]);
    expect(within(reordered.container).getAllByRole("heading", { level: 2 })[0]).toHaveAccessibleName("Meldung 21");
  });

  it("says so in German when the page list is empty, and links to methodik without an anchor", () => {
    renderNews("de", []);
    expect(screen.getByRole("status")).toHaveTextContent("Gerade keine neuen geprüften Meldungen.");
    expect(screen.getByRole("link", { name: "Wie wir Meldungen prüfen" })).toHaveAttribute("href", "/methodik");
    expect(screen.queryByText(/nicht erreichbar|Fehler|error/i)).toBeNull();
    expect(document.querySelector(".news-list")).toBeNull();
  });

  it("hides the home block when the list is empty", () => {
    const view = renderNews("de", [], "home");
    expect(view.container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Gerade keine|Aus dem Markt/)).toBeNull();
  });

  it("shows at most three home rows as h3, with the archive link", () => {
    renderNews("de", [item(21, { teaser: "Ein Satz zur Einordnung." }), item(18), item(9), item(2)], "home");
    expect(screen.getByRole("heading", { level: 2, name: "Aus dem Markt" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Alle News →" })).toHaveAttribute("href", "/news");
    expect(screen.getByText("Ein Satz zur Einordnung.")).toHaveClass("news-teaser");
    expect(screen.queryByRole("link", { name: /So prüfen wir Meldungen/ })).toBeNull();
    expect(document.querySelectorAll(".news-list article a")).toHaveLength(3);
  });
});
