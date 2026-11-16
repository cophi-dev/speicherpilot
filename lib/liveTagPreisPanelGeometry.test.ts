import {
  axisTickLabelX,
  labelsWithinViewBox,
  liveTagPreisPanelLayout,
  preisPanelUnitLabelPositions,
} from "@/lib/liveTagPreisPanelGeometry";

describe("liveTagPreisPanelGeometry", () => {
  it("hält €/MWh und GW unit labels bei 390px mobil vollständig im viewBox", () => {
    const { frame, padL, padR } = liveTagPreisPanelLayout(true, 390);
    const units = preisPanelUnitLabelPositions(frame.w, padL, padR);
    const fontSize = 10;
    expect(
      labelsWithinViewBox(frame.w, [
        { text: "€/MWh", x: units.eurPerMwh.x, fontSize, textAnchor: units.eurPerMwh.textAnchor },
        { text: "GW", x: units.gw.x, fontSize, textAnchor: units.gw.textAnchor },
      ]),
    ).toBe(true);
  });

  it("hält Preis- und GW-Tick-Labels bei schmalem Plot im viewBox", () => {
    const { frame, padL, padR } = liveTagPreisPanelLayout(true, 320);
    const priceTick = axisTickLabelX("price", frame.w, padL, padR, true);
    const gwTick = axisTickLabelX("gw", frame.w, padL, padR, true);
    const fontSize = 9;
    const units = preisPanelUnitLabelPositions(frame.w, padL, padR);
    expect(
      labelsWithinViewBox(frame.w, [
        { text: "€/MWh", x: units.eurPerMwh.x, fontSize: 10, textAnchor: units.eurPerMwh.textAnchor },
        { text: "GW", x: units.gw.x, fontSize: 10, textAnchor: units.gw.textAnchor },
      ]),
    ).toBe(true);
    expect(
      labelsWithinViewBox(
        frame.w,
        [
          { text: "42", x: priceTick.x, fontSize, textAnchor: priceTick.textAnchor },
          { text: "+4,7", x: gwTick.x, fontSize, textAnchor: gwTick.textAnchor },
        ],
        1,
      ),
    ).toBe(true);
  });

  it("Desktop-Layout: unit labels innerhalb viewBox", () => {
    const { frame, padL, padR } = liveTagPreisPanelLayout(false, 1152);
    const units = preisPanelUnitLabelPositions(frame.w, padL, padR);
    expect(
      labelsWithinViewBox(frame.w, [
        { text: "€/MWh", x: units.eurPerMwh.x, fontSize: 10, textAnchor: units.eurPerMwh.textAnchor },
        { text: "GW", x: units.gw.x, fontSize: 10, textAnchor: units.gw.textAnchor },
      ]),
    ).toBe(true);
  });
});