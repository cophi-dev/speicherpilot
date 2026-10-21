import { render, screen } from "@testing-library/react";

import { NewsList } from "@/components/sim/NewsList";
import { LanguageContext } from "@/components/language-context";

function renderNews(items?: unknown) {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: jest.fn() }}>
      <NewsList items={items} />
    </LanguageContext.Provider>
  );
}

describe("NewsList", () => {
  it("renders nothing when the curated file is empty", () => {
    const view = renderNews();
    expect(view.container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Platzhalter|Beispiel-Schlagzeile/)).toBeNull();
  });

  it("renders a real headline and keeps the list at three", () => {
    renderNews([
      { date: "2026-10-20", source: "BNetzA", url: "https://example.com/a", headline: "Neue Regel" },
      { date: "2026-10-19", source: "BNetzA", url: "https://example.com/b", headline: "Zweite Meldung" },
      { date: "2026-10-18", source: "BNetzA", url: "https://example.com/c", headline: "Dritte Meldung" },
      { date: "2026-10-17", source: "BNetzA", url: "https://example.com/d", headline: "Vierte Meldung" },
    ]);
    expect(screen.getByRole("link", { name: "Neue Regel" })).toHaveAttribute("href", "https://example.com/a");
    expect(screen.queryByRole("link", { name: "Vierte Meldung" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
