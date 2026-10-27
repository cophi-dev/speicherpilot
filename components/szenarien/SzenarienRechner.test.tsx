import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { SzenarienRechner } from "@/components/szenarien/SzenarienRechner";
import { fcaTableSchema } from "@/lib/fcaTableSchema";
import tableJson from "@/data/fca/fca-table.json";

const table = fcaTableSchema.parse(tableJson);
let query = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  usePathname: () => "/szenarien",
  useRouter: () => ({ replace: jest.fn() }),
}));

function renderRechner(search = "") {
  query = search;
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => {} }}>
      <SzenarienRechner table={table} />
    </LanguageContext.Provider>
  );
}

const BANNED = [/Netzanschlussprüfung/, /Zielnetzplanung/, /\bPlanung\b/, /Prüfung des Anschlusses/, /genehmigt/, /zulässig/, /Tesla/i, /\bHNE\b/, /\bShare\b/, /\bteilen\b/, /01\.01\.2027/, /Kapazitätspreis/, /06\.11\.2026/];

describe("Szenarienrechner", () => {
  it("shows the prototype statement, percent cards and no euro in the open view", () => {
    renderRechner("p=103.5&e=238.5&g=51.75&form=fest&v=12&start=1&jahr=12m");
    expect(screen.getByText("Prototyp")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/im Modell/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toMatch(/Netzanschlussprüfung/);
    expect(screen.getByText(/keine Prüfung des Netzanschlusses/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Netzgrenze in Prozent/)).toHaveAttribute("aria-valuetext", "50 Prozent, 51,75 Megawatt");
    expect(screen.getByLabelText(/Netzgrenze in Prozent/)).toHaveAttribute("aria-valuemax", "100");
    expect(document.getElementById("szen-energy")?.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/Linie A ist durchgezogen/);
    expect(document.querySelector(".szen-line-a")).toBeTruthy();
    expect(document.querySelector(".szen-line-b")).toBeTruthy();
    expect(document.querySelector(".szen-line-c")).toBeTruthy();
    const outside = document.body.cloneNode(true) as HTMLElement;
    outside.querySelector(".szen-euro")?.remove();
    expect(outside.textContent).not.toMatch(/€/);
    expect(document.querySelector(".szen-euro")?.textContent).toMatch(/Modellschätzung/);
    expect(document.querySelector(".szen-euro")?.textContent).toMatch(/obere Modellgrenze/);
    expect(document.querySelector(".szen-euro")?.textContent).toMatch(/2,57/);
    const missing = document.querySelector(".szen-missing")?.textContent ?? "";
    for (const phrase of ["Netzseite fehlt", "Baukostenzuschuss", "Netzentgelte", "Haftung", "Preisnehmer", "Perfekte Vorschau", "Wirkungsgrad", "Verzögerung ist eine Annahme", "Kein Zeitwert"]) {
      expect(missing).toContain(phrase);
    }
    expect(screen.getByRole("link", { name: "So ist gerechnet" })).toHaveAttribute("href", "/methodik#szenarien");
    const labels = [...document.querySelectorAll("[aria-label]")].map((node) => node.getAttribute("aria-label") ?? "");
    for (const term of ["Netzgrenze", "statisch oder dynamisch", "flexible Netzanschlussvereinbarung", "(n−1)", "Baukostenzuschuss", "Leistungspreis"]) {
      expect(labels.some((label) => label.includes(term))).toBe(true);
    }
    expect(document.body.textContent).not.toMatch(/NaN/);
    for (const pattern of BANNED) {
      expect(document.body.textContent).not.toMatch(pattern);
    }
    const hero = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    expect(hero.split(/\s+/).length).toBeLessThan(28);
  });

  it("states the agreed edge cases and keeps errors on the field", () => {
    const zero = renderRechner("g=0");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mit einer Grenze von 0 MW kann der Speicher im Modell nichts handeln.");
    zero.unmount();

    const unbound = renderRechner("g=200");
    expect(screen.getAllByText(/Die Grenze liegt über der Speicherleistung/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Warten lohnt sich im Modell nie/).length).toBeGreaterThan(0);
    unbound.unmount();

    const late = renderRechner("v=36");
    expect(screen.getAllByText(/Nach 36 Monaten hat der verzögerte Anschluss im Modell noch nichts erlöst/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nicht innerhalb von 36 Monaten/).length).toBeGreaterThan(0);
    late.unmount();

    const none = renderRechner("v=0");
    expect(screen.getAllByText(/Ohne Verzögerung gibt es keine Mehrkosten durch Warten/).length).toBeGreaterThan(0);
    none.unmount();

    const broken = renderRechner("g=-1");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Bitte eine Zahl von 0 oder größer eingeben.");
    const field = document.getElementById("szen-limit");
    expect(field?.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
    broken.unmount();

    const ratio = renderRechner("e=1");
    expect(screen.getByRole("alert").textContent).toMatch(/0,5 bis 6 Stunden/);
    expect(document.getElementById("szen-assumptions")).toHaveAttribute("open");
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Die Rechnung wartet/);
    ratio.unmount();

    const urlError = renderRechner("p=abc");
    expect(document.getElementById("szen-assumptions")).toHaveAttribute("open");
    expect(document.querySelector(".szen-front-errors")?.textContent).toMatch(/Leistung und Kapazität müssen größer als 0 sein/);
    const describedBy = document.getElementById("szen-energy")?.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Die Rechnung wartet/);
    expect(document.body.textContent).not.toMatch(/NaN/);
    urlError.unmount();

    query = "g=0&form=abend";
    render(
      <LanguageContext.Provider value={{ language: "en", setLanguage: () => {} }}>
        <SzenarienRechner table={table} />
      </LanguageContext.Provider>
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/evening window/);
    expect(document.querySelector(".szen-chart-caption")?.textContent).toMatch(/Percent of one year/);
  });
});
