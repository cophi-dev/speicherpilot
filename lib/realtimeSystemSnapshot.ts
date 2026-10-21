/**
 * Live Germany system reading from an Energy-Charts `total_power` payload.
 *
 * Load (and cross-border trading) are often published one or two quarter-hours
 * ahead of generation, residual load, and renewable-share series. Anchoring the
 * snapshot on the newest load sample and treating missing generation as 0 MW
 * invents a deficit equal to demand. This module only pairs load with a
 * timestamp where domestic generation is actually published.
 */

export type NamedPowerSeries = {
  name: string;
  data: Array<number | null>;
};

export type AlignedGermanyRealtime = {
  /** Index into `unix_seconds` / series arrays. */
  index: number;
  timestampUnixSeconds: number;
  loadMw: number;
  /**
   * Sum of published domestic generation series at `index`.
   * Null when no domestic generation series has a finite value at any load sample.
   * A genuine numeric zero (every series published as 0) stays 0.
   */
  domesticGenerationMw: number | null;
  batteryStorageMw: number | null;
  /** Residual load at the same index only. Never backfilled from an older quarter-hour. */
  residualLoadMw: number | null;
  renewableShareOfLoadPct: number | null;
  /** Renewable share of domestic generation, 0–100. */
  renewableShareOfGenerationPct: number | null;
};

const EXCLUDED_FROM_DOMESTIC_GENERATION = new Set([
  "Load (incl. self-consumption)",
  "Residual load",
  "Renewable share of load",
  "Renewable share of generation",
  "Cross border electricity trading",
  "Hydro pumped storage consumption",
]);

const LOAD_SERIES_NAME = "Load (incl. self-consumption)";
const RESIDUAL_LOAD_SERIES_REGEX = /^residual\s*load\b/i;
const RENEWABLE_GENERATION_SERIES_REGEX =
  /(wind|solar|biomass|geothermal|hydro run-of-river|hydro water reservoir)/i;

const finiteAt = (data: Array<number | null>, index: number): number | null => {
  const value = data[index];
  return value !== null && Number.isFinite(value) ? value : null;
};

export const isDomesticGenerationSeriesName = (name: string): boolean => {
  const trimmed = name.trim();
  if (EXCLUDED_FROM_DOMESTIC_GENERATION.has(trimmed)) {
    return false;
  }
  if (RESIDUAL_LOAD_SERIES_REGEX.test(trimmed)) {
    return false;
  }
  return true;
};

const isRenewableGenerationSeriesName = (name: string): boolean =>
  isDomesticGenerationSeriesName(name) &&
  !/battery/i.test(name) &&
  RENEWABLE_GENERATION_SERIES_REGEX.test(name);

const findSeries = (
  productionTypes: NamedPowerSeries[],
  name: string
): NamedPowerSeries | undefined => productionTypes.find((series) => series.name === name);

/** True when at least one domestic generation series has a finite sample (including 0). */
export const isDomesticGenerationPublishedAt = (
  productionTypes: NamedPowerSeries[],
  index: number
): boolean =>
  productionTypes.some(
    (series) =>
      isDomesticGenerationSeriesName(series.name) && finiteAt(series.data, index) !== null
  );

const sumDomesticGenerationMw = (
  productionTypes: NamedPowerSeries[],
  index: number
): number | null => {
  if (!isDomesticGenerationPublishedAt(productionTypes, index)) {
    return null;
  }
  let sum = 0;
  for (const series of productionTypes) {
    if (!isDomesticGenerationSeriesName(series.name)) {
      continue;
    }
    const value = finiteAt(series.data, index);
    if (value !== null) {
      sum += value;
    }
  }
  return sum;
};

const sumRenewableGenerationMw = (
  productionTypes: NamedPowerSeries[],
  index: number
): number | null => {
  let sawRenewable = false;
  let sum = 0;
  for (const series of productionTypes) {
    if (!isRenewableGenerationSeriesName(series.name)) {
      continue;
    }
    const value = finiteAt(series.data, index);
    if (value === null) {
      continue;
    }
    sawRenewable = true;
    sum += value;
  }
  return sawRenewable ? sum : null;
};

const shareFromSeriesOrDerived = (
  direct: number | null,
  numeratorMw: number | null,
  denominatorMw: number
): number | null => {
  if (direct !== null) {
    return direct;
  }
  if (numeratorMw === null || !(denominatorMw > 0)) {
    return null;
  }
  return (numeratorMw / denominatorMw) * 100;
};

/**
 * Latest quarter-hour where load and domestic generation are both published.
 * Falls back to the latest load sample with `domesticGenerationMw: null` when
 * generation is absent everywhere — callers must not invent a deficit from that.
 */
export const readAlignedGermanyRealtime = (input: {
  unixSeconds: number[];
  productionTypes: NamedPowerSeries[];
}): AlignedGermanyRealtime | null => {
  const { unixSeconds, productionTypes } = input;
  const loadSeries = findSeries(productionTypes, LOAD_SERIES_NAME);
  if (loadSeries === undefined) {
    return null;
  }

  const pointCount = Math.min(unixSeconds.length, loadSeries.data.length);
  let alignedIndex: number | null = null;
  let loadOnlyIndex: number | null = null;

  for (let index = pointCount - 1; index >= 0; index -= 1) {
    const loadMw = finiteAt(loadSeries.data, index);
    if (loadMw === null) {
      continue;
    }
    if (loadOnlyIndex === null) {
      loadOnlyIndex = index;
    }
    if (isDomesticGenerationPublishedAt(productionTypes, index)) {
      alignedIndex = index;
      break;
    }
  }

  const index = alignedIndex ?? loadOnlyIndex;
  if (index === null) {
    return null;
  }

  const loadMw = finiteAt(loadSeries.data, index);
  if (loadMw === null) {
    return null;
  }

  const domesticGenerationMw =
    alignedIndex === null ? null : sumDomesticGenerationMw(productionTypes, index);
  const renewableMw =
    domesticGenerationMw === null ? null : sumRenewableGenerationMw(productionTypes, index);

  const residualSeries = productionTypes.find((series) =>
    RESIDUAL_LOAD_SERIES_REGEX.test(series.name.trim())
  );
  const residualLoadMw =
    residualSeries === undefined ? null : finiteAt(residualSeries.data, index);

  const shareOfLoadSeries = findSeries(productionTypes, "Renewable share of load");
  const shareOfGenerationSeries = findSeries(productionTypes, "Renewable share of generation");
  const directShareOfLoad =
    shareOfLoadSeries === undefined ? null : finiteAt(shareOfLoadSeries.data, index);
  const directShareOfGeneration =
    shareOfGenerationSeries === undefined ? null : finiteAt(shareOfGenerationSeries.data, index);
  const residualImpliedShareOfLoad =
    residualLoadMw !== null && loadMw > 0 ? ((loadMw - residualLoadMw) / loadMw) * 100 : null;

  const batterySeries = productionTypes.find(
    (series) => isDomesticGenerationSeriesName(series.name) && /battery/i.test(series.name)
  );

  return {
    index,
    timestampUnixSeconds: unixSeconds[index] ?? 0,
    loadMw,
    domesticGenerationMw,
    batteryStorageMw: batterySeries === undefined ? null : finiteAt(batterySeries.data, index),
    residualLoadMw,
    /**
     * Same precedence as the previous snapshot: a same-timestamp residual
     * implies renewable share of load. Direct or derived series fill the gap.
     */
    renewableShareOfLoadPct:
      domesticGenerationMw === null
        ? null
        : (residualImpliedShareOfLoad ??
          shareFromSeriesOrDerived(directShareOfLoad, renewableMw, loadMw)),
    renewableShareOfGenerationPct:
      domesticGenerationMw === null
        ? null
        : shareFromSeriesOrDerived(directShareOfGeneration, renewableMw, domesticGenerationMw),
  };
};

/** Generation minus load. Null when generation was not published — never `0 − load`. */
export const liveNetPositionMw = (
  domesticGenerationMw: number | null,
  loadMw: number
): number | null =>
  domesticGenerationMw === null ? null : domesticGenerationMw - loadMw;
