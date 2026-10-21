import { parseWindSolarDays, pickSurplusDay, windSolarSurplusMwh } from "@/lib/windSolarResidual";

function series(name: string, data: Array<number | null>) {
  return { name, data };
}

describe("parseWindSolarDays", () => {
  it("keeps a published zero and drops a quarter-hour whose wind is still null", () => {
    const days = parseWindSolarDays({
      unix_seconds: [Date.parse("2026-09-27T10:00:00Z") / 1000, Date.parse("2026-09-27T10:15:00Z") / 1000],
      production_types: [
        series("Load (incl. self-consumption)", [40_000, 40_000]),
        series("Wind onshore", [10_000, null]),
        series("Wind offshore", [1_000, 1_000]),
        series("Solar", [0, 20_000]),
      ],
    });
    expect(days).toHaveLength(1);
    expect(days[0].slots).toHaveLength(1);
    expect(days[0].slots[0].windMw).toBe(11_000);
    expect(days[0].slots[0].solarMw).toBe(0);
    expect(days[0].dateBerlin).toBe("2026-09-27");
  });
});

describe("pickSurplusDay", () => {
  const surplus = {
    dateBerlin: "2026-09-27",
    slots: [
      {
        timestampIso: "2026-09-27T10:00:00.000Z",
        hourBerlin: 12,
        minuteBerlin: 0,
        loadMw: 40_000,
        windMw: 10_000,
        solarMw: 40_000,
      },
    ],
  };
  const deficit = {
    dateBerlin: "2026-10-21",
    slots: [
      {
        timestampIso: "2026-10-21T07:00:00.000Z",
        hourBerlin: 9,
        minuteBerlin: 0,
        loadMw: 60_000,
        windMw: 10_000,
        solarMw: 5_000,
      },
    ],
  };

  it("uses today when wind plus solar exceeds load", () => {
    const picked = pickSurplusDay([surplus, { ...surplus, dateBerlin: "2026-10-21" }], "2026-10-21");
    expect(picked?.fallback).toBe(false);
    expect(picked?.day.dateBerlin).toBe("2026-10-21");
  });

  it("falls back to the newest day that has surplus", () => {
    const picked = pickSurplusDay([surplus, deficit], "2026-10-21");
    expect(picked?.fallback).toBe(true);
    expect(picked?.day.dateBerlin).toBe("2026-09-27");
    expect(windSolarSurplusMwh(deficit.slots)).toBe(0);
  });

  it("returns null when no day has surplus", () => {
    expect(pickSurplusDay([deficit], "2026-10-21")).toBeNull();
  });
});
