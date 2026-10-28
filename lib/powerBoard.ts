import type { AppLanguage } from "@/components/language-context";
import { chainFleetSoc, CHAIN_SOC_MIN, type ChainPoint } from "@/lib/chainedFleetSoc";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_DISPATCH_FACTORS, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import {
  aggregateSlots,
  CARRIER_IDS,
  chartUnit,
  isQuietDay,
  lastSurplusDate,
  periodFigures,
  rangeBounds,
  slotsInRange,
  type CarrierId,
  type ChartPoint,
  type MixRange,
  type PowerSlot,
} from "@/lib/powerMix";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";
import type { ResidualDay } from "@/lib/windSolarResidual";

export const CARRIER_COPY: Record<CarrierId, { de: string; en: string }> = {
  lignite: { de: "Braunkohle", en: "Lignite" },
  hardCoal: { de: "Steinkohle", en: "Hard coal" },
  gas: { de: "Erdgas", en: "Natural gas" },
  biomass: { de: "Biomasse", en: "Biomass" },
  hydro: { de: "Wasser", en: "Hydro" },
  windOffshore: { de: "Wind auf See", en: "Wind offshore" },
  windOnshore: { de: "Wind an Land", en: "Wind onshore" },
  solar: { de: "Sonne", en: "Solar" },
  other: { de: "Sonstige", en: "Other" },
};

type Copy = { de: string; en: string };

export type BoardRow = {
  id: string;
  label: Copy;
  value: Copy;
};

export type SocSample = {
  unix: number;
  socPct: number;
  socGwh: number;
};

export type PowerBoardModel = {
  range: MixRange;
  unit: "GW" | "GWh";
  aggregation: Copy;
  periodTitle: Copy;
  until: string | null;
  links: Array<{ id: MixRange; href: string; label: Copy; current: boolean }>;
  points: ChartPoint[];
  rows: BoardRow[];
  quiet: { de: [string, string]; en: [string, string] } | null;
  lastSurplus: { href: string; label: string } | null;
  fleet: { power: Copy; energy: Copy; powerGw: number; energyGwh: number } | null;
  soc: Record<LiveDispatchFactor, SocSample[]>;
  startSocPct: number;
  stale: boolean;
  description: Copy;
};

function both(de: string, en: string): Copy {
  return { de, en };
}

function gwh(value: number | null, language: AppLanguage): string {
  if (value === null || !Number.isFinite(value)) {
    return language === "de" ? "nicht veröffentlicht" : "not published";
  }
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${formatQuantity(value, language, digits)} GWh`;
}

function gw(valueMw: number | null, language: AppLanguage): string {
  if (valueMw === null || !Number.isFinite(valueMw)) {
    return language === "de" ? "nicht veröffentlicht" : "not published";
  }
  return formatQuantity(valueMw / 1000, language, 1);
}

function shareText(value: number | null, language: AppLanguage): string {
  if (value === null || !Number.isFinite(value)) {
    return language === "de" ? "nicht veröffentlicht" : "not published";
  }
  return `${formatQuantity(value * 100, language, 1)} %`;
}

function textPair(build: (language: AppLanguage) => string): Copy {
  return { de: build("de"), en: build("en") };
}

function dateLabel(dateBerlin: string): string {
  const [year, month, day] = dateBerlin.split("-");
  return `${day}.${month}.${year}`;
}

export function boardHref(path: string, range: MixRange, tag: string | null): string {
  const params = new URLSearchParams();
  if (tag) {
    params.set("tag", tag);
  }
  if (range !== "tag") {
    params.set("zeitraum", range);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function quietCopy(input: {
  load: Copy;
  wind: Copy;
  share: Copy;
  minGw: Copy;
  minTime: string;
  maxGw: Copy;
  maxTime: string;
  surplus: Copy;
  surplusGwh: number;
}): { de: [string, string]; en: [string, string] } {
  const firstDe = `Wind und Sonne haben ${input.share.de} der Last gedeckt, ${input.wind.de} von ${input.load.de}. Die Residuallast lag zwischen ${input.minGw.de} GW um ${input.minTime} und ${input.maxGw.de} GW um ${input.maxTime}.`;
  const firstEn = `Wind and solar covered ${input.share.en} of load, ${input.wind.en} of ${input.load.en}. Residual load ran from ${input.minGw.en} GW at ${input.minTime} to ${input.maxGw.en} GW at ${input.maxTime}.`;
  const secondDe =
    input.surplusGwh <= 0
      ? "Im Überschuss-Modell ist nichts zu laden."
      : `Der Überschuss aus Wind und Sonne liegt bei ${input.surplus.de}. Im Überschuss-Modell ist daraus nichts zu laden.`;
  const secondEn =
    input.surplusGwh <= 0
      ? "In the surplus model there is nothing to charge."
      : `Wind-and-solar surplus is ${input.surplus.en}. In the surplus model there is nothing to charge from that.`;
  return { de: [firstDe, secondDe], en: [firstEn, secondEn] };
}

function socAt(points: ChainPoint[], unix: number, bucketEnd: number): SocSample | null {
  let chosen: ChainPoint | null = null;
  for (const point of points) {
    if (point.unixSeconds <= bucketEnd) {
      chosen = point;
    } else {
      break;
    }
  }
  if (!chosen) {
    return null;
  }
  return { unix, socPct: chosen.soc * 100, socGwh: chosen.socMwh / 1000 };
}

function bucketEnd(unix: number, range: MixRange): number {
  if (range === "tag") {
    return unix;
  }
  if (range === "woche") {
    return unix + 3600 - 1;
  }
  return unix + 12 * 3600;
}

export function buildPowerBoard(input: {
  slots: PowerSlot[];
  offshorePresent: boolean;
  range: MixRange;
  endDate: string;
  todayKey: string;
  path: string;
  fleet: { powerGw: number; energyGwh: number } | null;
  stale: boolean;
  /** Keep the explicit day in links when the visitor opened one. */
  tag: string | null;
}): PowerBoardModel {
  const bounds = rangeBounds(input.endDate, input.range);
  const window = slotsInRange(input.slots, bounds.start, bounds.end);
  const figures = periodFigures(window, input.offshorePresent);
  const points = aggregateSlots(window, input.range, input.offshorePresent);
  const unit = chartUnit(input.range);
  const open = input.endDate === input.todayKey;
  const last = window[window.length - 1];
  const until =
    open && last && !(last.hourBerlin === 23 && last.minuteBerlin === 45)
      ? uniqueQuarterLabels([last.timestampIso])[0] ?? null
      : null;
  const minTime = figures.residualMinIso ? uniqueQuarterLabels([figures.residualMinIso])[0] ?? "" : "";
  const maxTime = figures.residualMaxIso ? uniqueQuarterLabels([figures.residualMaxIso])[0] ?? "" : "";
  const load = textPair((language) => gwh(figures.loadGwh, language));
  const wind = textPair((language) => gwh(figures.windSolarGwh, language));
  const share = textPair((language) => shareText(figures.windSolarShare, language));
  const surplus = textPair((language) => gwh(figures.surplusGwh, language));
  const minGw = textPair((language) => gw(figures.residualMinMw, language));
  const maxGw = textPair((language) => gw(figures.residualMaxMw, language));
  const trade = textPair((language) => gwh(figures.tradeGwh, language));

  const rows: BoardRow[] = CARRIER_IDS.map((id) => ({
    id,
    label: CARRIER_COPY[id],
    value: textPair((language) => gwh(figures.carrierGwh[id], language)),
  }));
  rows.push(
    { id: "load", label: both("Last", "Load"), value: load },
    { id: "windSolar", label: both("Wind und Sonne", "Wind and solar"), value: wind },
    { id: "share", label: both("Anteil Wind und Sonne an der Last", "Wind and solar share of load"), value: share },
    { id: "surplus", label: both("Überschuss Wind und Sonne", "Wind and solar surplus"), value: surplus },
    {
      id: "residualMax",
      label: both("Residuallast höchste", "Residual load, highest"),
      value: textPair((language) => (figures.residualMaxMw === null ? gw(null, language) : `${maxGw[language]} GW · ${maxTime}`)),
    },
    {
      id: "residualMin",
      label: both("Residuallast niedrigste", "Residual load, lowest"),
      value: textPair((language) => (figures.residualMinMw === null ? gw(null, language) : `${minGw[language]} GW · ${minTime}`)),
    },
    { id: "trade", label: both("Handelssaldo", "Cross-border balance"), value: trade }
  );

  const dayFigures = periodFigures(
    slotsInRange(input.slots, input.endDate, input.endDate),
    input.offshorePresent
  );
  const quiet =
    input.range === "tag" &&
    isQuietDay(dayFigures.surplusGwh) &&
    dayFigures.loadGwh !== null &&
    dayFigures.windSolarGwh !== null &&
    dayFigures.windSolarShare !== null &&
    dayFigures.residualMinMw !== null &&
    dayFigures.residualMaxMw !== null &&
    dayFigures.surplusGwh !== null
      ? quietCopy({
          load: textPair((language) => gwh(dayFigures.loadGwh, language)),
          wind: textPair((language) => gwh(dayFigures.windSolarGwh, language)),
          share: textPair((language) => shareText(dayFigures.windSolarShare, language)),
          minGw: textPair((language) => gw(dayFigures.residualMinMw, language)),
          minTime: dayFigures.residualMinIso ? uniqueQuarterLabels([dayFigures.residualMinIso])[0] ?? "" : "",
          maxGw: textPair((language) => gw(dayFigures.residualMaxMw, language)),
          maxTime: dayFigures.residualMaxIso ? uniqueQuarterLabels([dayFigures.residualMaxIso])[0] ?? "" : "",
          surplus: textPair((language) => gwh(dayFigures.surplusGwh, language)),
          surplusGwh: dayFigures.surplusGwh,
        })
      : null;

  const surplusDate = quiet ? lastSurplusDate(input.slots, input.offshorePresent, input.endDate) : null;
  const aggregation: Copy =
    input.range === "tag"
      ? both(
          "Jede Viertelstunde, Leistung in GW. Die Achse folgt der Uhrzeit.",
          "Every quarter-hour, power in GW. The axis follows the clock time."
        )
      : input.range === "woche"
        ? both(
            "Stundenmittel der veröffentlichten Viertelstunden, Leistung in GW. Summen bleiben Viertelstunde mal 0,25 h.",
            "Hourly mean of the published quarter-hours, power in GW. Totals stay quarter-hour times 0.25 h."
          )
        : both(
            "Tagesenergie in GWh, Summe der veröffentlichten Viertelstunden mal 0,25 h. Rückblick 31 Tage.",
            "Daily energy in GWh, the sum of published quarter-hours times 0.25 h. 31-day lookback."
          );

  const fleet = input.fleet
    ? {
        powerGw: input.fleet.powerGw,
        energyGwh: input.fleet.energyGwh,
        power: textPair((language) => `${formatQuantity(input.fleet!.powerGw, language, 1)} GW`),
        energy: textPair((language) => `${formatQuantity(input.fleet!.energyGwh, language, 1)} GWh`),
      }
    : null;

  const residualDays: ResidualDay[] = [];
  const byDate = new Map<string, ResidualDay["slots"]>();
  for (const slot of window) {
    const windOn = slot.carriers.windOnshore;
    const windOff = input.offshorePresent ? slot.carriers.windOffshore : 0;
    const solar = slot.carriers.solar;
    if (slot.loadMw === null || windOn === null || solar === null || (input.offshorePresent && slot.carriers.windOffshore === null)) {
      continue;
    }
    const list = byDate.get(slot.dateBerlin) ?? [];
    list.push({
      timestampIso: slot.timestampIso,
      hourBerlin: slot.hourBerlin,
      minuteBerlin: slot.minuteBerlin,
      loadMw: slot.loadMw,
      windMw: windOn + (windOff ?? 0),
      solarMw: solar,
    });
    byDate.set(slot.dateBerlin, list);
  }
  for (const [dateBerlin, slots] of byDate) {
    residualDays.push({ dateBerlin, slots });
  }

  const soc = {} as Record<LiveDispatchFactor, SocSample[]>;
  for (const factor of LIVE_DISPATCH_FACTORS) {
    const chain =
      fleet === null
        ? []
        : chainFleetSoc(residualDays, fleet.powerGw * factor * 1000, fleet.energyGwh * factor * 1000).points;
    soc[factor] =
      chain.length === 0
        ? []
        : points.map((point) => {
            const sample = socAt(chain, point.unix, bucketEnd(point.unix, input.range));
            return (
              sample ?? {
                unix: point.unix,
                socPct: CHAIN_SOC_MIN * 100,
                socGwh: (fleet?.energyGwh ?? 0) * factor * CHAIN_SOC_MIN,
              }
            );
          });
  }

  const description = both(
    `Erzeugung nach Träger, Last, Residuallast und Handelssaldo, ${unit}. ${aggregation.de}`,
    `Generation by carrier, load, residual load and cross-border balance, ${unit}. ${aggregation.en}`
  );

  return {
    range: input.range,
    unit,
    aggregation,
    periodTitle: open ? both("Zeitraum bisher", "Period so far") : both("Zeitraum", "Period"),
    until,
    links: (["tag", "woche", "monat"] as const).map((id) => ({
      id,
      href: boardHref(input.path, id, input.tag),
      label: id === "tag" ? both("Tag", "Day") : id === "woche" ? both("Woche", "Week") : both("Monat", "Month"),
      current: id === input.range,
    })),
    points,
    rows,
    quiet,
    lastSurplus: surplusDate
      ? { href: boardHref(input.path, "tag", surplusDate), label: dateLabel(surplusDate) }
      : null,
    fleet,
    soc,
    startSocPct: CHAIN_SOC_MIN * 100,
    stale: input.stale,
    description,
  };
}

export const BOARD_ROUND_TRIP = MORE_STORAGE_ROUND_TRIP;
