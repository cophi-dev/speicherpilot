import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";

const Y_MIN = 40;
const Y_MAX = 75;
const PAD_TOP = 32;
const PAD_BOTTOM = 52;
const LABEL_MIN_GAP = 14;

function yPos(gw: number, height: number): number {
  const inner = height - PAD_TOP - PAD_BOTTOM;
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, gw));
  return PAD_TOP + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * inner;
}

export type G4KappeLabel = {
  key: "nepC" | "nepA";
  y: number;
  text: string;
};

/** Linksbündige Kappen-Labels mit Mindestabstand (keine Überlappung). */
export function layoutG4KappeLabels(
  kappeC: number,
  kappeA: number,
  height: number
): G4KappeLabel[] {
  let yC = yPos(kappeC, height);
  let yA = yPos(kappeA, height);
  if (Math.abs(yC - yA) < LABEL_MIN_GAP) {
    if (yC <= yA) {
      yA = yC + LABEL_MIN_GAP;
    } else {
      yC = yA + LABEL_MIN_GAP;
    }
  }
  return [
    { key: "nepC", y: yC, text: `NEP C drückt die Spitze bis ${formatVisionGwOne(kappeC)} GW` },
    { key: "nepA", y: yA, text: `NEP A ${formatVisionGwOne(kappeA)}` },
  ];
}

export function g4KappeLabelsOverlap(labels: G4KappeLabel[]): boolean {
  if (labels.length < 2) return false;
  return Math.abs(labels[0]!.y - labels[1]!.y) < LABEL_MIN_GAP;
}