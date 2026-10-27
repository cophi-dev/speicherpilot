import { DAILY_SERIES_REVALIDATE_SECONDS } from "@/lib/dailySeriesCache";
import type { QuarterPoint } from "@/lib/liveBoard";

/** SMARD chart-data filters. Prices are not in this list: the day-ahead price is the DE-LU bidding zone, not a control area. */
export const SMARD_FILTER = {
  windOffshore: 1225,
  windOnshore: 4067,
  photovoltaic: 4068,
  load: 410,
} as const;

export type SmardRegion = "50Hertz" | "TenneT" | "TransnetBW";

type SmardFile = { series?: Array<[number, number | null]> };

export function parseSmardSeries(payload: SmardFile): QuarterPoint[] {
  const rows = payload.series ?? [];
  return rows.map(([unixMs, value]) => ({
    unixMs,
    value: value === null || !Number.isFinite(value) ? null : value,
  }));
}

export async function fetchSmardQuarterHours(
  filter: number,
  region: SmardRegion,
  fetchImpl: typeof fetch = fetch
): Promise<QuarterPoint[]> {
  const indexUrl = `https://www.smard.de/app/chart_data/${filter}/${region}/index_quarterhour.json`;
  const requestInit = {
    headers: { Accept: "application/json" },
    next: { revalidate: DAILY_SERIES_REVALIDATE_SECONDS },
  };
  const indexResponse = await fetchImpl(indexUrl, requestInit);
  if (!indexResponse.ok) {
    throw new Error(`SMARD index ${region} ${filter} failed with ${indexResponse.status}`);
  }
  const index = (await indexResponse.json()) as { timestamps?: number[] };
  const stamp = index.timestamps?.at(-1);
  if (!stamp) {
    return [];
  }
  const fileUrl = `https://www.smard.de/app/chart_data/${filter}/${region}/${filter}_${region}_quarterhour_${stamp}.json`;
  const fileResponse = await fetchImpl(fileUrl, requestInit);
  if (!fileResponse.ok) {
    throw new Error(`SMARD series ${region} ${filter} failed with ${fileResponse.status}`);
  }
  return parseSmardSeries((await fileResponse.json()) as SmardFile);
}
