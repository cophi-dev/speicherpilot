import { render, screen } from "@testing-library/react";

import { StartKnotenTeaser, StartRoterFadenKompass } from "@/components/home/SimulatorTeasers";
import { DISPLAY_NBSP } from "@/lib/displayUnitFormat";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

describe("StartKnotenTeaser", () => {
  it("zeigt den Windknoten-Befund mit Day-Ahead-Erlös (Modell)", () => {
    render(<StartKnotenTeaser />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Doppelte Flotte am Windknoten Nord/,
      }),
    ).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 2, name: /Windknoten Nord/ });
    expect(heading.textContent).toContain(`6${DISPLAY_NBSP}Viertelstunden über der Grenze`);
    const subline = document.querySelector(".v4-ort-teaser-subline");
    expect(subline?.textContent).toContain(`0,4${DISPLAY_NBSP}% Day-Ahead-Erlös (Modell`);
    expect(screen.getByRole("link", { name: /Knoten selbst ansehen/ })).toHaveAttribute("href", "/knoten");
  });
});

describe("StartRoterFadenKompass", () => {
  it("qualifiziert den Kompromiss-Teaser mit Day-Ahead-Erlös (Modell)", () => {
    render(<StartRoterFadenKompass />);
    expect(screen.getByText(/Day-Ahead-Erlös \(Modell\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Börsenerlös/)).not.toBeInTheDocument();
  });
});

describe("StartKompromissTeaser copy", () => {
  it("nennt Day-Ahead-Erlös in der Subline", () => {
    const teaser = loadEps70Teaser();
    expect(teaser.sublineDe).toMatch(/Day-Ahead-Erlös \(Modell/);
    expect(teaser.sublineDe).not.toMatch(/Börsenerlös/);
  });
});