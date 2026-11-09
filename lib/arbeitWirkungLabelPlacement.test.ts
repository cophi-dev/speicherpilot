import { buildArbeitWirkungModel } from "@/lib/monatKonzeptA";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import {
  buildArbeitWirkungLabels,
  boxNearSegment,
  boxesOverlap,
  labelTextBox,
} from "@/lib/arbeitWirkungLabelPlacement";
import { pathSegments, pointObstacles, plotFrameBox } from "@/lib/arbeitWirkungChartGeometry";

describe("arbeitWirkungLabelPlacement", () => {
  const model = buildArbeitWirkungModel(loadNationalFleetMonthBundle());
  const viewW = 920;

  it("platziert alle Labels ohne Kollision mit Pfaden oder Punkten", () => {
    const placed = buildArbeitWirkungLabels(model, viewW, {
      residualGw: 50.96,
      chargeGw: 45.8,
      priceEurMwh: 201.29,
    });
    expect(placed.length).toBeGreaterThanOrEqual(5);
    const segments = pathSegments(model, ["spitze", "ueberschuss", "markt"], viewW);
    const points = pointObstacles(model, ["spitze", "ueberschuss", "markt"], viewW);
    const frame = plotFrameBox(viewW);

    for (const a of placed) {
      for (const b of placed) {
        if (a.id === b.id) continue;
        expect(boxesOverlap(a.box, b.box, 1)).toBe(false);
      }
      for (const seg of segments) {
        expect(boxNearSegment(a.box, seg, 2.5)).toBe(false);
      }
      for (const pt of points) {
        expect(boxesOverlap(a.box, pt, 1)).toBe(false);
      }
    }
  });

  it("schätzt Mehrzeiler-Breite für Callout", () => {
    const { w } = labelTextBox([{ text: "96,76 GW", fontSize: 26, bold: true }]);
    expect(w).toBeGreaterThan(80);
  });
});
