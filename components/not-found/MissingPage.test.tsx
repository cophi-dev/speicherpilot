import { render, screen } from "@testing-library/react";

import { LanguageContext, type AppLanguage } from "@/components/language-context";
import { MissingPage } from "@/components/not-found/MissingPage";

function renderPage(language: AppLanguage) {
  return render(
    <LanguageContext.Provider value={{ language, setLanguage: () => {} }}>
      <MissingPage />
    </LanguageContext.Provider>
  );
}

describe("missing page", () => {
  it("shows the empty ring, the sentence, and a link home", () => {
    const { container } = renderPage("de");
    expect(screen.getByRole("heading", { name: "Diese Seite gibt es nicht. Der Ring bleibt leer." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Live ansehen" })).toHaveAttribute("href", "/live");
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    const stripped = (container.textContent ?? "").replaceAll("404", "").replaceAll("00", "").replaceAll("06", "").replaceAll("12", "").replaceAll("18", "");
    expect(stripped).not.toMatch(/\d/);
  });

  it("uses the English sentence", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "This page does not exist. The ring stays empty." })).toBeInTheDocument();
  });
});
