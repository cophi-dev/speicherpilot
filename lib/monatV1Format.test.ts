import { formatGwAbs, formatGwReduction } from "@/lib/monatV1Format";

const NBSP = "\u00a0";
const MINUS = "\u2212";

describe("formatGwReduction", () => {
  it("schreibt nie eine negative Null", () => {
    expect(formatGwReduction(0, 2)).toBe(`0,00${NBSP}GW`);
    expect(formatGwReduction(-0, 2)).toBe(`0,00${NBSP}GW`);
    expect(formatGwReduction(0.001, 2)).toBe(`0,00${NBSP}GW`);
    expect(formatGwReduction(-0.004, 2)).toBe(`0,00${NBSP}GW`);
    expect(formatGwReduction(0, 1)).toBe(`0,0${NBSP}GW`);
    expect(formatGwReduction(0, 2)).not.toMatch(new RegExp(`${MINUS}0`));
  });

  it("setzt das Minus nur bei gerundeter Senkung ungleich null", () => {
    expect(formatGwReduction(13.9773, 2)).toBe(`${MINUS}13,98${NBSP}GW`);
    expect(formatGwReduction(13.9773, 1)).toBe(`${MINUS}14,0${NBSP}GW`);
    expect(formatGwReduction(3.5896, 2)).toBe(`${MINUS}3,59${NBSP}GW`);
  });
});

describe("formatGwAbs", () => {
  it("formatiert ohne Vorzeichen", () => {
    expect(formatGwAbs(64.4, 1)).toBe(`64,4${NBSP}GW`);
  });
});
