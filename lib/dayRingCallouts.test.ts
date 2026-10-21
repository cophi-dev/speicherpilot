import { leaderEnd, leaderLength, placeCalloutBoxes, placeLabelBeside, rectDistanceToOrigin, ringClearRadius } from "@/lib/dayRingCallouts";
import { hourToDeg, RING_CALLOUT_VIEW } from "@/lib/dayRingScale";
import { calloutAnchors } from "@/lib/dayRingStory";
import fixture from "@/lib/fixtures/residual-2026-10-11-20.json";
import { buildLiveDispatchStory } from "@/lib/liveFleetDispatch";
import type { ResidualDay } from "@/lib/windSolarResidual";

const days = fixture as ResidualDay[];

/** Worst case at a 400 px ring column: 28% width, four wrapped lines, in callout-view units. */
const NARROW_BOX = { w: 430, h: 280 };

function boxesFor(date: string, maxGw: number) {
  const day = days.find((entry) => entry.dateBerlin === date);
  if (!day) {
    throw new Error(`missing ${date}`);
  }
  const story = buildLiveDispatchStory({
    day,
    fallback: true,
    powerMw: 4515.54022,
    energyMwh: 7860.01657,
    factor: 1,
  });
  const anchors = calloutAnchors(story.points);
  return placeCalloutBoxes(
    anchors.map((anchor) => ({
      angleDeg: hourToDeg(anchor.point.hour) + 1.8,
      ...NARROW_BOX,
    })),
    ringClearRadius(maxGw),
    RING_CALLOUT_VIEW
  );
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe("callout boxes", () => {
  it("keeps every label outside the ring and the ticks on 11 October", () => {
    const boxes = boxesFor("2026-10-11", 38.1);
    const clear = ringClearRadius(38.1);
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(rectDistanceToOrigin(box)).toBeGreaterThanOrEqual(clear);
      expect(box.x).toBeGreaterThanOrEqual(RING_CALLOUT_VIEW.x);
      expect(box.y).toBeGreaterThanOrEqual(RING_CALLOUT_VIEW.y);
      expect(box.x + box.w).toBeLessThanOrEqual(RING_CALLOUT_VIEW.x + RING_CALLOUT_VIEW.w);
      expect(box.y + box.h).toBeLessThanOrEqual(RING_CALLOUT_VIEW.y + RING_CALLOUT_VIEW.h);
    }
    expect(overlaps(boxes[0], boxes[1])).toBe(false);
    expect(overlaps(boxes[0], boxes[2])).toBe(false);
    expect(overlaps(boxes[1], boxes[2])).toBe(false);
  });

  it("caps a beside-label leader at 24 and drops a label that does not fit", () => {
    const view = { x: -400, y: -400, w: 800, h: 800 };
    const marker = { x: 0, y: -300 };
    const fitted = placeLabelBeside({ angleDeg: 0, w: 40, h: 16 }, marker, 24, 280, view, []);
    expect(fitted).not.toBeNull();
    if (!fitted) {
      return;
    }
    expect(leaderLength(marker, leaderEnd(fitted, marker))).toBeLessThanOrEqual(24.5);
    expect(rectDistanceToOrigin(fitted)).toBeGreaterThanOrEqual(280);
    const tight = { x: -330, y: -330, w: 660, h: 660 };
    expect(placeLabelBeside({ angleDeg: 0, w: 180, h: 36 }, { x: 0, y: -300 }, 24, 300, tight, [])).toBeNull();
  });

  it("still clears a hot day whose ticks sit further out", () => {
    const boxes = boxesFor("2026-10-20", 47.7);
    const clear = ringClearRadius(47.7);
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(rectDistanceToOrigin(box)).toBeGreaterThanOrEqual(clear);
    }
  });
});
