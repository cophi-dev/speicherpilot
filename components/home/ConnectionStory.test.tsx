import { fireEvent, render, screen } from "@testing-library/react";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { LanguageContext } from "@/components/language-context";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const previousObservers = {
  intersection: global.IntersectionObserver,
  resize: global.ResizeObserver,
  matchMedia: window.matchMedia,
};

beforeAll(() => {
  global.IntersectionObserver = ObserverStub as unknown as typeof IntersectionObserver;
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
});

afterAll(() => {
  global.IntersectionObserver = previousObservers.intersection;
  global.ResizeObserver = previousObservers.resize;
  window.matchMedia = previousObservers.matchMedia;
});

function renderStory() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: jest.fn() }}>
      <ConnectionStory />
    </LanguageContext.Provider>
  );
}

describe("ConnectionStory", () => {
  it("shows the connection light on the first step and links the supermarket project", async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    renderStory();

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuetext", "Spitze 120 kW, Anschluss 90 kW: passt nicht.");
    expect(meter).toHaveTextContent("PASST NICHT");
    const segments = meter.querySelectorAll("p");
    expect(segments[2]).toHaveAttribute("data-status", "over");
    expect(segments[2]).toHaveAttribute("data-active", "true");
    expect(segments[2]).toHaveStyle({ background: "#B3261E", color: "#fff" });
    expect(screen.getByText(/Anschlussauslastung gegen das Anschlusslimit/)).toBeInTheDocument();
    expect(screen.getByText("Beispieldaten")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2, name: /Was ist Peak Shaving/ })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByText("Schritt 1/3")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Eigenen Markt rechnen →" })).toHaveAttribute(
      "href",
      "/site?view=projekt&scenario=supermarkt"
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(document.querySelectorAll(".story-card-chart")).toHaveLength(3);
    expect(screen.getByText("Die Spitze passt nicht durch")).toBeInTheDocument();
    expect(screen.getByText(/lädt er mit höchstens/)).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText(/Modellschätzung/)).toBeInTheDocument();
    for (const item of items) {
      expect(item.className).not.toContain("border-l");
    }

    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(scroll).toHaveBeenCalled();
  });
});
