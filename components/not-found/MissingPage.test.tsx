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
  it("shows one sentence, an empty ring, and a link home", () => {
    const { container } = renderPage("de");
    const heading = screen.getByRole("heading", { name: "Diese Seite gibt es nicht." });
    expect(heading).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Zur Startseite" });
    expect(link).toHaveAttribute("href", "/");
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelector("text")).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });

  it("uses the English sentence without a number", () => {
    renderPage("en");
    expect(screen.getByRole("heading", { name: "This page does not exist." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "To the start page" })).toHaveAttribute("href", "/");
  });
});
