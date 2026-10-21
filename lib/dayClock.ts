import type { ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_H = 0.25;

export type ClockSample = {
  hour: number;
  loadGw: number;
  windSolarGw: number;
  surplus: boolean;
};

export type ClockRun = {
  fromHour: number;
  toHour: number;
};

export type DayClockView = {
  dateBerlin: string;
  dateLabel: { de: string; en: string };
  partial: boolean;
  empty: boolean;
  /** Draw the 23:45 sample through to 24:00 with the 00:00 value only when both exist. */
  closeMidnight: boolean;
  samples: ClockSample[];
  surplusHours: number;
  surplusGwh: number;
  /** Longest contiguous surplus run. Null when today has none. */
  surplusRun: ClockRun | null;
  maxGw: number;
  /** 20 and 40 GW, then further 20 GW steps that still sit inside the day's maximum. */
  ringGw: number[];
  headline: { de: string; en: string };
  fleetEnergyGwh: number | null;
  fleetLabel: { de: string; en: string } | null;
  /** Fleet capacity divided by today's surplus. A size comparison, not stored energy. */
  fleetShare: number | null;
  source: { de: string; en: string };
  energyChartsUrl: string;
  batteryChartsUrl: string;
};

export type DayClockInput = {
  dateBerlin: string;
  slots: readonly ResidualSlot[];
  fleet: { energyGwh: number; updatedLabel: { de: string; en: string } } | null;
};

/**
 * Area-true radius. The ring between the hole and `gw` has area proportional to `gw`.
 * `R = sqrt(R0² + (gw / maxGw) · (Rmax² − R0²))`.
 */
export function clockRadius(gw: number, maxGw: number, hole: number, outer: number): number {
  if (maxGw <= 0 || gw <= 0) {
    return hole;
  }
  const t = Math.min(1, gw / maxGw);
  return Math.sqrt(hole * hole + t * (outer * outer - hole * hole));
}

export function clockRings(maxGw: number): number[] {
  const rings: number[] = [];
  if (maxGw >= 20) {
    rings.push(20);
  }
  if (maxGw >= 40) {
    rings.push(40);
  }
  if (maxGw > 40) {
    for (let gw = 60; gw <= maxGw + 1e-6; gw += 20) {
      rings.push(gw);
    }
  }
  return rings;
}

/** Split on missing quarter-hours. A gap is not drawn across. */
export function clockRuns(samples: readonly ClockSample[]): ClockSample[][] {
  const runs: ClockSample[][] = [];
  let current: ClockSample[] = [];
  for (const sample of samples) {
    const previous = current[current.length - 1];
    if (previous && sample.hour - previous.hour > QUARTER_H + 1e-6) {
      runs.push(current);
      current = [];
    }
    current.push(sample);
  }
  if (current.length > 0) {
    runs.push(current);
  }
  return runs;
}

export function longestSurplusRun(samples: readonly ClockSample[]): ClockRun | null {
  let best: ClockRun | null = null;
  let bestHours = 0;
  let start: ClockSample | null = null;
  let last: ClockSample | null = null;
  let count = 0;

  function close() {
    if (start && last && count > bestHours) {
      bestHours = count;
      best = { fromHour: start.hour, toHour: last.hour + QUARTER_H };
    }
    start = null;
    last = null;
    count = 0;
  }

  for (const sample of samples) {
    const continues = last !== null && sample.hour - last.hour <= QUARTER_H + 1e-6;
    if (sample.surplus && (start === null || continues)) {
      start = start ?? sample;
      last = sample;
      count += 1;
    } else if (sample.surplus) {
      close();
      start = sample;
      last = sample;
      count = 1;
    } else {
      close();
    }
  }
  close();
  return best;
}

function fractionDigits(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return 0;
  }
  if (Math.abs(rounded * 10 - Math.round(rounded * 10)) < 1e-9) {
    return 1;
  }
  return 2;
}

export function formatClockHours(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    minimumFractionDigits: fractionDigits(value),
    maximumFractionDigits: fractionDigits(value),
  }).format(value);
}

function dateLabel(dateBerlin: string, language: "de" | "en"): string {
  const [year, month, day] = dateBerlin.split("-").map(Number);
  if (!year || !month || !day) {
    return dateBerlin;
  }
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function quarterKey(hour: number): number {
  return Math.round(hour * 4);
}

/**
 * Today's Germany clock. Wind onshore + offshore + solar against load.
 * A day without surplus stays today: the centre reads 0 h. No archive day is substituted.
 */
export function buildDayClock(input: DayClockInput): DayClockView {
  const byQuarter = new Map<number, ClockSample>();
  for (const slot of input.slots) {
    const hour = slot.hourBerlin + slot.minuteBerlin / 60;
    const loadGw = slot.loadMw / 1000;
    const windSolarGw = (slot.windMw + slot.solarMw) / 1000;
    byQuarter.set(quarterKey(hour), {
      hour: quarterKey(hour) / 4,
      loadGw,
      windSolarGw,
      surplus: windSolarGw > loadGw,
    });
  }
  const samples = [...byQuarter.values()].sort((left, right) => left.hour - right.hour);
  const surplusQuarters = samples.filter((sample) => sample.surplus).length;
  const surplusHours = surplusQuarters / 4;
  const surplusGwh = samples.reduce(
    (sum, sample) => sum + Math.max(0, sample.windSolarGw - sample.loadGw) * QUARTER_H,
    0
  );
  const maxGw = samples.reduce((max, sample) => Math.max(max, sample.loadGw, sample.windSolarGw), 0);
  const empty = samples.length === 0;
  const partial = samples.length < 96;
  const closeMidnight = byQuarter.has(0) && byQuarter.has(95);
  const fleetEnergyGwh = input.fleet && input.fleet.energyGwh > 0 ? input.fleet.energyGwh : null;
  const fleetShare = fleetEnergyGwh !== null && surplusGwh > 0 ? fleetEnergyGwh / surplusGwh : null;
  const when = dateLabel(input.dateBerlin, "de");
  const whenEn = dateLabel(input.dateBerlin, "en");
  const fleetDe = input.fleet ? ` Große Speicher: Battery Charts, Stand ${input.fleet.updatedLabel.de}.` : "";
  const fleetEn = input.fleet ? ` Large storage: Battery Charts, as of ${input.fleet.updatedLabel.en}.` : "";

  let headline: { de: string; en: string };
  if (empty) {
    headline = {
      de: "Die Viertelstunden von heute sind noch nicht da.",
      en: "Today's quarter-hours are not in yet.",
    };
  } else if (surplusHours >= QUARTER_H) {
    const deHours = formatClockHours(surplusHours, "de");
    const enHours = formatClockHours(surplusHours, "en");
    headline = partial
      ? {
          de: `Bis jetzt ${deHours} Stunden lang mehr Wind und Sonne als der Verbrauch.`,
          en: `So far, wind and solar have beaten demand for ${enHours} hours.`,
        }
      : {
          de: `${deHours} Stunden lang mehr Wind und Sonne als der Verbrauch.`,
          en: `Wind and solar beat demand for ${enHours} hours.`,
        };
  } else {
    headline = partial
      ? { de: "Bis jetzt kein Überschuss.", en: "No surplus so far." }
      : { de: "Heute kein Überschuss.", en: "No surplus today." };
  }

  return {
    dateBerlin: input.dateBerlin,
    dateLabel: { de: when, en: whenEn },
    partial,
    empty,
    closeMidnight,
    samples,
    surplusHours,
    surplusGwh,
    surplusRun: longestSurplusRun(samples),
    maxGw,
    ringGw: clockRings(maxGw),
    headline,
    fleetEnergyGwh,
    fleetLabel: input.fleet?.updatedLabel ?? null,
    fleetShare,
    source: {
      de: `Energy-Charts (Fraunhofer ISE), öffentliche Nettostromerzeugung Deutschland, ${when}, Viertelstunde, CC BY 4.0.${fleetDe}`,
      en: `Energy-Charts (Fraunhofer ISE), public net generation for Germany, ${whenEn}, quarter-hours, CC BY 4.0.${fleetEn}`,
    },
    energyChartsUrl: "https://www.energy-charts.info/charts/power/chart.htm?l=de&c=DE",
    batteryChartsUrl: "https://battery-charts.de/de/battery-charts-de/",
  };
}
