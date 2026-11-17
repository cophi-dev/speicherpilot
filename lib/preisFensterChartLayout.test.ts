import {
  PREIS_Y_LABEL_PAD_LEFT,
  preisChartPadLeft,
  preisHourLabelPlacement,
  preisYAxisTicksVisible,
  preisYTickLabelLeftEdge,
} from "@/lib/preisFensterChartLayout";

describe("preisFensterChartLayout", () => {
  it("blendet Y-Tick 0 am Ursprung aus", () => {
    expect(preisYAxisTicksVisible([0, 200, 400])).toEqual([200, 400]);
    expect(preisYAxisTicksVisible([-50, 0, 50])).toEqual([-50, 50]);
  });

  it("versetzt X-„00“ nach rechts", () => {
    const padL = PREIS_Y_LABEL_PAD_LEFT;
    const place = preisHourLabelPlacement(0, padL, padL);
    expect(place.textAnchor).toBe("start");
    expect(place.x).toBeGreaterThanOrEqual(padL + 4);
  });

  it("hält linke Y-Labels bei ~768 Shell im SVG", () => {
    const padL = preisChartPadLeft({ shellWidth: 704, wideFrame: false, compact: false });
    expect(padL).toBeGreaterThanOrEqual(PREIS_Y_LABEL_PAD_LEFT);
    expect(preisYTickLabelLeftEdge(padL, 14)).toBeGreaterThanOrEqual(4);
  });
});