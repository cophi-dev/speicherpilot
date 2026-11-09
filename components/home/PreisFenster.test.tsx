import { render, screen } from "@testing-library/react";

import { PreisFenster } from "@/components/home/PreisFenster";

const points = [
  { hm: "10:30", eurPerMwh: 208.46 },
  { hm: "13:30", eurPerMwh: 208.11 },
  { hm: "13:45", eurPerMwh: 208.24 },
  { hm: "14:00", eurPerMwh: 207.18 },
  { hm: "15:00", eurPerMwh: 206.09 },
  { hm: "17:45", eurPerMwh: 321.5 },
  { hm: "18:30", eurPerMwh: 319.69 },
  { hm: "18:45", eurPerMwh: 318.15 },
  { hm: "19:30", eurPerMwh: 319.93 },
  { hm: "20:00", eurPerMwh: 320 },
  { hm: "12:00", eurPerMwh: 250 },
  { hm: "00:00", eurPerMwh: 251.92 },
];

describe("PreisFenster", () => {
  it("shows the duration gap and keeps it out of the revenue language", () => {
    render(
      <PreisFenster
        dateLabel="08.11.2026"
        points={points}
        powerGw={4.64}
        energyGwh={8.14}
        surplusGwh={0}
      />,
    );
    const figure = screen.getByTestId("preis-fenster");
    expect(figure.textContent).toMatch(/Dauer-Spanne 112,24 €\/MWh/);
    expect(figure.textContent).toMatch(/Kein Erlös/);
    expect(figure.textContent).toMatch(/lädt an diesem Tag nicht/);
    expect(figure.textContent).toMatch(/207,62/);
    expect(figure.textContent).toMatch(/319,85/);
    expect(screen.getByRole("img", { name: /Dauer-Spanne 112,24/ })).toBeInTheDocument();
    expect(screen.getByText("10:30")).toHaveAttribute("text-anchor", "start");
    expect(screen.getByText("00:00")).toHaveAttribute("text-anchor", "end");
    expect(screen.getByRole("link", { name: /Formel, Einheit, Unsicherheit/ })).toHaveAttribute(
      "href",
      "/methodik#preis-fenster",
    );
  });
});
