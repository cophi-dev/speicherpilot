import { render, screen, waitFor } from "@testing-library/react";

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

const defaultProps = {
  dateLabel: "08.11.2026",
  points,
  powerGw: 4.64,
  energyGwh: 8.14,
  surplusGwh: 0,
};

let mockClientWidth = 1152;

class MockResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this);
  }

  unobserve() {}

  disconnect() {}
}

const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return mockClientWidth;
    },
  });
  global.ResizeObserver = MockResizeObserver;
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

afterAll(() => {
  if (clientWidthDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidthDescriptor);
  }
  jest.restoreAllMocks();
});

function chartSvg() {
  return screen.getByRole("img", { name: /Kein Erlös/ });
}

describe("PreisFenster", () => {
  it("shows the duration gap as a definition list and keeps revenue out", async () => {
    mockClientWidth = 1152;
    render(<PreisFenster {...defaultProps} />);
    const figure = screen.getByTestId("preis-fenster");
    expect(figure.textContent).toMatch(/Day-Ahead DE-LU, €\/MWh/);
    expect(figure.textContent).toMatch(/112,24 €\/MWh \(Ø 5 teuerste − Ø 5 günstigste ¼ h\)/);
    expect(figure.textContent).toMatch(/lädt an diesem Tag nicht · kein Erlös/);
    expect(figure.textContent).toMatch(/Energy-Charts \/ SMARD, CC BY 4.0/);
    expect(figure.textContent).toMatch(/Mittel günstig \/ teuer: 207,62 und 319,85/);
    expect(figure.textContent).not.toMatch(/Handrechnung/);
    await waitFor(() => {
      expect(chartSvg()).toHaveAttribute("viewBox", "0 0 1152 180");
    });
    expect(screen.getByText("€/MWh")).toBeInTheDocument();
    for (const hour of ["00", "06", "12", "18", "24"]) {
      expect(screen.getByText(hour)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Methodik" })).toHaveAttribute("href", "/methodik#preis-fenster");
  });

  it("uses container width for viewBox when shell is narrower than 1152 px", async () => {
    mockClientWidth = 390;
    render(<PreisFenster {...defaultProps} />);
    await waitFor(() => {
      expect(chartSvg()).toHaveAttribute("viewBox", "0 0 390 180");
    });
  });

  it("bei 768 px kein Y-Tick 0 (Kollision mit X-00)", async () => {
    mockClientWidth = 704;
    const negPoints = [
      { hm: "00:00", eurPerMwh: -5 },
      { hm: "12:00", eurPerMwh: 40 },
      { hm: "23:45", eurPerMwh: 80 },
    ];
    render(<PreisFenster {...defaultProps} points={negPoints} compactCopy />);
    await waitFor(() => {
      const svg = chartSvg();
      const texts = Array.from(svg.querySelectorAll("text")).map((el) => el.textContent?.trim());
      expect(texts.filter((t) => t === "0")).toHaveLength(0);
      expect(texts).toContain("00");
    });
  });
});