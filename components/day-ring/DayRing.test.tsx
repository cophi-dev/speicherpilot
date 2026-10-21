import { act, render, screen } from "@testing-library/react";

import { DayRing, DayValuesTable } from "@/components/day-ring/DayRing";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";
import { ringTip, smoothDrawnSeries } from "@/lib/dayRingSmooth";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
});

function series(spikeMw: number): LiveDispatchPoint[] {
  return Array.from({ length: 96 }, (_, index) => {
    const ohneMw = index === 40 ? spikeMw : 2000;
    return { hour: index * 0.25, ohneMw, mitMw: ohneMw, chargeMw: 0, dischargeMw: 0, soc: 0.4 };
  });
}

function renderRing(points: LiveDispatchPoint[], callout = ringTip(30)) {
  return render(
    <>
      <DayRing
        points={points}
        label="Tag"
        description="Rohwerte"
        limit={20}
        mode="netz"
        callouts={[{ id: "midday", n: 1, text: callout, point: points[40] }]}
        showShift={false}
      />
      <DayValuesTable
        points={points}
        caption="Viertelstunden"
        timeLabel="Zeit"
        ohneLabel="Residuallast GW"
        mitLabel="mit Speicher GW"
        chargeLabel="Laden MW"
        dischargeLabel="Abgabe MW"
        socLabel="Ladezustand %"
      />
    </>
  );
}

describe("day ring raw numbers", () => {
  it("shows the raw spike in the tooltip, the callout and the table", () => {
    const points = series(30000);
    const rawGw = points.map((point) => point.ohneMw / 1000);
    const drawn = smoothDrawnSeries(rawGw);
    const rawTip = ringTip(rawGw[40]);
    const drawnTip = ringTip(drawn[40]);
    expect(rawTip).toBe("30.0");
    expect(drawnTip).not.toBe(rawTip);

    const { container } = renderRing(points, rawTip);
    const tip = container.querySelector(`.day-ring-tip[data-raw="${rawTip}"]`);
    expect(tip?.querySelector("title")?.textContent).toBe(rawTip);
    expect(container.querySelector(`.day-ring-tip[data-raw="${drawnTip}"]`)).toBeNull();
    expect(container.querySelector(".day-callout")?.textContent?.replace(/\s+/g, "")).toBe(`1${rawTip}`);
    expect(screen.queryByText(drawnTip)).toBeNull();
    expect(screen.getAllByRole("cell", { name: "30.000" })).toHaveLength(2);
    expect(screen.queryAllByRole("cell", { name: drawn[40].toFixed(3) })).toHaveLength(0);
    expect(container.querySelectorAll(".day-ring-area")).toHaveLength(1);
    expect(container.querySelector(".day-ring-area")?.getAttribute("d") ?? "").toMatch(/^M /);
    expect(container.querySelector(".day-limit")?.tagName.toLowerCase()).toBe("circle");
    expect(container.querySelector("foreignObject div")?.getAttribute("style") ?? "").toMatch(/conic-gradient/);
  });

  it("morphs the drawn path and leaves the tooltip on the raw value", () => {
    const frames: FrameRequestCallback[] = [];
    const previousRaf = window.requestAnimationFrame;
    const previousCancel = window.cancelAnimationFrame;
    const previousMatch = window.matchMedia;
    let now = 0;
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      }) as unknown as MediaQueryList;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    };
    window.cancelAnimationFrame = () => {};
    jest.spyOn(performance, "now").mockImplementation(() => now);

    const flat = series(2000);
    const spiked = series(30000);
    const { rerender, container } = render(
      <DayRing points={flat} label="Tag" description="Rohwerte" showSoc={false} showShift={false} showHourTicks={false} />
    );
    const start = container.querySelector(".day-ring-area")?.getAttribute("d");
    rerender(<DayRing points={spiked} label="Tag" description="Rohwerte" showSoc={false} showShift={false} showHourTicks={false} />);
    expect(container.querySelector(".day-ring-area")?.getAttribute("d")).toBe(start);
    expect(container.querySelector('.day-ring-tip[data-raw="30.0"] title')?.textContent).toBe("30.0");

    now = 250;
    act(() => {
      frames.splice(0).forEach((frame) => frame(now));
    });
    const mid = container.querySelector(".day-ring-area")?.getAttribute("d");
    expect(mid).not.toBe(start);
    expect(container.querySelector('.day-ring-tip[data-raw="30.0"] title')?.textContent).toBe("30.0");

    now = 500;
    act(() => {
      frames.splice(0).forEach((frame) => frame(now));
    });
    expect(container.querySelector(".day-ring-area")?.getAttribute("d")).not.toBe(mid);

    window.requestAnimationFrame = previousRaf;
    window.cancelAnimationFrame = previousCancel;
    window.matchMedia = previousMatch;
    jest.spyOn(performance, "now").mockRestore();
  });
});
