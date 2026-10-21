import { parseBatteryChartsFleet, parseLargeBatteryFleet } from "@/lib/largeBatteryFleet";

const UPDATED_MS = 1792143027000;

function series(de: string, en: string, data: Array<number | null>, extra?: Record<string, unknown>) {
  return {
    name: [{ de, en }],
    data,
    ...extra,
  };
}

const years = [2025, 2026];

describe("parseLargeBatteryFleet", () => {
  it("reads the latest large-storage power and capacity, not the home fleet or the sum", () => {
    const fleet = parseLargeBatteryFleet([
      series("Heim-Batteriespeicher (Anzahl)", "Home battery storage (number)", [1, 2], {
        xAxisValues: years,
        date: [UPDATED_MS],
        datasource: "Bundesnetzagentur",
      }),
      series("Große Batteriespeicher (Leistung)", "Large battery storage (power)", [3.1, 4.529]),
      series("Heim-Batteriespeicher (Leistung)", "Home battery storage (power)", [13, 16.298]),
      series("Große Batteriespeicher (Kapazität)", "Large battery storage (capacity)", [6, 7.921]),
      series("Battery storage (power)", "Battery storage (power)", [18, 21.675]),
    ]);

    expect(fleet).not.toBeNull();
    expect(fleet?.powerGw).toBeCloseTo(4.529, 3);
    expect(fleet?.energyGwh).toBeCloseTo(7.921, 3);
    expect(fleet?.year).toBe("2026");
    expect(fleet?.durationHours).toBeCloseTo(7.921 / 4.529, 5);
    expect(fleet?.updatedAtIso.startsWith("2026-10-16")).toBe(true);
    expect(fleet?.updatedLabel.de).toBe("16. Oktober 2026");
    expect(fleet?.datasource).toBe("Bundesnetzagentur");
    expect(fleet?.source).toBe("energy-charts");
  });

  it("does not treat the summed battery series as large storage", () => {
    expect(
      parseLargeBatteryFleet([
        series("Battery storage (power)", "Battery storage (power)", [21.675], {
          xAxisValues: [2026],
          date: UPDATED_MS,
          datasource: "Bundesnetzagentur",
        }),
        series("Battery storage (capacity)", "Battery storage (capacity)", [33.922]),
      ])
    ).toBeNull();
  });
});

describe("parseBatteryChartsFleet", () => {
  it("reads the latest Großspeicher power and energy in kW and kWh", () => {
    const fleet = parseBatteryChartsFleet(
      [
        { date: "2026-09-30 00:00:00", grossspeicher: 4_500_120.22 },
        { date: "2026-10-21 00:00:00", home: 1, grossspeicher: 4_515_540.22 },
      ],
      [
        { date: "2026-09-30 00:00:00", grossspeicher: 7_825_046.57 },
        { date: "2026-10-21 00:00:00", grossspeicher: 7_860_016.57 },
      ]
    );
    expect(fleet?.source).toBe("battery-charts");
    expect(fleet?.powerGw).toBeCloseTo(4.51554022, 5);
    expect(fleet?.energyGwh).toBeCloseTo(7.86001657, 5);
    expect(fleet?.updatedLabel.de).toBe("21. Oktober 2026");
    expect(fleet?.datasource).toBe("MaStR");
    expect(fleet?.chartUrl).toBe("https://battery-charts.de/de/battery-charts-de/");
  });

  it("returns null when power and energy do not share a date", () => {
    expect(
      parseBatteryChartsFleet(
        [{ date: "2026-10-21 00:00:00", grossspeicher: 4_515_540 }],
        [{ date: "2026-09-30 00:00:00", grossspeicher: 7_825_046 }]
      )
    ).toBeNull();
  });
});
