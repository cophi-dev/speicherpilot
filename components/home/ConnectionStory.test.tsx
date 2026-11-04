import { fireEvent, render, screen } from "@testing-library/react";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { LanguageContext } from "@/components/language-context";
import { ladeparkConnectionKw, ladeparkMaxKw } from "@/lib/ladepark";

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
  it("shows the connection light and links the ladepark project", async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    renderStory();

    const meter = screen.getByRole("meter");
    expect(meter).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Eigenen Markt rechnen →" })).toHaveAttribute(
      "href",
      "/ort?sicht=projekt&scenario=ladepark"
    );
    expect(screen.getByText("Schritt 1/3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(scroll).toHaveBeenCalled();
    expect(ladeparkMaxKw(4)).toBe(800);
    expect(ladeparkConnectionKw(4)).toBe(600);
  });
});
