import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { SiteDay } from "@/components/site/SiteDay";
import { formatQuantity } from "@/lib/formatQuantity";
import { planHamburgSupermarket } from "@/lib/hamburgSupermarket";
import { referenceParkModelDay } from "@/lib/referenceParkModelDay";
import { supermarketConnectionStory } from "@/lib/siteConnectionDay";

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

const modelDay = referenceParkModelDay({
  dateBerlin: "2026-10-22",
  prices: Array.from({ length: 96 }, (_, index) => ({
    unixMs: Date.parse("2026-10-22T00:00:00+02:00") + index * 15 * 60 * 1000,
    eurPerMwh: index < 40 ? 20 : 160,
  })),
});

function renderSite() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
      <SiteDay modelDay={modelDay} />
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
    const callouts = document.querySelector(".day-callout-list")?.textContent ?? "";
    expect(callouts).toContain(`Anschluss ${formatQuantity(story.limitKw, "de", 0)} kW`);
    expect(callouts).toMatch(/kW Rückspeisung/);
    expect(callouts).not.toMatch(/GW/);
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

  it("shows Bollingstedt as a labelled model day with sourced figures and no statute", () => {
    query = "view=netz&scenario=grossspeicher";
    const { container } = renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Bollingstedt/);
    expect(screen.getAllByText("MODELLTAG").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nicht die echte Fahrweise/).length).toBeGreaterThan(0);
    expect(container.querySelector(".day-model-caption")?.textContent).toMatch(/Gestrige Day-Ahead-Preise/);
    expect(container.querySelector(".day-model-mark .day-model-note")).toBeNull();
    expect(container.querySelector(".day-model-pill")).toHaveAttribute("fill", "none");
    expect(container.querySelector(".day-ring-solid")).not.toBeNull();
    expect(container.querySelector("[fill*='url(#']")).toBeNull();
    expect(screen.getAllByRole("link", { name: /MaStR/ })[0]).toHaveAttribute("href", expect.stringContaining("marktstammdatenregister.de"));
    expect(screen.getByRole("link", { name: "echte Fahrweise beim Betreiber" })).toHaveAttribute(
      "href",
      "https://www.eco-stor.de/grid_stability_dashboard"
    );
    expect(screen.getByRole("link", { name: "Rechnung in der Methodik" })).toHaveAttribute("href", "/methodik#modelltag");
    expect(document.body.textContent).toMatch(/Bezug und Einspeisung sind dynamisch begrenzt/);
    expect(document.body.textContent).not.toMatch(/€|Euro|Tesla/);
    expect(document.body.textContent).not.toMatch(/EnWG/);
  });
});
