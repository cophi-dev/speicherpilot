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

jest.mock("@/components/home/ConnectionStory", () => ({
  ConnectionStory: () => null,
}));


jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/site",
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
  it.skip("legacy supermarkt hero removed from SiteDay", () => {});

  it("shows the model anchor as a labelled model day with sourced figures and no statute", () => {
    query = "view=projekt&scenario=grossspeicher";
    const { container } = renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/110-kV-Knoten|Hochspannungsnetz/);
    expect(screen.getAllByText("MODELLTAG").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nicht die echte Fahrweise/).length).toBeGreaterThan(0);
    expect(container.querySelector(".day-model-caption")?.textContent).toMatch(/Gestrige Day-Ahead-Preise/);
    expect(container.querySelector(".day-model-rule")?.textContent).toMatch(/billigsten Viertelstunden/);
    expect(screen.getByRole("link", { name: /Regel im Detail/ })).toHaveAttribute("href", "/methodik#modelltag");
    expect(container.querySelector(".day-model-rule-link a")?.textContent).toMatch(/Regel im Detail →/);
    expect(container.querySelector(".day-model-mark .day-model-note")).toBeNull();
    expect(container.querySelector(".day-model-overlay .day-model-pill")?.textContent).toBe("MODELLTAG");
    const caption = container.querySelector(".day-model-caption");
    const rule = container.querySelector(".day-model-rule");
    expect(caption?.compareDocumentPosition(rule!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".day-ring-solid")).not.toBeNull();
    expect(container.querySelector("[fill*='url(#']")).toBeNull();
    expect(screen.getAllByRole("link", { name: /MaStR|Marktstammdatenregister/i })[0]).toHaveAttribute(
      "href",
      expect.stringContaining("marktstammdatenregister.de")
    );
    expect(screen.queryByRole("link", { name: "echte Fahrweise beim Betreiber" })).toBeNull();
    expect(screen.getByRole("link", { name: "Rechnung in der Methodik" })).toHaveAttribute("href", "/methodik#modelltag");
    expect(container.querySelector(".day-ring-key-charge")?.textContent).toMatch(/Laden/);
    expect(container.querySelector(".day-ring-key-discharge")?.textContent).toMatch(/Abgeben/);
    expect(container.querySelector(".day-ring-key-soc")?.textContent).toMatch(/Ladezustand/);
    const meta = container.querySelector(".site-meta")?.textContent ?? "";
    expect(meta).toMatch(/Standort/);
    expect(meta).toMatch(/In Betrieb/);
    expect(meta).toMatch(/Betreiber/);
    expect(meta).toMatch(/Anschluss/);
    expect(container.querySelector(".site-note button")?.getAttribute("aria-label")).toMatch(/flexible Netzanschlussvereinbarung/);
    const title = screen.getByRole("heading", { level: 1 });
    const facts = container.querySelector(".site-facts");
    const ring = container.querySelector(".site-model-ring");
    expect(title.compareDocumentPosition(facts!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(facts!.compareDocumentPosition(ring!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.body.textContent).toMatch(/Bezug und Einspeisung sind dynamisch begrenzt/);
    expect(document.body.textContent).not.toMatch(/€|Euro|Tesla/);
    expect(document.body.textContent).not.toMatch(/EnWG/);
    expect(screen.getByRole("link", { name: "Projektierer" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 2, name: "Laden und Abgeben" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Beispieltage auf der Startseite ansehen" })).toHaveAttribute("href", "/#beispieltage");
  });

  it("gives the grid operator a model-anchor view without a support badge", () => {
    query = "view=netz&scenario=grossspeicher";
    const { container } = renderSite();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/110-kV-Knoten/);
    expect(screen.getByRole("heading", { level: 2, name: "Anschlussauslastung am Modelltag" })).toBeInTheDocument();
    expect(screen.getAllByText(/Laden ist Bezug aus dem Netz/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Abgeben ist Einspeisung/).length).toBeGreaterThan(0);
    expect(screen.getByText(/§ 17 Abs\. 2b EnWG/)).toBeInTheDocument();
    expect(screen.getByText(/Grenzwerte sind nicht veröffentlicht/)).toBeInTheDocument();
    expect(screen.getByText(/Der höchste Bezug und die höchste Einspeisung im Modell liegen bei der gemeldeten Leistung von 100,0 MW/)).toBeInTheDocument();
    expect(screen.queryByText("Der höchste Bezug im Modell liegt bei der gemeldeten Leistung von 100,0 MW.")).toBeNull();
    expect(screen.getByText(/Auslastung der gemeldeten Leistung/)).toBeInTheDocument();
    const storageNote = [...container.querySelectorAll(".site-note")].find((note) => note.textContent?.includes("Der Speicher steht direkt am Netz"));
    expect(storageNote?.querySelector("button")?.getAttribute("aria-label")).toMatch(/Front-of-Meter/);
    expect(screen.getAllByText("MODELLTAG").length).toBeGreaterThan(0);
    expect(container.querySelector(".day-model-caption")?.textContent).toMatch(/nicht die echte Fahrweise/);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/230/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/110 kV/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Eigentümer/)).toBeNull();
    expect(screen.queryByText(/C-Rate/)).toBeNull();
    expect(screen.queryByText(/netzdienlich v1/)).toBeNull();
    expect(container.querySelector(".site-badge")).toBeNull();
    expect(screen.getByText(/Regel v1 braucht eine bekannte Anschlussleistung/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Regel v1 in der Methodik" })).toHaveAttribute("href", "/methodik#netzdienlichkeit");
    expect(screen.getByRole("link", { name: "Netzbetreiber" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Projektierer" })).not.toHaveAttribute("aria-current");
    expect(container.querySelector(".site-note button[aria-label*='flexible Netzanschlussvereinbarung']")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/€|Euro|Tesla/);
  });
});
