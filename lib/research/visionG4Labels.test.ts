import { g4KappeLabelsOverlap, layoutG4KappeLabels } from "@/lib/research/visionG4Labels";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

describe("G4 Kappen-Labels", () => {
  it("überlappen nicht bei Produktionsdaten", () => {
    const model = buildResearchVision();
    const labels = layoutG4KappeLabels(model.kappeNepCGw, model.kappeNepAGw, 320);
    expect(g4KappeLabelsOverlap(labels)).toBe(false);
    const labelsWide = layoutG4KappeLabels(model.kappeNepCGw, model.kappeNepAGw, 360);
    expect(g4KappeLabelsOverlap(labelsWide)).toBe(false);
  });
});