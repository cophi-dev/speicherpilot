import {
  isDomesticGenerationPublishedAt,
  liveNetPositionMw,
  readAlignedGermanyRealtime,
  type NamedPowerSeries,
} from "@/lib/realtimeSystemSnapshot";

const series = (name: string, data: Array<number | null>): NamedPowerSeries => ({ name, data });

describe("readAlignedGermanyRealtime", () => {
  it("does not treat a load-only tail as zero generation or a fake deficit", () => {
    /**
     * Energy-Charts pattern seen live on 2026-10-20: load (and cross-border)
     * continue for two quarter-hours after generation, residual, and share
     * series go null. The newest load was ~59.8 GW; generation at the last
     * published quarter-hour was ~62.5 GW.
     */
    const unixSeconds = [1_700_000_000, 1_700_000_900, 1_700_001_800];
    const productionTypes: NamedPowerSeries[] = [
      series("Load (incl. self-consumption)", [60_621, 59_620, 59_830]),
      series("Cross border electricity trading", [900, 700, 416]),
      series("Residual load", [41_521, null, null]),
      series("Renewable share of load", [41.9, null, null]),
      series("Renewable share of generation", [40.7, null, null]),
      series("Solar", [0, null, null]),
      series("Wind onshore", [12_373, null, null]),
      series("Wind offshore", [6_727, null, null]),
      series("Biomass", [4_534, null, null]),
      series("Fossil gas", [19_730, null, null]),
      series("Hydro pumped storage consumption", [-112, null, null]),
    ];

    const reading = readAlignedGermanyRealtime({ unixSeconds, productionTypes });

    expect(reading).not.toBeNull();
    expect(reading?.index).toBe(0);
    expect(reading?.loadMw).toBe(60_621);
    expect(reading?.domesticGenerationMw).toBeCloseTo(0 + 12_373 + 6_727 + 4_534 + 19_730, 3);
    expect(reading?.domesticGenerationMw).not.toBe(0);
    expect(reading?.renewableShareOfGenerationPct).toBeCloseTo(40.7, 3);
    expect(reading?.renewableShareOfLoadPct).toBeCloseTo(((60_621 - 41_521) / 60_621) * 100, 3);
    expect(reading?.residualLoadMw).toBe(41_521);
    const alignedNet = liveNetPositionMw(reading!.domesticGenerationMw, reading!.loadMw);
    expect(alignedNet).toBeCloseTo(reading!.domesticGenerationMw! - reading!.loadMw, 3);
    expect(alignedNet).not.toBeCloseTo(-59_830, -2);
  });

  it("returns null generation and no net position when generation is unpublished", () => {
    const reading = readAlignedGermanyRealtime({
      unixSeconds: [1_700_000_000, 1_700_000_900],
      productionTypes: [
        series("Load (incl. self-consumption)", [62_000, 61_500]),
        series("Solar", [null, null]),
        series("Fossil gas", [null, null]),
        series("Residual load", [null, null]),
      ],
    });

    expect(reading?.index).toBe(1);
    expect(reading?.loadMw).toBe(61_500);
    expect(reading?.domesticGenerationMw).toBeNull();
    expect(reading?.renewableShareOfGenerationPct).toBeNull();
    expect(reading?.residualLoadMw).toBeNull();
    expect(liveNetPositionMw(reading!.domesticGenerationMw, reading!.loadMw)).toBeNull();
    expect(isDomesticGenerationPublishedAt(reading ? [] : [], 0)).toBe(false);
  });

  it("keeps a published numeric zero, including overnight solar next to other plant series", () => {
    const reading = readAlignedGermanyRealtime({
      unixSeconds: [1_700_000_000],
      productionTypes: [
        series("Load (incl. self-consumption)", [50_000]),
        series("Solar", [0]),
        series("Fossil hard coal", [20_000]),
        series("Wind onshore", [10_000]),
      ],
    });

    expect(reading?.domesticGenerationMw).toBe(30_000);
    expect(reading?.renewableShareOfGenerationPct).toBeCloseTo((10_000 / 30_000) * 100, 3);
    expect(liveNetPositionMw(reading!.domesticGenerationMw, reading!.loadMw)).toBe(-20_000);
  });

  it("counts an all-zero published stack as a real deficit, not missing data", () => {
    const reading = readAlignedGermanyRealtime({
      unixSeconds: [1_700_000_000],
      productionTypes: [
        series("Load (incl. self-consumption)", [40_000]),
        series("Solar", [0]),
        series("Fossil gas", [0]),
      ],
    });

    expect(reading?.domesticGenerationMw).toBe(0);
    expect(liveNetPositionMw(0, 40_000)).toBe(-40_000);
  });
});
