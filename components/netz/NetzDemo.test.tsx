import { fireEvent, render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { NetzDemo } from "@/components/netz/NetzDemo";
import { loadNetzDemo, parseSelection, type NetzSelection } from "@/lib/netzDemo";

jest.mock("next/navigation", () => ({
  usePathname: () => "/netz",
  useRouter: () => ({ replace: jest.fn() }),
}));

const data = loadNetzDemo();

jest.setTimeout(120000);

function renderDemo(selection: NetzSelection, language: "de" | "en" = "de") {
  return render(
    <LanguageContext.Provider value={{ language, setLanguage: () => {} }}>
      <NetzDemo data={data} selection={selection} />
    </LanguageContext.Provider>
  );
}

describe("NetzDemo", () => {
  it("uses the standard choice and falls back when the query is invalid", () => {
    const standard = parseSelection(new URLSearchParams(""));
    expect(standard).toEqual({ fall: "hL", richtung: "laden", knoten: "B", pMw: 5 });
    expect(parseSelection(new URLSearchParams("fall=nope&richtung=x&knoten=Z&p=7"))).toEqual(standard);
    renderDemo(standard);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Netzwirkung im Testnetz");
    expect(screen.getByText("Szenarien rechnen im Testnetz")).toBeInTheDocument();
    expect(screen.getAllByText(/Testnetz, kein reales Netz/).length).toBeGreaterThan(0);
    expect(screen.getByText("MODELL")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toMatch(/Innerhalb der angenommenen Grenzen/);
    expect(screen.getByRole("status").textContent).toMatch(/97,7/);
    expect(screen.getByText(/Mit Speicher sind es 33/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Anschlussknoten/);
    fireEvent.click(screen.getByRole("radio", { name: "Tabelle" }));
    expect(screen.getByRole("table", { name: /Spannung der Mittelspannungsknoten/ })).toBeInTheDocument();
  });

  it("explains a missing operating point and a skipped outage check", () => {
    const stopped = renderDemo({ fall: "hL", richtung: "laden", knoten: "D", pMw: 20 });
    expect(document.querySelector('svg[viewBox="0 0 800 448"]')).not.toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/Der Lastfluss konvergiert nicht/);
    expect(screen.getByRole("status").textContent).toMatch(/kein Zahlenwert/);
    stopped.unmount();

    renderDemo({ fall: "hL", richtung: "laden", knoten: "C", pMw: 5 });
    expect(screen.getByText("(n-1) wird nicht gerechnet, weil der Normalbetrieb schon Grenzen verletzt.")).toBeInTheDocument();
  });

  it("renders the English standard state", () => {
    renderDemo(parseSelection(new URLSearchParams("")), "en");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Grid effect in a test grid");
    expect(screen.getByRole("status").textContent).toMatch(/Within the assumed limits/);
    expect(screen.getByText("MODEL")).toBeInTheDocument();
    expect(screen.getByText("stress test")).toBeInTheDocument();
  });

  it("names the four reading cases and explains new lines on the feeder", () => {
    const guide = renderDemo({ fall: "hL", richtung: "laden", knoten: "B", pMw: 5 });
    expect(screen.getByText("So liest du das Ergebnis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "(n-1)" })).toHaveAttribute("href", "/methodik#netz");
    expect(screen.getByText(/zwischen 0,965 und 1,055/)).toBeInTheDocument();
    expect(screen.getByText(/im Ausfall 0,915 bis 1,055/)).toBeInTheDocument();
    expect(screen.getByText("Belastungstest")).toBeInTheDocument();
    expect(screen.getByText(/lädt in der Spitzenlast nicht/)).toBeInTheDocument();
    expect(screen.getByText(/5 MW sind bei 20 kV etwa 144 A/)).toBeInTheDocument();
    expect(screen.getByText(/Wenn der Speicher lädt, fließt seine ganze Leistung/)).toBeInTheDocument();
    guide.unmount();

    const helpful = renderDemo({ fall: "lPV", richtung: "laden", knoten: "C", pMw: 5 });
    expect(screen.getByText("netzdienlich")).toBeInTheDocument();
    expect(screen.getByText(/Ausfälle ohne Speicher: 20, mit Speicher: 5/)).toBeInTheDocument();
    expect(screen.queryByText(/144 A/)).not.toBeInTheDocument();
    helpful.unmount();

    const limit = renderDemo({ fall: "hL", richtung: "laden", knoten: "D", pMw: 20 });
    const status = screen.getByRole("status");
    expect(screen.getByText("Grenze")).toBeInTheDocument();
    expect(screen.getByText(/der letzte lösbare Punkt steht in der Zeile darunter/)).toBeInTheDocument();
    const text = status.textContent ?? "";
    const chipAt = text.indexOf("der letzte lösbare Punkt steht in der Zeile darunter");
    const tipAt = text.indexOf("Dieser Knoten hält im Normalbetrieb");
    expect(chipAt).toBeGreaterThan(-1);
    expect(tipAt).toBeGreaterThan(chipAt);
    limit.unmount();

    const heavy = renderDemo({ fall: "lPV", richtung: "laden", knoten: "C", pMw: 10 });
    expect(screen.getByText("zu viel des Guten")).toBeInTheDocument();
    expect(screen.getByText("Zu viel Leistung kippt auch den guten Fall.")).toBeInTheDocument();
    expect(screen.queryByText(/auf dem Weg zwischen Umspannwerk und Speicher/)).not.toBeInTheDocument();
    heavy.unmount();

    const counter = renderDemo({ fall: "lPV", richtung: "entladen", knoten: "B", pMw: 5 });
    expect(screen.getByText("Gegenprobe")).toBeInTheDocument();
    expect(screen.getByText(/Wenn der Speicher einspeist, fließt seine ganze Leistung/)).toBeInTheDocument();
    expect(screen.getByText(/144 A/)).toBeInTheDocument();
    counter.unmount();

    const partial = renderDemo({ fall: "hL", richtung: "laden", knoten: "B", pMw: 2 });
    expect(screen.getByText(/auf dem Weg zwischen Umspannwerk und Speicher/)).toBeInTheDocument();
    expect(screen.queryByText(/144 A/)).not.toBeInTheDocument();
    partial.unmount();

    renderDemo({ fall: "hL", richtung: "laden", knoten: "B", pMw: 0 });
    expect(screen.queryByText("Belastungstest")).not.toBeInTheDocument();
    expect(screen.queryByText(/144 A/)).not.toBeInTheDocument();
  });

  it("renders every stored state with a status text", () => {
    const choices: NetzSelection[] = [{ fall: "hL", richtung: "laden", knoten: "A", pMw: 0 }, { fall: "lPV", richtung: "entladen", knoten: "A", pMw: 0 }];
    for (const scenario of [...data.cases.hL.scenarios, ...data.cases.lPV.scenarios]) {
      choices.push({ fall: scenario.node ? data.cases.hL.scenarios.includes(scenario) ? "hL" : "lPV" : "hL", richtung: scenario.mode, knoten: scenario.node, pMw: scenario.pMw });
    }
    expect(choices).toHaveLength(66);
    for (const choice of choices) {
      const view = renderDemo(choice);
      expect(screen.getByRole("status").textContent?.length ?? 0).toBeGreaterThan(20);
      view.unmount();
    }
  });
});
