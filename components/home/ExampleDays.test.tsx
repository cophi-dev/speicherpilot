import { fireEvent, render, screen } from "@testing-library/react";

import { ExampleDays } from "@/components/home/ExampleDays";
import { LanguageContext } from "@/components/language-context";
import {
  BEISPIEL_SCALES,
  beispieltage,
  displayEuro,
  formatModelEuro,
  scaleKey,
  type BeispielScale,
} from "@/lib/beispieltage";
import { formatQuantity } from "@/lib/formatQuantity";

let query = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ replace: () => undefined }),
}));

beforeAll(() => {
  window.matchMedia = (media: string) =>
    ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

function renderDays() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => undefined }}>
      <ExampleDays />
    </LanguageContext.Provider>
  );
}

function euroNodes(section: HTMLElement): boolean {
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if ((node.textContent ?? "").includes("€")) {
      let parent = node.parentElement;
      let labelled = false;
      while (parent && section.contains(parent)) {
        if (parent.hasAttribute("data-model-estimate")) {
          labelled = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!labelled) {
        return false;
      }
    }
    node = walker.nextNode();
  }
  return true;
}

describe("ExampleDays", () => {
  it("starts on 1 May and moves with the arrow keys", () => {
    query = "";
    renderDays();
    const group = screen.getByRole("radiogroup", { name: "Tag wählen" });
    const radios = group.querySelectorAll<HTMLButtonElement>("[role='radio']");
    expect(radios).toHaveLength(4);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(radios[0]?.textContent).toContain("1. Mai 2026");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to 1 May when the URL day is unknown", () => {
    query = "beispieltag=1999-01-01";
    renderDays();
    const selected = screen.getByRole("radio", { name: /1\. Mai 2026/ });
    expect(selected).toHaveAttribute("aria-checked", "true");
  });

  it("shows the rounded model revenue for every day and scale", () => {
    query = "";
    renderDays();
    for (const day of beispieltage.days) {
      fireEvent.click(screen.getByRole("radio", { name: new RegExp(day.textDe.title) }));
      for (const scale of BEISPIEL_SCALES) {
        fireEvent.click(screen.getByRole("radio", { name: `×${scale}` }));
        const shown = formatModelEuro(displayEuro(day.revenueEur[scaleKey(scale as BeispielScale)], scale), "de");
        expect(document.querySelector(".beispieltage-euro")?.textContent).toContain(shown);
      }
    }
  });

  it("keeps every euro sign inside a model-estimate block and shows the five notes", () => {
    query = "";
    const { container } = renderDays();
    const section = container.querySelector("#beispieltage");
    expect(section).not.toBeNull();
    expect(euroNodes(section as HTMLElement)).toBe(true);
    for (const day of beispieltage.days) {
      fireEvent.click(screen.getByRole("radio", { name: new RegExp(day.textDe.title) }));
      for (const scale of BEISPIEL_SCALES) {
        fireEvent.click(screen.getByRole("radio", { name: `×${scale}` }));
        const text = section?.textContent ?? "";
        expect(text).toContain("Preisnehmer");
        expect(text).toContain("Day-Ahead");
        expect(text).toMatch(/0,35|Teilzyklus/);
        expect(text).toMatch(/Modellschätzung/);
        expect(text).toContain("85 %");
        expect(euroNodes(section as HTMLElement)).toBe(true);
      }
    }
  });

  it("does not offer sharing, a brand, or a promise", () => {
    query = "";
    const { container } = renderDays();
    const section = container.querySelector("#beispieltage");
    const text = section?.textContent ?? "";
    expect(text).not.toMatch(/Tesla|LP-Obergrenze|garantiert|Rendite/);
    expect(container.querySelector("meta[property='og:image']")).toBeNull();
    const names = [...container.querySelectorAll("a, button")].map((node) => node.textContent ?? "");
    expect(names.join(" ")).not.toMatch(/teilen|share|post/i);
    expect(text).toContain("keine Prognose");
  });

  it("puts the same quarter-hours in the table as in the chart data", () => {
    query = "";
    renderDays();
    for (const day of beispieltage.days) {
      fireEvent.click(screen.getByRole("radio", { name: new RegExp(day.textDe.title) }));
      const rows = document.querySelectorAll("#beispieltage tbody tr");
      expect(rows).toHaveLength(day.prices.length);
      expect(rows[0]?.textContent).toContain("00:00");
      const sample = formatQuantity(day.prices[0] ?? 0, "de", 2);
      expect(rows[0]?.textContent).toContain(sample);
    }
  });
});
