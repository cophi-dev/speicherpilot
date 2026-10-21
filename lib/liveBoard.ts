import { getBerlinDateKeyFromUnixSeconds } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";

/**
 * Reading aid for the published day-ahead spread. Not a trading rule.
 * Green when any quarter-hour is below zero. Yellow when the high-low gap
 * reaches the threshold and every price stays at or above zero. Red when the
 * published curve is tight.
 */
export const LIVE_PRICE_CONFIG = {
  spreadYellowEurPerMwh: 50,
} as const;

export type LiveCopy = { de: string; en: string };

export type PriceLight = "green" | "yellow" | "red";

export type QuarterPoint = { unixMs: number; value: number | null };

export type LiveLevelId =
  | "regelzone-50hertz"
  | "offshore-50hertz-tennet"
  | "gebotszone-de-lu"
  | "regelzone-50hertz-transnetbw"
  | "deutschland"
  | "keine-reihe";

const LEVEL: Record<LiveLevelId, LiveCopy> = {
  "regelzone-50hertz": { de: "Regelzone 50Hertz", en: "50Hertz control area" },
  "offshore-50hertz-tennet": { de: "Wind auf See · Regelzone 50Hertz und TenneT", en: "Offshore wind · 50Hertz and TenneT control areas" },
  "gebotszone-de-lu": { de: "Gebotszone DE-LU", en: "DE-LU bidding zone" },
  "regelzone-50hertz-transnetbw": { de: "Regelzone 50Hertz und TransnetBW", en: "50Hertz and TransnetBW control areas" },
  deutschland: { de: "Deutschland", en: "Germany" },
  "keine-reihe": { de: "Keine freie Reihe", en: "No free series" },
};

export function liveLevel(id: LiveLevelId): LiveCopy {
  return LEVEL[id];
}

export function berlinClock(unixMs: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Berlin",
  }).format(new Date(unixMs));
}

export function berlinDateKey(unixMs: number): string {
  return getBerlinDateKeyFromUnixSeconds(Math.floor(unixMs / 1000));
}

/** Latest timestamp where every required series has a finite number. Missing values are not treated as zero. */
export function alignLatest(
  columns: Record<string, QuarterPoint[]>,
  required: string[]
): { unixMs: number; values: Record<string, number> } | null {
  if (required.length === 0) {
    return null;
  }
  const maps = new Map<string, Map<number, number>>();
  for (const id of required) {
    const map = new Map<number, number>();
    for (const point of columns[id] ?? []) {
      if (point.value !== null && Number.isFinite(point.value)) {
        map.set(point.unixMs, point.value);
      }
    }
    maps.set(id, map);
  }
  const first = maps.get(required[0]);
  if (!first) {
    return null;
  }
  let best: number | null = null;
  for (const stamp of first.keys()) {
    const complete = required.every((id) => maps.get(id)?.has(stamp));
    if (complete && (best === null || stamp > best)) {
      best = stamp;
    }
  }
  if (best === null) {
    return null;
  }
  const values: Record<string, number> = {};
  for (const id of required) {
    values[id] = maps.get(id)?.get(best) ?? 0;
  }
  return { unixMs: best, values };
}

export function pointsOnBerlinDay(points: QuarterPoint[], dateKey: string): Array<{ unixMs: number; value: number }> {
  const finite: Array<{ unixMs: number; value: number }> = [];
  for (const point of points) {
    if (point.value === null || !Number.isFinite(point.value)) {
      continue;
    }
    if (berlinDateKey(point.unixMs) !== dateKey) {
      continue;
    }
    finite.push({ unixMs: point.unixMs, value: point.value });
  }
  finite.sort((a, b) => a.unixMs - b.unixMs);
  return finite;
}

export type WindSolarReading = {
  unixMs: number;
  windOnMw: number;
  windOffMw: number;
  pvMw: number;
  loadMw: number;
  windSolarMw: number;
  shareOfLoadPct: number;
};

export function windSolarReading(input: {
  unixMs: number;
  windOnMw: number;
  windOffMw: number;
  pvMw: number;
  loadMw: number;
}): WindSolarReading | null {
  if (input.loadMw <= 0) {
    return null;
  }
  const windSolarMw = input.windOnMw + input.windOffMw + input.pvMw;
  return {
    ...input,
    windSolarMw,
    shareOfLoadPct: (windSolarMw / input.loadMw) * 100,
  };
}

export type PriceReading = {
  negativeQuarterHours: number;
  quarterHours: number;
  minEurPerMwh: number;
  minUnixMs: number;
  maxEurPerMwh: number;
  maxUnixMs: number;
  spreadEurPerMwh: number;
  light: PriceLight;
};

export function assessDayAheadPrices(points: Array<{ unixMs: number; eurPerMwh: number }>): PriceReading | null {
  if (points.length === 0) {
    return null;
  }
  let min = points[0];
  let max = points[0];
  let negative = 0;
  for (const point of points) {
    if (point.eurPerMwh < 0) {
      negative += 1;
    }
    if (point.eurPerMwh < min.eurPerMwh || (point.eurPerMwh === min.eurPerMwh && point.unixMs < min.unixMs)) {
      min = point;
    }
    if (point.eurPerMwh > max.eurPerMwh || (point.eurPerMwh === max.eurPerMwh && point.unixMs < max.unixMs)) {
      max = point;
    }
  }
  const spread = max.eurPerMwh - min.eurPerMwh;
  const light: PriceLight = negative > 0 ? "green" : spread >= LIVE_PRICE_CONFIG.spreadYellowEurPerMwh ? "yellow" : "red";
  return {
    negativeQuarterHours: negative,
    quarterHours: points.length,
    minEurPerMwh: min.eurPerMwh,
    minUnixMs: min.unixMs,
    maxEurPerMwh: max.eurPerMwh,
    maxUnixMs: max.unixMs,
    spreadEurPerMwh: spread,
    light,
  };
}

export function priceLightLabel(light: PriceLight): LiveCopy {
  if (light === "green") {
    return { de: "Unter null", en: "Below zero" };
  }
  if (light === "yellow") {
    return { de: "Deutliche Spanne", en: "Clear spread" };
  }
  return { de: "Eng beieinander", en: "Close together" };
}

export type SignalCode = -1 | 0 | 1 | 2;

export function currentSignal(
  points: Array<{ unixMs: number; sharePct: number; signal: number }>,
  nowMs: number
): { unixMs: number; sharePct: number; signal: SignalCode } | null {
  let best: { unixMs: number; sharePct: number; signal: number } | null = null;
  for (const point of points) {
    if (point.unixMs > nowMs) {
      continue;
    }
    if (!best || point.unixMs > best.unixMs) {
      best = point;
    }
  }
  if (!best || ![ -1, 0, 1, 2 ].includes(best.signal)) {
    return null;
  }
  return { unixMs: best.unixMs, sharePct: best.sharePct, signal: best.signal as SignalCode };
}

export type LiveChartPoint = { unixMs: number; label: string; primary: number; secondary: number | null };

export type LiveModule = {
  id: "hertz" | "offshore" | "price" | "zones" | "germany" | "signal" | "curtailment";
  level: LiveCopy;
  title: LiveCopy;
  sentence: LiveCopy;
  takeaway: LiveCopy;
  available: boolean;
  /** German formatted fallback for paired figures such as "30 / 4". */
  value: string | null;
  figure: number | null;
  /** Plain name of the number, so the figure is not left to stand alone. */
  figureLabel: LiveCopy | null;
  digits: number;
  unit: string | null;
};

export type LiveBoard = {
  berlinDateKey: string;
  lead: LiveCopy;
  /** Two different post lines. The zone comparison is never one of them. */
  sentences: LiveCopy[];
  modules: LiveModule[];
  priceLight: PriceLight | null;
  priceLightLabel: LiveCopy | null;
  hertzChart: LiveChartPoint[];
  priceChart: LiveChartPoint[];
};

export type LiveBoardInput = {
  berlinDateKey: string;
  nowMs: number;
  hertz: {
    windOn: QuarterPoint[];
    windOff: QuarterPoint[];
    pv: QuarterPoint[];
    load: QuarterPoint[];
  } | null;
  offshore: {
    hertz: QuarterPoint[];
    tennet: QuarterPoint[];
  } | null;
  transnet: {
    windOn: QuarterPoint[];
    pv: QuarterPoint[];
    load: QuarterPoint[];
  } | null;
  prices: Array<{ unixMs: number; eurPerMwh: number }> | null;
  signal: Array<{ unixMs: number; sharePct: number; signal: number }> | null;
  germany: { unixMs: number; loadMw: number; generationMw: number | null } | null;
};

function qty(value: number, language: "de" | "en", digits: number) {
  return formatQuantity(value, language, digits);
}

function hertzCopy(reading: WindSolarReading): { sentence: LiveCopy; takeaway: LiveCopy } {
  const deShare = qty(reading.shareOfLoadPct, "de", 0);
  const enShare = qty(reading.shareOfLoadPct, "en", 0);
  const clock = berlinClock(reading.unixMs);
  return {
    sentence: {
      de: `In der Regelzone 50Hertz decken Wind und Photovoltaik um ${clock} Uhr ${deShare} % der Last. Hamburg liegt in dieser Zone. Die Zahl gilt für die ganze Zone, nicht für die Stadt.`,
      en: `In the 50Hertz control area, wind and solar cover ${enShare}% of load at ${clock}. Hamburg sits in this area. The figure is the whole area, not the city.`,
    },
    takeaway: {
      de: `In der Regelzone 50Hertz decken Wind und Photovoltaik um ${clock} Uhr ${deShare} % der Last, und die Zahl gilt für die ganze Zone, nicht für die Stadt Hamburg.`,
      en: `In the 50Hertz control area, wind and solar cover ${enShare}% of load at ${clock}, and the figure is the whole area, not the city of Hamburg.`,
    },
  };
}

function priceCopy(reading: PriceReading): { sentence: LiveCopy; takeaway: LiveCopy } {
  const deMin = qty(reading.minEurPerMwh, "de", 2);
  const enMin = qty(reading.minEurPerMwh, "en", 2);
  const deMax = qty(reading.maxEurPerMwh, "de", 2);
  const enMax = qty(reading.maxEurPerMwh, "en", 2);
  const minClock = berlinClock(reading.minUnixMs);
  const maxClock = berlinClock(reading.maxUnixMs);
  const deCount = qty(reading.negativeQuarterHours, "de", 0);
  const enCount = qty(reading.negativeQuarterHours, "en", 0);
  const hours = {
    de: `Die günstigsten Stunden liegen um ${minClock} Uhr, die höchsten Preise um ${maxClock} Uhr. Das ist die Day-Ahead-Auktion, keine Handelsempfehlung.`,
    en: `The lowest-priced hours are at ${minClock}, the highest prices at ${maxClock}. That is the day-ahead auction, not trading advice.`,
  };
  if (reading.negativeQuarterHours > 0) {
    return {
      sentence: hours,
      takeaway: {
        de: `In der Gebotszone DE-LU liegen heute ${deCount} Viertelstunden unter null, der niedrigste Preis ist ${deMin} €/MWh um ${minClock} Uhr.`,
        en: `In the DE-LU bidding zone, ${enCount} quarter-hours today are below zero, and the lowest price is ${enMin} €/MWh at ${minClock}.`,
      },
    };
  }
  return {
    sentence: hours,
    takeaway: {
      de: `Heute liegt kein Viertelstundenpreis der Gebotszone DE-LU unter null: am günstigsten ${deMin} €/MWh um ${minClock} Uhr, am teuersten ${deMax} €/MWh um ${maxClock} Uhr.`,
      en: `No quarter-hour price in the DE-LU bidding zone is below zero today: cheapest ${enMin} €/MWh at ${minClock}, dearest ${enMax} €/MWh at ${maxClock}.`,
    },
  };
}

function offshoreCopy(unixMs: number, hertzMw: number, tennetMw: number): { sentence: LiveCopy; takeaway: LiveCopy } {
  const clock = berlinClock(unixMs);
  const deHertz = qty(hertzMw, "de", 0);
  const enHertz = qty(hertzMw, "en", 0);
  const deTennet = qty(tennetMw, "de", 0);
  const enTennet = qty(tennetMw, "en", 0);
  return {
    sentence: {
      de: `Wind auf See um ${clock} Uhr: ${deHertz} MW in der Regelzone 50Hertz, angeschlossen über die Ostsee, und ${deTennet} MW in der Regelzone TenneT, angeschlossen über die Nordsee. Das ist nicht die Last von Norddeutschland.`,
      en: `Offshore wind at ${clock}: ${enHertz} MW in the 50Hertz control area, connected through the Baltic, and ${enTennet} MW in the TenneT control area, connected through the North Sea. That is not northern Germany’s load.`,
    },
    takeaway: {
      de: `Wind auf See um ${clock} Uhr: ${deHertz} MW in der Regelzone 50Hertz über die Ostsee und ${deTennet} MW in der Regelzone TenneT über die Nordsee, und das ist nicht die Last von Norddeutschland.`,
      en: `Offshore wind at ${clock}: ${enHertz} MW in the 50Hertz control area via the Baltic and ${enTennet} MW in the TenneT control area via the North Sea, and that is not northern Germany’s load.`,
    },
  };
}

function zoneCopy(unixMs: number, hertzPct: number, transnetPct: number): { sentence: LiveCopy; takeaway: LiveCopy } {
  const clock = berlinClock(unixMs);
  const deHertz = qty(hertzPct, "de", 0);
  const enHertz = qty(hertzPct, "en", 0);
  const deSouth = qty(transnetPct, "de", 0);
  const enSouth = qty(transnetPct, "en", 0);
  const line = {
    de: `Um ${clock} Uhr decken Wind und Photovoltaik ${deHertz} % der Last in der Regelzone 50Hertz und ${deSouth} % in der Regelzone TransnetBW, weil im Norden mehr Wind steht als im Süden.`,
    en: `At ${clock}, wind and solar cover ${enHertz}% of load in the 50Hertz control area and ${enSouth}% in the TransnetBW control area, because the north has more wind than the south.`,
  };
  return { sentence: line, takeaway: line };
}

function germanyCopy(input: { unixMs: number; loadMw: number; generationMw: number | null }): { sentence: LiveCopy; takeaway: LiveCopy } {
  const clock = berlinClock(input.unixMs);
  if (input.generationMw === null) {
    const sentence = {
      de: `Für Deutschland liegt um ${clock} Uhr keine gemeinsame Erzeugungs- und Lastzahl vor. Es wird kein Defizit aus 0 GW gerechnet.`,
      en: `Germany has no generation figure paired with load at ${clock}. No deficit is calculated from 0 GW.`,
    };
    return {
      sentence,
      takeaway: {
        de: `Für Deutschland liegt um ${clock} Uhr keine gemeinsame Erzeugungs- und Lastzahl vor, und es wird kein Defizit aus 0 GW gerechnet.`,
        en: `Germany has no generation figure paired with load at ${clock}, and no deficit is calculated from 0 GW.`,
      },
    };
  }
  const netMw = input.generationMw - input.loadMw;
  const deNet = qty(Math.abs(netMw) / 1000, "de", 2);
  const enNet = qty(Math.abs(netMw) / 1000, "en", 2);
  const deWord = netMw >= 0 ? "mehr" : "weniger";
  const enWord = netMw >= 0 ? "more" : "less";
  return {
    sentence: {
      de: `Deutschland erzeugt um ${clock} Uhr ${deNet} GW ${deWord} als die Last. Das ist das Land, nicht Hamburg und nicht die Regelzone 50Hertz.`,
      en: `At ${clock}, Germany generates ${enNet} GW ${enWord} than its load. That is the country, not Hamburg and not the 50Hertz control area.`,
    },
    takeaway: {
      de: `Deutschland erzeugt um ${clock} Uhr ${deNet} GW ${deWord} als die Last, und das ist das Land, nicht Hamburg und nicht die Regelzone 50Hertz.`,
      en: `At ${clock}, Germany generates ${enNet} GW ${enWord} than its load, and that is the country, not Hamburg and not the 50Hertz control area.`,
    },
  };
}

function signalCopy(reading: { unixMs: number; sharePct: number; signal: SignalCode }): { sentence: LiveCopy; takeaway: LiveCopy } {
  const clock = berlinClock(reading.unixMs);
  const deShare = qty(reading.sharePct, "de", 0);
  const enShare = qty(reading.sharePct, "en", 0);
  if (reading.signal === -1) {
    return {
      sentence: {
        de: `Energy-Charts setzt um ${clock} Uhr für Deutschland die Stufe minus eins, bei ${deShare} % erneuerbarem Anteil an der Last. Das ist ihre Kategorie für das Land, kein Befund für Hamburg.`,
        en: `Energy-Charts sets Germany to step minus one at ${clock}, with renewables at ${enShare}% of load. That is their category for the country, not a finding for Hamburg.`,
      },
      takeaway: {
        de: `Energy-Charts setzt um ${clock} Uhr für Deutschland die Stufe minus eins, bei ${deShare} % erneuerbarem Anteil an der Last, und das ist kein Befund für Hamburg.`,
        en: `Energy-Charts sets Germany to step minus one at ${clock}, with renewables at ${enShare}% of load, and that is not a finding for Hamburg.`,
      },
    };
  }
  const deBand = reading.signal === 2 ? "hoch" : reading.signal === 1 ? "mittel" : "niedrig";
  const enBand = reading.signal === 2 ? "high" : reading.signal === 1 ? "average" : "low";
  return {
    sentence: {
      de: `Energy-Charts nennt den erneuerbaren Anteil an der Last in Deutschland um ${clock} Uhr ${deBand}: ${deShare} %. Spätere Stunden in dieser Reihe können eine Prognose sein.`,
      en: `Energy-Charts calls Germany’s renewable share of load ${enBand} at ${clock}: ${enShare}%. Later hours in this series can be a forecast.`,
    },
    takeaway: {
      de: `Energy-Charts nennt den erneuerbaren Anteil an der Last in Deutschland um ${clock} Uhr ${deBand}, ${deShare} %, und spätere Stunden können eine Prognose sein.`,
      en: `Energy-Charts calls Germany’s renewable share of load ${enBand} at ${clock}, ${enShare}%, and later hours can be a forecast.`,
    },
  };
}

const CURTAILMENT: LiveModule = {
  id: "curtailment",
  level: LEVEL["keine-reihe"],
  title: { de: "Abregelung und Redispatch", en: "Curtailment and redispatch" },
  available: false,
  value: null,
  figure: null,
  figureLabel: null,
  digits: 0,
  unit: null,
  sentence: {
    de: "Für heute liegt keine freie Viertelstundenreihe der Abregelung oder des Redispatch für Hamburg oder für die Regelzone 50Hertz. Netztransparenz veröffentlicht diese Mengen, der Maschinenabruf braucht einen registrierten Zugang. Hier steht deshalb keine Megawattzahl.",
    en: "There is no free quarter-hour series of curtailment or redispatch for Hamburg or the 50Hertz control area today. Netztransparenz publishes those volumes, and the machine feed needs a registered login. So there is no megawatt figure here.",
  },
  takeaway: {
    de: "Abregelung und Redispatch von heute stehen hier nicht als Zahl, weil keine freie Maschinenreihe für Hamburg oder die Regelzone 50Hertz angebunden ist.",
    en: "Today’s curtailment and redispatch are not shown as a number, because no free machine series for Hamburg or the 50Hertz control area is connected.",
  },
};

function chartFrom(dayPoints: Array<{ unixMs: number; primary: number; secondary: number | null }>): LiveChartPoint[] {
  return dayPoints.map((point) => ({
    unixMs: point.unixMs,
    label: berlinClock(point.unixMs),
    primary: point.primary,
    secondary: point.secondary,
  }));
}

export function buildLiveBoard(input: LiveBoardInput): LiveBoard {
  const modules: LiveModule[] = [];
  let hertzReading: WindSolarReading | null = null;
  let priceReading: PriceReading | null = null;
  let hertzChart: LiveChartPoint[] = [];
  let priceChart: LiveChartPoint[] = [];

  if (input.hertz) {
    const aligned = alignLatest(
      {
        windOn: input.hertz.windOn,
        windOff: input.hertz.windOff,
        pv: input.hertz.pv,
        load: input.hertz.load,
      },
      ["windOn", "windOff", "pv", "load"]
    );
    if (aligned && berlinDateKey(aligned.unixMs) === input.berlinDateKey) {
      hertzReading = windSolarReading({
        unixMs: aligned.unixMs,
        windOnMw: aligned.values.windOn,
        windOffMw: aligned.values.windOff,
        pvMw: aligned.values.pv,
        loadMw: aligned.values.load,
      });
    }
    const load = pointsOnBerlinDay(input.hertz.load, input.berlinDateKey);
    const windOn = new Map(pointsOnBerlinDay(input.hertz.windOn, input.berlinDateKey).map((point) => [point.unixMs, point.value]));
    const windOff = new Map(pointsOnBerlinDay(input.hertz.windOff, input.berlinDateKey).map((point) => [point.unixMs, point.value]));
    const pv = new Map(pointsOnBerlinDay(input.hertz.pv, input.berlinDateKey).map((point) => [point.unixMs, point.value]));
    hertzChart = chartFrom(
      load.flatMap((point) => {
        const on = windOn.get(point.unixMs);
        const off = windOff.get(point.unixMs);
        const solar = pv.get(point.unixMs);
        if (on === undefined || off === undefined || solar === undefined) {
          return [];
        }
        return [{ unixMs: point.unixMs, primary: point.value, secondary: on + off + solar }];
      })
    );
  }

  if (hertzReading) {
    const copy = hertzCopy(hertzReading);
    modules.push({
      id: "hertz",
      level: LEVEL["regelzone-50hertz"],
      title: { de: "Wind und Photovoltaik", en: "Wind and solar" },
      sentence: copy.sentence,
      takeaway: copy.takeaway,
      available: true,
      value: qty(hertzReading.shareOfLoadPct, "de", 0),
      figure: hertzReading.shareOfLoadPct,
      figureLabel: { de: "Anteil an der Last", en: "Share of load" },
      digits: 0,
      unit: "%",
    });
  }

  if (input.offshore) {
    const aligned = alignLatest(
      { hertz: input.offshore.hertz, tennet: input.offshore.tennet },
      ["hertz", "tennet"]
    );
    if (aligned && berlinDateKey(aligned.unixMs) === input.berlinDateKey) {
      const copy = offshoreCopy(aligned.unixMs, aligned.values.hertz, aligned.values.tennet);
      modules.push({
        id: "offshore",
        level: LEVEL["offshore-50hertz-tennet"],
        title: { de: "Wind auf See", en: "Offshore wind" },
        sentence: copy.sentence,
        takeaway: copy.takeaway,
        available: true,
        value: qty(aligned.values.hertz + aligned.values.tennet, "de", 0),
        figure: aligned.values.hertz + aligned.values.tennet,
        figureLabel: { de: "Beide Reihen zusammen", en: "Both series together" },
        digits: 0,
        unit: "MW",
      });
    }
  }

  const pricePoints = (input.prices ?? []).filter((point) => berlinDateKey(point.unixMs) === input.berlinDateKey);
  priceReading = assessDayAheadPrices(pricePoints.map((point) => ({ unixMs: point.unixMs, eurPerMwh: point.eurPerMwh })));
  if (priceReading) {
    const copy = priceCopy(priceReading);
    modules.push({
      id: "price",
      level: LEVEL["gebotszone-de-lu"],
      title: { de: "Preise der Day-Ahead-Auktion", en: "Day-ahead auction prices" },
      sentence: copy.sentence,
      takeaway: copy.takeaway,
      available: true,
      value: qty(priceReading.minEurPerMwh, "de", 2),
      figure: priceReading.minEurPerMwh,
      figureLabel: { de: "Niedrigster Preis", en: "Lowest price" },
      digits: 2,
      unit: "€/MWh",
    });
    priceChart = chartFrom(pricePoints.map((point) => ({ unixMs: point.unixMs, primary: point.eurPerMwh, secondary: null })));
  }

  if (hertzReading && input.transnet && input.hertz) {
    const aligned = alignLatest(
      {
        hertzWind: input.hertz.windOn,
        hertzOff: input.hertz.windOff,
        hertzPv: input.hertz.pv,
        hertzLoad: input.hertz.load,
        southWind: input.transnet.windOn,
        southPv: input.transnet.pv,
        southLoad: input.transnet.load,
      },
      ["hertzWind", "hertzOff", "hertzPv", "hertzLoad", "southWind", "southPv", "southLoad"]
    );
    if (aligned && berlinDateKey(aligned.unixMs) === input.berlinDateKey) {
      const north = windSolarReading({
        unixMs: aligned.unixMs,
        windOnMw: aligned.values.hertzWind,
        windOffMw: aligned.values.hertzOff,
        pvMw: aligned.values.hertzPv,
        loadMw: aligned.values.hertzLoad,
      });
      const south = windSolarReading({
        unixMs: aligned.unixMs,
        windOnMw: aligned.values.southWind,
        windOffMw: 0,
        pvMw: aligned.values.southPv,
        loadMw: aligned.values.southLoad,
      });
      if (north && south) {
        const copy = zoneCopy(aligned.unixMs, north.shareOfLoadPct, south.shareOfLoadPct);
        modules.push({
          id: "zones",
          level: LEVEL["regelzone-50hertz-transnetbw"],
          title: { de: "Mehr Wind im Norden", en: "More wind in the north" },
          sentence: copy.sentence,
          takeaway: copy.takeaway,
          available: true,
          value: `${qty(north.shareOfLoadPct, "de", 0)} / ${qty(south.shareOfLoadPct, "de", 0)}`,
          figure: null,
          figureLabel: { de: "Anteil 50Hertz / TransnetBW", en: "50Hertz / TransnetBW share" },
          digits: 0,
          unit: "%",
        });
      }
    }
  }

  if (input.germany && berlinDateKey(input.germany.unixMs) === input.berlinDateKey) {
    const copy = germanyCopy(input.germany);
    const net = input.germany.generationMw === null ? null : (input.germany.generationMw - input.germany.loadMw) / 1000;
    modules.push({
      id: "germany",
      level: LEVEL.deutschland,
      title: { de: "Erzeugung gegen Last", en: "Generation against load" },
      sentence: copy.sentence,
      takeaway: copy.takeaway,
      available: input.germany.generationMw !== null,
      value: net === null ? null : qty(net, "de", 2),
      figure: net,
      figureLabel: net === null
        ? { de: "Keine gemeinsame Zahl", en: "No paired figure" }
        : { de: "Erzeugung minus Last", en: "Generation minus load" },
      digits: 2,
      unit: net === null ? null : "GW",
    });
  }

  const signal = input.signal ? currentSignal(input.signal, input.nowMs) : null;
  if (signal && berlinDateKey(signal.unixMs) === input.berlinDateKey) {
    const copy = signalCopy(signal);
    modules.push({
      id: "signal",
      level: LEVEL.deutschland,
      title: { de: "Erneuerbaren-Anteil", en: "Renewable share" },
      sentence: copy.sentence,
      takeaway: copy.takeaway,
      available: true,
      value: qty(signal.sharePct, "de", 0),
      figure: signal.sharePct,
      figureLabel: { de: "Anteil an der Last", en: "Share of load" },
      digits: 0,
      unit: "%",
    });
  }

  modules.push(CURTAILMENT);

  const priceModule = modules.find((entry) => entry.id === "price");
  const hertzModule = modules.find((entry) => entry.id === "hertz");
  const lead = priceReading && priceReading.negativeQuarterHours > 0 && priceModule
    ? priceModule.takeaway
    : hertzReading && hertzReading.shareOfLoadPct >= 70 && hertzModule
      ? hertzModule.takeaway
      : priceModule
        ? priceModule.takeaway
        : hertzModule
          ? hertzModule.takeaway
          : CURTAILMENT.takeaway;
  const second = lead.de === priceModule?.takeaway.de
    ? hertzModule?.takeaway
    : lead.de === hertzModule?.takeaway.de
      ? priceModule?.takeaway
      : hertzModule?.takeaway ?? priceModule?.takeaway;
  const sentences = [lead, second].filter((line): line is LiveCopy => line !== undefined && line.de !== "");
  const unique: LiveCopy[] = [];
  for (const line of sentences) {
    if (!unique.some((kept) => kept.de === line.de)) {
      unique.push(line);
    }
  }

  return {
    berlinDateKey: input.berlinDateKey,
    lead,
    sentences: unique,
    modules,
    priceLight: priceReading?.light ?? null,
    priceLightLabel: priceReading ? priceLightLabel(priceReading.light) : null,
    hertzChart,
    priceChart,
  };
}

export const LIVE_SOURCE_TABLE: Array<{
  module: LiveCopy;
  level: LiveCopy;
  latency: LiveCopy;
  licence: string;
  href: string;
}> = [
  {
    module: { de: "Wind, Photovoltaik, Last", en: "Wind, solar, load" },
    level: LEVEL["regelzone-50hertz"],
    latency: { de: "Viertelstunde, letzte vollständige Messung, oft etwa eine Stunde zurück", en: "Quarter-hour, latest complete measurement, often about an hour behind" },
    licence: "CC BY 4.0 · Bundesnetzagentur | SMARD.de",
    href: "https://www.smard.de/en/datennutzung",
  },
  {
    module: { de: "Wind auf See", en: "Offshore wind" },
    level: LEVEL["offshore-50hertz-tennet"],
    latency: { de: "Viertelstunde, letzte gemeinsame Messung beider Zonen", en: "Quarter-hour, latest measurement present in both areas" },
    licence: "CC BY 4.0 · Bundesnetzagentur | SMARD.de",
    href: "https://www.smard.de/en/datennutzung",
  },
  {
    module: { de: "Zwei Regelzonen", en: "Two control areas" },
    level: LEVEL["regelzone-50hertz-transnetbw"],
    latency: { de: "Viertelstunde, letzte gemeinsame Messung. TransnetBW ohne Offshore-Reihe", en: "Quarter-hour, latest shared measurement. TransnetBW has no offshore series" },
    licence: "CC BY 4.0 · Bundesnetzagentur | SMARD.de",
    href: "https://www.smard.de/en/datennutzung",
  },
  {
    module: { de: "Day-Ahead-Preis", en: "Day-ahead price" },
    level: LEVEL["gebotszone-de-lu"],
    latency: { de: "Auktion für den ganzen Berliner Tag, 15 Minuten", en: "Auction for the whole Berlin day, 15 minutes" },
    licence: "CC BY 4.0 · Bundesnetzagentur | SMARD.de, abgerufen über energy-charts.info",
    href: "https://api.energy-charts.info/v2/price?bzn=DE-LU",
  },
  {
    module: { de: "Erneuerbaren-Anteil", en: "Renewable share" },
    level: LEVEL.deutschland,
    latency: { de: "Energy-Charts-Signal, laufende Stunde gemessen, spätere Stunden können Prognose sein", en: "Energy-Charts signal, current hour measured, later hours can be a forecast" },
    licence: "CC BY 4.0 · energy-charts.info",
    href: "https://api.energy-charts.info/v2/signal?country=de",
  },
  {
    module: { de: "Erzeugung gegen Last", en: "Generation against load" },
    level: LEVEL.deutschland,
    latency: { de: "Viertelstunde, nur wenn Erzeugung und Last derselben Viertelstunde vorliegen", en: "Quarter-hour, only when generation and load exist for the same interval" },
    licence: "CC BY 4.0 · energy-charts.info",
    href: "https://api.energy-charts.info/v2/total_power?country=de",
  },
  {
    module: { de: "Abregelung und Redispatch", en: "Curtailment and redispatch" },
    level: LEVEL["keine-reihe"],
    latency: { de: "Netztransparenz-API, hier nicht angebunden", en: "Netztransparenz API, not connected here" },
    licence: "Registrierter Zugang bei netztransparenz.de, keine Zahl auf dieser Seite",
    href: "https://www.netztransparenz.de/",
  },
];
