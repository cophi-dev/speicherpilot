import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import { G2_Y_AXIS_MAX_GW } from "@/lib/research/visionJahrG2Stress";

export const G2_LABEL_PAD_LEFT = 40;
export const G2_LABEL_PAD_RIGHT = 16;
const Y_MIN = 50;
const Y_MAX = G2_Y_AXIS_MAX_GW;
const PAD_TOP = 36;

/** Grobe Breite JetBrains-Mono (SVG user units). */
export function estimateG2LabelWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

function capLineY(height: number, padBottom: number): number {
  const inner = height - PAD_TOP - padBottom;
  return PAD_TOP + ((Y_MAX - Y_MAX) / (Y_MAX - Y_MIN)) * inner;
}

export type G2StressCapLabelLayout = {
  x: number;
  y: number;
  text: string;
  boxLeft: number;
  boxRight: number;
  boxTop: number;
  boxBottom: number;
  fitsViewBox: boolean;
};

/** Direktlabel „bis … GW“ rechts an der Kappungsstelle, text-anchor=end, in der Plotfläche. */
export function layoutG2StressCapLabel(args: {
  width: number;
  height: number;
  padBottom: number;
  capMarkerX: number;
  stressMaxGw: number;
  fontSize: number;
}): G2StressCapLabelLayout {
  const plotRight = args.width - G2_LABEL_PAD_RIGHT;
  const text = `bis ${formatVisionGwOne(args.stressMaxGw)} GW`;
  const estW = estimateG2LabelWidth(text, args.fontSize);
  let x = Math.min(args.capMarkerX, plotRight - 4);
  if (x - estW < G2_LABEL_PAD_LEFT) {
    x = G2_LABEL_PAD_LEFT + estW;
  }
  if (x > plotRight - 2) {
    x = plotRight - 2;
  }
  const capY = capLineY(args.height, args.padBottom);
  const y = capY + 16;
  const boxRight = x;
  const boxLeft = x - estW;
  const boxTop = y - args.fontSize;
  const boxBottom = y + 4;
  const fitsViewBox =
    boxLeft >= G2_LABEL_PAD_LEFT &&
    boxRight <= plotRight + 2 &&
    boxTop >= PAD_TOP - 2 &&
    boxBottom <= args.height - args.padBottom;
  return { x, y, text, boxLeft, boxRight, boxTop, boxBottom, fitsViewBox };
}