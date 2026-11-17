import { ueberschussPoolBarLabelLayout } from "@/lib/monatUeberschussPoolBarLabel";

describe("ueberschussPoolBarLabelLayout", () => {
  const poolX = 88;

  it("0 %-Label: text-anchor start, x = Balkenstart + 4", () => {
    const layout = ueberschussPoolBarLabelLayout(0, poolX);
    expect(layout.textAnchor).toBe("start");
    expect(layout.x).toBe(92);
    expect(layout.onDarkFill).toBe(false);
  });

  it("voller Balken: zentriert auf Füllbreite", () => {
    const fillW = 120;
    const layout = ueberschussPoolBarLabelLayout(fillW, poolX);
    expect(layout.textAnchor).toBe("middle");
    expect(layout.x).toBe(poolX + fillW / 2);
    expect(layout.onDarkFill).toBe(true);
  });
});