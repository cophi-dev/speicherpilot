import { DISPLAY_NBSP } from "@/lib/displayUnitFormat";
import { formatPreisSpanne } from "@/lib/preisFenster";
import { formatDeGw, formatDeGwGwhLine, formatDePercentInt } from "@/lib/displayUnitFormat";
import { formatGwAbs, formatPercentShare } from "@/lib/monatV1Format";
import {
  formatVisionBisGw,
  formatVisionDurationDe,
  formatVisionGwPlain,
  formatVisionPercentWhole,
} from "@/lib/research/visionJahrFormat";

const nbspRe = new RegExp(`${DISPLAY_NBSP}(GW|GWh|h|%|€/MWh)`);

describe("Seiten-Formatter NBSP", () => {
  const samples = [
    formatGwAbs(64.4, 1),
    formatPercentShare(42),
    formatDeGw(34.8, 1),
    formatDeGwGwhLine(4.69, 8.27),
    formatDePercentInt(79),
    formatPreisSpanne(0, 72),
    formatVisionGwPlain(34.8),
    formatVisionDurationDe("4"),
    formatVisionPercentWhole(42),
    formatVisionBisGw(59.6),
  ];

  it.each(samples.map((s, i) => [i, s] as const))("Formatter %i enthält NBSP vor Einheit", (_i, text) => {
    expect(text).toMatch(nbspRe);
  });
});