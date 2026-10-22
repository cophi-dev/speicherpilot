import { render, screen } from "@testing-library/react";

import { LanguageContext } from "@/components/language-context";
import { LiveRing } from "@/components/live/LiveRing";
import { fullSurplusFactor, saturationNote } from "@/lib/dayRingStory";
import fixture from "@/lib/fixtures/residual-2026-10-11-20.json";
import {
  buildLiveDispatchStory,
  LIVE_DISPATCH_FACTORS,
  type LiveDispatchFactor,
  type LiveDispatchStory,
} from "@/lib/liveFleetDispatch";
import type { ResidualDay } from "@/lib/windSolarResidual";

let query = "x=10";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ replace: () => undefined }),
}));

beforeAll(() => {
  class ObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
  window.matchMedia = (media: string) =>
    ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
});

const day = (fixture as ResidualDay[]).find((entry) => entry.dateBerlin === "2026-10-11");
if (!day) {
  throw new Error("missing 11 October");
}

const fleet = {
  powerMw: 4515.54022,
  energyMwh: 7860.01657,
  powerGw: 4.51554022,
  energyGwh: 7.86001657,
  updatedLabel: { de: "21. Oktober 2026", en: "21 October 2026" },
  source: "battery-charts" as const,
  href: "https://battery-charts.de/de/battery-charts-de/",
};

function stories(): Record<LiveDispatchFactor, LiveDispatchStory> {
  const built = {} as Record<LiveDispatchFactor, LiveDispatchStory>;
  for (const factor of LIVE_DISPATCH_FACTORS) {
    built[factor] = buildLiveDispatchStory({
      day,
      fallback: true,
      powerMw: fleet.powerMw,
      energyMwh: fleet.energyMwh,
      factor,
    });
  }
  return built;
}

function renderRing() {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: () => undefined }}>
      <LiveRing dispatch={{ fleet, day, fallback: true }} />
    </LanguageContext.Provider>
  );
}

describe("live stored-surplus note", () => {
  it("shows the sentence at ×10 from the factor where the midday surplus is fully stored", () => {
    query = "x=10";
    const saturated = fullSurplusFactor(stories());
    expect(saturated).not.toBeNull();
    expect(saturated).toBeLessThan(10);
    renderRing();
    expect(screen.getByText(saturationNote(saturated ?? 1, "de"))).toBeInTheDocument();
    expect(screen.getByText("Letzter Überschusstag")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Letzter Überschusstag:");
    expect(document.body.textContent).toContain("11.10.2026");
  });

  it("hides the sentence while surplus is still left to store", () => {
    query = "x=1";
    renderRing();
    expect(document.querySelector(".day-sat")).toBeNull();
  });
});
