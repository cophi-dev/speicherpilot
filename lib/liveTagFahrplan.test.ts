import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseDayAheadPrices } from "@/lib/dayAheadPrices";
import { referenceParkModelDay } from "@/lib/referenceParkModelDay";

const FIXTURE = join(__dirname, "..", "__fixtures__", "live_tag_1411");

function movementBlocks(netGw: number[]): Array<{ kind: "charge" | "discharge"; start: number; end: number }> {
  const blocks: Array<{ kind: "charge" | "discharge"; start: number; end: number }> = [];
  let current: { kind: "charge" | "discharge"; start: number; end: number } | null = null;
  for (let index = 0; index < netGw.length; index += 1) {
    const value = netGw[index] ?? 0;
    const kind = value > 0.1 ? "discharge" : value < -0.1 ? "charge" : null;
    if (!kind) {
      current = null;
      continue;
    }
    if (!current || current.kind !== kind) {
      current = { kind, start: index, end: index };
      blocks.push(current);
    } else {
      current.end = index;
    }
  }
  return blocks;
}

describe("Live-Tag Markt-Fahrplan ×1", () => {
  it("hat am 14.11. zwei Entlade-Zyklen in der Referenz (fahrplan_x1_1411.json)", () => {
    const ref = JSON.parse(readFileSync(join(FIXTURE, "fahrplan_x1_1411.json"), "utf8")) as {
      net_gw: number[];
    };
    const blocks = movementBlocks(ref.net_gw);
    const discharges = blocks.filter((block) => block.kind === "discharge");
    const charges = blocks.filter((block) => block.kind === "charge");
    expect(discharges.length).toBe(2);
    expect(charges.length).toBeGreaterThanOrEqual(2);
    expect(discharges[0]!.start).toBeGreaterThanOrEqual(28);
    expect(discharges[1]!.start).toBeGreaterThanOrEqual(68);
  });

  it("rechnet für dieselben Preise einen Markt-Fahrplan mit mindestens zwei Entlade-Blöcken", () => {
    const prices = parseDayAheadPrices(JSON.parse(readFileSync(join(FIXTURE, "price.json"), "utf8")));
    const model = referenceParkModelDay({
      prices,
      dateBerlin: "2026-11-14",
      powerMw: 4645.2,
      energyMwh: 8154.5,
    });
    expect(model).not.toBeNull();
    const net = model!.points.map((point) => (point.dischargeMw - point.chargeMw) / 1000);
    const charges = movementBlocks(net).filter((block) => block.kind === "charge");
    expect(charges.length).toBeGreaterThanOrEqual(2);
    expect(net.some((value) => value > 0.1)).toBe(true);
    expect(net.some((value) => value < -0.1)).toBe(true);
  });
});