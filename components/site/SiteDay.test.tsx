import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { SiteDay } from "@/components/site/SiteDay";
import { formatQuantity } from "@/lib/formatQuantity";
import { planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { middayMeanKw, supermarketConnectionStory } from "@/lib/siteConnectionDay";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

let query = "view=netz&scenario=supermarkt";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));

function renderSite() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
      <SiteDay />
    </LanguageContext.Provider>
  );
}

describe("site v2 heroes", () => {
  it("puts connection figures on the grid view and keeps payback out of the hero", () => {
    query = "view=netz&scenario=supermarkt";
    const story = supermarketConnectionStory();
    renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Anschluss/);
    expect(screen.getAllByText(formatQuantity(story.peakBeforeKw, "de", 0)).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(formatQuantity(story.hoursOverLimit, "de", 2)))).toBeInTheDocument();
    expect(screen.queryByText(/Rückzahlung/)).toBeNull();
    expect(screen.queryByText(/Vollzyklen/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/§ 17/);
    expect(document.body.textContent).not.toMatch(/Beurteilungsspielraum/);
  });

  it("puts size, cycles and peak-day discharge on the developer view", () => {
    query = "view=projekt&scenario=supermarkt";
    const plan = planHamburgSupermarket();
    const story = supermarketConnectionStory();
    renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Abendspitze/);
    expect(screen.getByText(formatQuantity(plan.fullCycles, "de", 0), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(formatQuantity(story.dischargedKwh, "de", 1), { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/PASST NICHT/)).toBeNull();
    expect(screen.getByText(/Rückzahlung/)).toBeInTheDocument();
  });

  it("shows Flower as an empty ring with sourced figures and no statute", () => {
    query = "view=netz&scenario=grossspeicher";
    const { container } = renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Ring bleibt leer/);
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Flower" })[0]).toHaveAttribute("href", expect.stringContaining("flower.se"));
    expect(document.body.textContent).not.toMatch(/\d{2}:\d{2}/);
    expect(document.body.textContent).not.toMatch(/EnWG/);
  });

  it("names the midday callout as the 12:00–14:00 mean", () => {
    query = "view=netz&scenario=supermarkt";
    const story = supermarketConnectionStory();
    const mean = middayMeanKw(story.points);
    expect(mean).not.toBeNull();
    renderSite();
    const label = `Mittel 12–14 Uhr: ${formatQuantity(mean ?? 0, "de", 0)} kW Bezug`;
    expect(document.body.textContent).toContain(label);
    expect(document.body.textContent).not.toContain("Mittags 17 kW Bezug");
    const svg = document.querySelector(".site-flower-ring svg");
    expect(svg).toBeNull();
  });

  it("keeps the empty Flower circle inside the viewBox", () => {
    query = "view=netz&scenario=grossspeicher";
    const { container } = renderSite();
    const svg = container.querySelector(".site-flower-ring svg");
    const circle = container.querySelector(".site-flower-ring .day-empty-ring");
    expect(svg).not.toBeNull();
    expect(circle).not.toBeNull();
    const box = svg?.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) ?? [];
    const radius = Number(circle?.getAttribute("r"));
    expect(box[2]).toBeGreaterThan(0);
    expect(radius + 1).toBeLessThanOrEqual((box[2] ?? 0) / 2);
  });
});
