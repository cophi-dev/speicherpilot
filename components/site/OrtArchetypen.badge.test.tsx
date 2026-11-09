import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { OrtArchetypen } from "@/components/site/OrtArchetypen";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let query = "";

beforeAll(() => {
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
  global.MutationObserver = ObserverStub as unknown as typeof MutationObserver;
  window.matchMedia = (media: string) =>
    ({
      matches: false,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

function renderOrt(archetype: "land" | "stadt" = "stadt") {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
      <OrtArchetypen initialArchetype={archetype} />
    </LanguageContext.Provider>,
  );
}

describe("OrtArchetypen badge chrome", () => {
  it("maps nicht_bewertet preview to dashed badge without dot", () => {
    query = "badgePreview=nicht_bewertet";
    renderOrt("land");
    const badge = screen
      .getAllByText(/nicht bewertet \(Modell\)/i)
      .find((el) => el.classList.contains("ort-archetype-badge"));
    expect(badge).toBeDefined();
    if (!badge) return;
    expect(badge).toHaveClass("ort-archetype-badge--nicht-bewertet");
    expect(badge.querySelector(".ort-archetype-badge__dot")).toBeNull();
  });

  it("renders belastend accent dot as aria-hidden", () => {
    query = "";
    renderOrt("stadt");
    const badge = screen
      .getAllByText(/belastend \(Modell\)/i)
      .find((el) => el.classList.contains("ort-archetype-badge"));
    expect(badge).toBeDefined();
    if (!badge) return;
    expect(badge).toHaveClass("ort-archetype-badge--belastend");
    const dot = badge.querySelector(".ort-archetype-badge__dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});
