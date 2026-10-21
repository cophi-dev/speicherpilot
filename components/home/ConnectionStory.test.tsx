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
  it("keeps the traffic light neutral on the first step and links the supermarket project", async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    renderStory();

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuetext", "Anschluss-Ampel, noch ohne Bewertung.");
    expect(meter).not.toHaveTextContent(/Spitze/);
    for (const segment of meter.querySelectorAll("p")) {
      expect(segment.className).toContain("border");
      expect(segment.className).not.toContain("bg-destructive");
      expect(segment.className).not.toContain("bg-success");
      expect(segment.className).not.toContain("bg-warning");
    }

    expect(screen.getByText("Ein Tag am Netzanschluss")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Eigenen Markt rechnen →" })).toHaveAttribute(
      "href",
      "/site?view=projekt&scenario=supermarkt"
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
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
