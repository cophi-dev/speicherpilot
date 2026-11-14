import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildLiveDayPlausibility,
  filteredHmLabels,
  solidResidualValues,
} from "@/lib/liveDayPlausibility";
import { parseWindSolarDays } from "@/lib/windSolarResidual";

const FIXTURE = join(__dirname, "..", "__fixtures__", "live_tag_1411");

function dayFromFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(FIXTURE, name), "utf8"));
  const days = parseWindSolarDays(raw);
  return days.find((day) => day.dateBerlin === "2026-11-14") ?? days[0]!;
}

describe("liveDayPlausibility", () => {
  it("filtert die sechs Einbrüche aus tp_today.json (Abruf 16:27)", () => {
    const day = dayFromFixture("tp_today.json");
    const filtered = filteredHmLabels(day.slots);
    expect(filtered).toEqual(
      expect.arrayContaining(["12:45", "13:00", "13:15", "13:45", "14:00", "14:15"]),
    );
    expect(filtered.length).toBe(6);
  });

  it("zeigt in der soliden Restlast keinen Schein-Überschuss bis −4,2 GW (tp_today)", () => {
    const day = dayFromFixture("tp_today.json");
    const result = buildLiveDayPlausibility(day.slots);
    const solid = solidResidualValues(result);
    expect(solid.every((gw) => gw > -3)).toBe(true);
  });

  it("filtert nachkorrigierte Einbrüche in tp_today_2.json", () => {
    const day = dayFromFixture("tp_today_2.json");
    const filtered = filteredHmLabels(day.slots);
    expect(filtered.length).toBeGreaterThanOrEqual(4);
    const result = buildLiveDayPlausibility(day.slots);
    const solid = solidResidualValues(result);
    expect(solid.every((gw) => gw > -3)).toBe(true);
  });
});