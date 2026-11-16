import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import { layoutG2StressCapLabel } from "@/lib/research/visionG2CapLabel";
import type { VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

const SERIES_KEYS: VisionJahrStufeKey[] = ["x2", "x5", "NEP A", "x10", "NEP B", "NEP C"];
const G2_Y_AXIS_MAX = 100;
const X_MAX = 100;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;

function xPos(powerGw: number, width: number): number {
  return PAD_LEFT + (powerGw / X_MAX) * (width - PAD_LEFT - PAD_RIGHT);
}

function lastClippedX(model: ReturnType<typeof buildResearchVision>, width: number): number {
  const rows = SERIES_KEYS.map((key) => {
    const st = model.stages2h.find((s) => s.key === key)!;
    return { powerGw: st.powerGw, stressGw: model.marktStressTestGw[key] };
  }).sort((a, b) => a.powerGw - b.powerGw);
  const clipped = [...rows].reverse().find((r) => r.stressGw > G2_Y_AXIS_MAX);
  return clipped ? xPos(clipped.powerGw, width) : PAD_LEFT;
}

describe("G2 Kappen-Label", () => {
  it("liegt geschätzt im viewBox bei 350 px und Desktop-Breite", () => {
    const model = buildResearchVision();
    const stressMax = Math.max(...SERIES_KEYS.map((k) => model.marktStressTestGw[k]));
    for (const [width, height, padBottom] of [
      [350, 360, 68],
      [1280, 420, 56],
    ] as const) {
      const capX = lastClippedX(model, width);
      const layout = layoutG2StressCapLabel({
        width,
        height,
        padBottom,
        capMarkerX: capX,
        stressMaxGw: stressMax,
        fontSize: 12,
      });
      expect(layout.fitsViewBox).toBe(true);
      expect(layout.boxLeft).toBeGreaterThanOrEqual(PAD_LEFT - 0.5);
      expect(layout.boxRight).toBeLessThanOrEqual(width - PAD_RIGHT + 4);
    }
  });
});