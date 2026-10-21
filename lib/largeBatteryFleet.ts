/**
 * German large-battery fleet.
 *
 * Primary: Battery Charts (ISEA and PGS, RWTH Aachen), monthly MaStR evaluation.
 * The public chart script reads `bess_monthly_power` and `bess_monthly_energy`.
 * Licence CC BY 4.0. MaStR itself is dl-de/by-2-0.
 *
 * Fallback: Energy-Charts chart file that splits home, commercial and large storage.
 * The public `/installed_power` API only publishes the sum, which is mostly home batteries.
 * Licence CC BY 4.0, Fraunhofer ISE. That file names Bundesnetzagentur as the data basis.
 */

export const LARGE_BATTERY_FLEET_URL =
  "https://www.energy-charts.info/charts/installed_power/data/de/p_inst_battery_storage_year.json";

export const LARGE_BATTERY_CHART_URL =
  "https://www.energy-charts.info/charts/installed_power/chart.htm?c=DE&l=de";

/** Public Battery Charts page. The monthly series is what that page's chart script reads. */
export const BATTERY_CHARTS_PAGE_URL = "https://battery-charts.de/de/battery-charts-de/";

/**
 * Key shipped in the public Battery Charts chart script
 * (`themes/isea-wp/inc/charts/battery_charts/BatteryPower/chart.js`).
 * It is not a credential. The keyed URL stays on the server.
 */
export const BATTERY_CHARTS_PUBLIC_KEY = "t^gq70%lT0u^ZP";

export const BATTERY_CHARTS_POWER_QUERY = "bess_monthly_power";
export const BATTERY_CHARTS_ENERGY_QUERY = "bess_monthly_energy";

export function batteryChartsDataUrl(queryId: string): string {
  const url = new URL("https://battery-charts.de/wp-json/isea/v1/data");
  url.searchParams.set("api_key", BATTERY_CHARTS_PUBLIC_KEY);
  url.searchParams.set("query_id", queryId);
  return url.toString();
}

export type LargeBatteryFleetSource = "battery-charts" | "energy-charts";

export type LargeBatteryFleet = {
  powerGw: number;
  energyGwh: number;
  /** Hours at full power: capacity divided by power. */
  durationHours: number;
  year: string;
  updatedAtIso: string;
  updatedLabel: { de: string; en: string };
  datasource: string;
  source: LargeBatteryFleetSource;
  jsonUrl: string;
  chartUrl: string;
};

type NameCell = { de?: string; en?: string };

type ChartSeries = {
  name?: NameCell[];
  data?: Array<number | null>;
  xAxisValues?: number[];
  date?: number | number[];
  datasource?: string;
};

function seriesText(series: ChartSeries): string {
  return (series.name ?? [])
    .map((cell) => `${cell.de ?? ""} ${cell.en ?? ""}`)
    .join(" ")
    .toLowerCase();
}

function isLargePower(series: ChartSeries): boolean {
  const text = seriesText(series);
  const large = text.includes("große batteriespeicher") || text.includes("large battery");
  const power = text.includes("leistung") || text.includes("(power)") || text.includes(" power");
  const capacity = text.includes("kapazität") || text.includes("capacity");
  const count = text.includes("anzahl") || text.includes("number");
  return large && power && !capacity && !count;
}

function isLargeCapacity(series: ChartSeries): boolean {
  const text = seriesText(series);
  const large = text.includes("große batteriespeicher") || text.includes("large battery");
  const capacity = text.includes("kapazität") || text.includes("capacity");
  const count = text.includes("anzahl") || text.includes("number");
  const power = text.includes("leistung") || text.includes("(power)") || text.includes(" power");
  return large && capacity && !count && !power;
}

function sharedYears(series: ChartSeries[]): number[] | null {
  const withAxis = series.find((entry) => Array.isArray(entry.xAxisValues) && entry.xAxisValues.length > 0);
  return withAxis?.xAxisValues ?? null;
}

function valueInYear(series: ChartSeries, years: number[], year: number): number | null {
  const axis = series.xAxisValues ?? years;
  const index = axis.indexOf(year);
  if (index < 0) {
    return null;
  }
  const value = series.data?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readUpdatedAt(series: ChartSeries[]): string | null {
  for (const entry of series) {
    const raw = Array.isArray(entry.date) ? entry.date[0] : entry.date;
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      continue;
    }
    const ms = raw > 10_000_000_000 ? raw : raw * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    return date.toISOString();
  }
  return null;
}

function readDatasource(series: ChartSeries[]): string | null {
  for (const entry of series) {
    if (typeof entry.datasource === "string" && entry.datasource.trim().length > 0) {
      return entry.datasource.trim();
    }
  }
  return null;
}

function dateLabel(iso: string, language: "de" | "en"): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

/** Latest year in which both large-storage power and capacity are published. */
export function parseLargeBatteryFleet(payload: unknown): LargeBatteryFleet | null {
  if (!Array.isArray(payload)) {
    return null;
  }
  const series = payload.filter((entry): entry is ChartSeries => typeof entry === "object" && entry !== null);
  const power = series.find(isLargePower);
  const capacity = series.find(isLargeCapacity);
  const years = sharedYears(series);
  if (!power || !capacity || !years) {
    return null;
  }

  const ordered = [...years].sort((a, b) => b - a);
  let chosen: { year: number; powerGw: number; energyGwh: number } | null = null;
  for (const year of ordered) {
    const powerGw = valueInYear(power, years, year);
    const energyGwh = valueInYear(capacity, years, year);
    if (powerGw === null || energyGwh === null || powerGw <= 0 || energyGwh <= 0) {
      continue;
    }
    chosen = { year, powerGw, energyGwh };
    break;
  }
  if (!chosen) {
    return null;
  }

  const updatedAtIso = readUpdatedAt(series);
  const datasource = readDatasource(series);
  if (!updatedAtIso || !datasource) {
    return null;
  }

  return {
    powerGw: chosen.powerGw,
    energyGwh: chosen.energyGwh,
    durationHours: chosen.energyGwh / chosen.powerGw,
    year: String(chosen.year),
    updatedAtIso,
    updatedLabel: { de: dateLabel(updatedAtIso, "de"), en: dateLabel(updatedAtIso, "en") },
    datasource,
    source: "energy-charts",
    jsonUrl: LARGE_BATTERY_FLEET_URL,
    chartUrl: LARGE_BATTERY_CHART_URL,
  };
}

type MonthlyRow = { date?: unknown; grossspeicher?: unknown };

function monthlyStock(payload: unknown): Map<string, number> {
  const stock = new Map<string, number>();
  if (!Array.isArray(payload)) {
    return stock;
  }
  for (const entry of payload) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const row = entry as MonthlyRow;
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(row.date)) {
      continue;
    }
    if (typeof row.grossspeicher !== "number" || !Number.isFinite(row.grossspeicher) || row.grossspeicher <= 0) {
      continue;
    }
    stock.set(row.date.slice(0, 10), row.grossspeicher);
  }
  return stock;
}

/**
 * Latest Großspeicher point from Battery Charts monthly power and energy.
 * The chart script divides `grossspeicher` by 1e6, so the raw unit is kW and kWh.
 * Großspeicher there means at least 1,000 kWh or 1,000 kW, from MaStR.
 */
export function parseBatteryChartsFleet(powerPayload: unknown, energyPayload: unknown): LargeBatteryFleet | null {
  const power = monthlyStock(powerPayload);
  const energy = monthlyStock(energyPayload);
  const dates = [...power.keys()].filter((date) => energy.has(date)).sort();
  const date = dates[dates.length - 1];
  if (!date) {
    return null;
  }
  const powerGw = (power.get(date) ?? 0) / 1_000_000;
  const energyGwh = (energy.get(date) ?? 0) / 1_000_000;
  if (powerGw < 0.1 || powerGw > 100 || energyGwh < 0.1 || energyGwh > 500) {
    return null;
  }
  const [year, month, day] = date.split("-").map(Number);
  const updatedAtIso = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
  return {
    powerGw,
    energyGwh,
    durationHours: energyGwh / powerGw,
    year: String(year),
    updatedAtIso,
    updatedLabel: { de: dateLabel(updatedAtIso, "de"), en: dateLabel(updatedAtIso, "en") },
    datasource: "MaStR",
    source: "battery-charts",
    jsonUrl: BATTERY_CHARTS_PAGE_URL,
    chartUrl: BATTERY_CHARTS_PAGE_URL,
  };
}
