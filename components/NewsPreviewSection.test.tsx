import { render, screen } from "@testing-library/react";

import NewsPreviewSection from "@/components/NewsPreviewSection";
import { LanguageContext } from "@/components/language-context";
import bundledNews from "@/data/news.json";

const renderWithLanguage = (language: "en" | "de" = "de", items?: unknown) =>
  render(
    <LanguageContext.Provider value={{ language, setLanguage: jest.fn() }}>
      <NewsPreviewSection items={items} />
    </LanguageContext.Provider>
  );

describe("NewsPreviewSection", () => {
  it("renders the curated file in the html, with a direct source link and a German date", () => {
    render(
      <LanguageContext.Provider value={{ language: "de", setLanguage: jest.fn() }}>
        <NewsPreviewSection />
      </LanguageContext.Provider>
    );
    const headline = screen.getByRole("link", { name: /Bundesnetzagentur: Keine Prüfgebühr für Netzanschlussanträge/i });
    expect(headline).toHaveAttribute(
      "href",
      "https://www.windindustrie-in-deutschland.de/energate/bundesnetzagentur-keine-pruefgebuehr-fuer-netzanschluesse-667e27"
    );
    expect(headline).toHaveAttribute("target", "_blank");
    expect(headline).toHaveAttribute("rel", "noopener noreferrer");
    expect(headline.getAttribute("href")).not.toContain("news.google.com");
    expect(screen.getByText("21.10.2026")).toBeInTheDocument();
    expect(screen.getByText("energate / Windindustrie in Deutschland")).toBeInTheDocument();
    expect(screen.getByText(/Mirai Power gegen TenneT/)).toBeInTheDocument();
    expect(JSON.stringify(bundledNews)).not.toContain("&nbsp;");
  });

  it("hides a teaser that repeats the title", () => {
    renderWithLanguage("de", [
      {
        date: "2026-10-21",
        source: "News Source",
        url: "https://example.com/same",
        headline: "Same line",
        teaser: "Same   line",
      },
    ]);
    expect(screen.getByRole("heading", { name: /Same line/ })).toBeInTheDocument();
    expect(screen.getAllByText("Same line", { exact: false })).toHaveLength(1);
  });

  it("hides a teaser that matches the title after the source suffix is removed", () => {
    renderWithLanguage("de", [
      {
        date: "2026-10-21",
        source: "pv magazine",
        url: "https://example.com/suffix",
        headline: "Speicher am Netz - pv magazine",
        teaser: "Speicher am Netz",
      },
    ]);
    expect(screen.getByRole("heading", { name: /Speicher am Netz - pv magazine/ })).toBeInTheDocument();
    expect(screen.queryByText("Speicher am Netz")).not.toBeInTheDocument();
    expect(document.querySelector(".news-source")?.textContent).toBe("pv magazine");
  });

  it("says so in German when the list is empty, and does not call it an error", () => {
    renderWithLanguage("de", []);
    expect(screen.getByText("Hier steht noch keine Meldung.")).toBeInTheDocument();
    expect(screen.queryByText(/nicht erreichbar|Fehler|error/i)).toBeNull();
  });
});
