import { formatQuantity } from "@/lib/formatQuantity";
import type { LargeBatteryFleet } from "@/lib/largeBatteryFleet";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

const QUARTER_H = 0.25;

type Copy = { de: string; en: string };

export type HeutePoint = {
  /** Hours from Berlin midnight, start of the quarter-hour. */
  hour: number;
  residualGw: number;
  surplus: boolean;
};

export type HeuteAnnotation = {
  n: number;
  hour: number;
  /** Where the numbered mark sits. */
  atHour: number;
  residualGw: number;
  label: Copy;
};

export type HeuteTickerItem = {
  id: string;
  label: Copy;
  value: string;
};

export type HeuteImNetz = {
  dateBerlin: string;
  nowHour: number;
  clock: string;
  partial: boolean;
  empty: boolean;
  points: HeutePoint[];
  axis: { min: number; max: number; ticks: number[] };
  /** Big figure in the headline. Null when the sentence has no single number. */
  figureValue: number | null;
  figureDigits: number;
  figureUnit: Copy | null;
  headline: Copy;
  detail: Copy;
  annotations: HeuteAnnotation[];
  surplusGwh: number;
  surplusHours: number;
  windowLabel: string | null;
  fleetEnergyGwh: number | null;
  fleetLabel: Copy | null;
  fleetHref: string | null;
  /** Fleet energy divided by today's surplus. Null when there is no surplus or no fleet. */
  fleetShare: number | null;
  ticker: HeuteTickerItem[];
  source: Copy;
};

function both(build: (language: "de" | "en") => string): Copy {
  return { de: build("de"), en: build("en") };
}

function quantity(value: number, digits: number): Copy {
  return both((language) => formatQuantity(value, language, digits));
}

function hourDigits(hours: number): number {
  if (Number.isInteger(hours)) return 0;
  if (hours < 1) return 2;
  return 1;
}

function gwDigits(value: number): number {
  return Math.abs(value) >= 10 ? 0 : 1;
}

export function berlinHourFraction(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (Number.isFinite(hour) ? hour % 24 : 0) + (Number.isFinite(minute) ? minute : 0) / 60;
}

export function berlinClockLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

function slotHour(slot: ResidualSlot): number {
  return slot.hourBerlin + slot.minuteBerlin / 60;
}

function residualGw(slot: ResidualSlot): number {
  return (slot.loadMw - slot.windMw - slot.solarMw) / 1000;
}

/** Step that is 1, 2 or 5 times a power of ten, and that lands on zero. */
export function niceStep(span: number): number {
  const rough = Math.max(span, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / mag;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * mag;
}

export function niceAxis(minValue: number, maxValue: number): { min: number; max: number; ticks: number[] } {
  const step = niceStep(maxValue - minValue);
  const min = Math.floor(minValue / step) * step;
  const max = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = min; value <= max + step * 1e-6; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return { min, max: Math.max(max, min + step), ticks };
}

function hm(hour: number): string {
  let whole = Math.floor(hour);
  let minute = Math.round((hour - whole) * 60);
  if (minute === 60) {
    whole += 1;
    minute = 0;
  }
  return `${String(whole).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

type Run = { start: number; end: number; quarters: number; deepestHour: number; deepestGw: number };

function surplusRuns(points: HeutePoint[]): Run[] {
  const runs: Run[] = [];
  let current: Run | null = null;
  for (const point of points) {
    const follows = current !== null && Math.abs(point.hour - current.end) < 0.02;
    if (point.surplus && (current === null || follows)) {
      if (current === null || !follows) {
        current = {
          start: point.hour,
          end: point.hour + QUARTER_H,
          quarters: 1,
          deepestHour: point.hour,
          deepestGw: point.residualGw,
        };
        runs.push(current);
      } else {
        current.end = point.hour + QUARTER_H;
        current.quarters += 1;
        if (point.residualGw < current.deepestGw) {
          current.deepestGw = point.residualGw;
          current.deepestHour = point.hour;
        }
      }
    } else if (!point.surplus) {
      current = null;
    }
  }
  return runs;
}

function eveningPeakGw(slots: ResidualSlot[]): number | null {
  const evening = slots.filter((slot) => slot.hourBerlin >= 17);
  if (evening.length === 0) return null;
  return Math.max(...evening.map(residualGw));
}

function tooClose(hour: number, taken: number[]): boolean {
  return taken.some((other) => Math.abs(other - hour) < 1);
}

export function buildHeuteImNetz(input: {
  now: Date;
  todayKey: string;
  today: ResidualDay | null;
  yesterday: ResidualDay | null;
  fleet: LargeBatteryFleet | null;
  hertzSharePct: number | null;
  dayAheadEurPerMwh: number | null;
}): HeuteImNetz {
  const nowHour = berlinHourFraction(input.now);
  const clock = berlinClockLabel(input.now);
  const slots = input.today?.dateBerlin === input.todayKey ? input.today.slots : [];
  const points: HeutePoint[] = slots.map((slot) => {
    const residual = residualGw(slot);
    return { hour: slotHour(slot), residualGw: residual, surplus: residual < 0 };
  });
  const surplusHours = points.filter((point) => point.surplus).length / 4;
  const surplusGwh = points.reduce(
    (sum, point) => sum + (point.surplus ? -point.residualGw * QUARTER_H : 0),
    0
  );
  const runs = surplusRuns(points);
  const longest = runs.reduce<Run | null>((best, run) => (best === null || run.quarters > best.quarters ? run : best), null);
  const windowLabel = longest && longest.quarters >= 2 ? `${hm(longest.start)}–${hm(longest.end)}` : null;

  const values = points.map((point) => point.residualGw);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 0;
  const axis = niceAxis(Math.min(0, dataMin), Math.max(0, dataMax));

  const fleetEnergy = input.fleet?.energyGwh ?? null;
  const fleetShare = fleetEnergy !== null && surplusGwh > 0.05 ? fleetEnergy / surplusGwh : null;

  const partial = points.length > 0 && points.length < 96;
  const headline = headlineFor({
    empty: points.length === 0,
    surplusHours,
    points,
    yesterday: input.yesterday,
    weak: windAndSolarStayWeak(slots),
    partial,
  });

  const annotations = annotate(points, longest);
  const load = slots.length ? slots[slots.length - 1] : null;
  const ticker: HeuteTickerItem[] = [
    { id: "clock", label: { de: "Uhrzeit", en: "Time" }, value: clock },
  ];
  if (load) {
    const share = load.loadMw > 0 ? ((load.windMw + load.solarMw) / load.loadMw) * 100 : null;
    ticker.push({
      id: "load",
      label: { de: "Last", en: "Load" },
      value: `${formatQuantity(load.loadMw / 1000, "de", 1)} GW`,
    });
    if (share !== null) {
      ticker.push({
        id: "wind",
        label: { de: "Wind + Sonne", en: "Wind + solar" },
        value: `${formatQuantity(share, "de", 0)} %`,
      });
    }
  }
  if (input.dayAheadEurPerMwh !== null) {
    ticker.push({
      id: "price",
      label: { de: "Day-Ahead", en: "Day-ahead" },
      value: `${formatQuantity(input.dayAheadEurPerMwh, "de", 0)} €/MWh`,
    });
  }
  if (input.hertzSharePct !== null) {
    ticker.push({
      id: "hertz",
      label: { de: "50Hertz", en: "50Hertz" },
      value: `${formatQuantity(input.hertzSharePct, "de", 0)} %`,
    });
  }

  const [year, month, day] = input.todayKey.split("-");
  const date = `${day}.${month}.${year}`;
  const fleetBit = input.fleet
    ? both((language) =>
        language === "de"
          ? ` Große Speicher: Battery Charts, RWTH, aus dem MaStR, Stand ${input.fleet?.updatedLabel.de}.`
          : ` Large storage: Battery Charts, RWTH, from MaStR, as of ${input.fleet?.updatedLabel.en}.`
      )
    : { de: "", en: "" };

  return {
    dateBerlin: input.todayKey,
    nowHour,
    clock,
    partial,
    empty: points.length === 0,
    points,
    axis,
    figureValue: headline.figureValue,
    figureDigits: headline.figureDigits,
    figureUnit: headline.unit,
    headline: headline.rest,
    detail: detailCopy(points.length === 0, surplusGwh, surplusHours),
    annotations,
    surplusGwh,
    surplusHours,
    windowLabel,
    fleetEnergyGwh: fleetEnergy,
    fleetLabel: input.fleet ? input.fleet.updatedLabel : null,
    fleetHref: input.fleet?.chartUrl ?? null,
    fleetShare,
    ticker,
    source: both(
      (language) =>
        language === "de"
          ? `Energy-Charts, Fraunhofer ISE, Last, Wind und Sonne, Deutschland, ${date}, Viertelstunde, CC BY 4.0.${fleetBit.de}`
          : `Energy-Charts, Fraunhofer ISE, load, wind and solar, Germany, ${date}, quarter-hour, CC BY 4.0.${fleetBit.en}`
    ),
  };
}

function detailCopy(empty: boolean, surplusGwh: number, surplusHours: number): Copy {
  if (empty) {
    return {
      de: "Für heute liegt noch keine veröffentlichte Viertelstunde von Last, Wind und Sonne vor. Es wird keine Kurve erfunden.",
      en: "No published quarter-hour of load, wind and solar is available for today yet. No curve is invented.",
    };
  }
  const gwh = quantity(surplusGwh, surplusGwh >= 10 ? 0 : 1);
  const hours = quantity(surplusHours, hourDigits(surplusHours));
  if (surplusHours <= 0) {
    return {
      de: "Die Linie ist die Residuallast: Last minus Wind minus Sonne, also was andere Kraftwerke und Import liefern müssen. Heute bleibt sie über null.",
      en: "The line is residual load: load minus wind minus solar, which is what other plants and imports have to supply. Today it stays above zero.",
    };
  }
  return {
    de: `Die Linie ist die Residuallast: Last minus Wind minus Sonne. Unter null liefern Wind und Sonne mehr, als Deutschland verbraucht. Das sind ${hours.de} Stunden und ${gwh.de} GWh.`,
    en: `The line is residual load: load minus wind minus solar. Below zero, wind and solar deliver more than Germany consumes. That is ${hours.en} hours and ${gwh.en} GWh.`,
  };
}

function headlineFor(input: {
  empty: boolean;
  surplusHours: number;
  points: HeutePoint[];
  yesterday: ResidualDay | null;
  weak: boolean;
  partial: boolean;
}): { figureValue: number | null; figureDigits: number; unit: Copy | null; rest: Copy } {
  if (input.empty) {
    return {
      figureValue: null,
      figureDigits: 0,
      unit: null,
      rest: {
        de: "Die Viertelstunden von heute sind noch nicht da.",
        en: "Today’s quarter-hours are not published yet.",
      },
    };
  }
  if (input.surplusHours >= 0.25) {
    const digits = hourDigits(input.surplusHours);
    return {
      figureValue: input.surplusHours,
      figureDigits: digits,
      unit: { de: input.surplusHours === 1 ? "Stunde" : "Stunden", en: input.surplusHours === 1 ? "hour" : "hours" },
      rest: {
        de: "lang mehr Wind und Sonne als der Verbrauch.",
        en: "of wind and solar above consumption.",
      },
    };
  }
  const todayEvening = eveningFromPoints(input.points);
  const yesterdayEvening = input.yesterday ? eveningPeakGw(input.yesterday.slots) : null;
  if (todayEvening !== null && yesterdayEvening !== null && Math.abs(todayEvening - yesterdayEvening) >= 0.5) {
    const delta = todayEvening - yesterdayEvening;
    const more = delta > 0;
    const amount = quantity(Math.abs(delta), gwDigits(delta));
    return {
      figureValue: todayEvening,
      figureDigits: gwDigits(todayEvening),
      unit: { de: "GW", en: "GW" },
      rest: {
        de: more
          ? `Abendspitze, ${amount.de} GW mehr als gestern.`
          : `Abendspitze, ${amount.de} GW weniger als gestern.`,
        en: more
          ? `evening peak, ${amount.en} GW above yesterday.`
          : `evening peak, ${amount.en} GW below yesterday.`,
      },
    };
  }
  const lead = input.partial ? "Bis jetzt kein Überschuss." : "Heute kein Überschuss.";
  const leadEn = input.partial ? "No surplus so far." : "No surplus today.";
  return {
    figureValue: null,
    figureDigits: 0,
    unit: null,
    rest: input.weak
      ? {
          de: `${lead} Wind und Sonne sind schwach.`,
          en: `${leadEn} Wind and solar are weak.`,
        }
      : {
          de: `${lead} Wind und Sonne bleiben unter der Last.`,
          en: `${leadEn} Wind and solar stay under the load.`,
        },
  };
}

function eveningFromPoints(points: HeutePoint[]): number | null {
  const evening = points.filter((point) => point.hour >= 17);
  if (evening.length === 0) return null;
  return Math.max(...evening.map((point) => point.residualGw));
}

function annotate(points: HeutePoint[], longest: Run | null): HeuteAnnotation[] {
  if (points.length === 0) return [];
  const drafts: Array<Omit<HeuteAnnotation, "n">> = [];
  const low = points.reduce((best, point) => (point.residualGw < best.residualGw ? point : best));
  const lowGw = quantity(Math.abs(low.residualGw), gwDigits(low.residualGw));
  drafts.push({
    hour: low.hour,
    atHour: low.hour,
    residualGw: low.residualGw,
    label:
      low.residualGw < 0
        ? { de: `Tief −${lowGw.de} GW`, en: `Low −${lowGw.en} GW` }
        : { de: `Tiefster Stand ${lowGw.de} GW`, en: `Day’s low ${lowGw.en} GW` },
  });

  const eveningPoints = points.filter((point) => point.hour >= 17);
  if (eveningPoints.length > 0) {
    const peak = eveningPoints.reduce((best, point) => (point.residualGw > best.residualGw ? point : best));
    if (!tooClose(peak.hour, drafts.map((item) => item.atHour))) {
      const peakGw = quantity(peak.residualGw, gwDigits(peak.residualGw));
      drafts.push({
        hour: peak.hour,
        atHour: peak.hour,
        residualGw: peak.residualGw,
        label: { de: `Abendspitze ${peakGw.de} GW`, en: `Evening peak ${peakGw.en} GW` },
      });
    }
  }

  if (longest && longest.quarters >= 4 && !tooClose(longest.start, drafts.map((item) => item.atHour))) {
    drafts.push({
      hour: longest.start,
      atHour: longest.start + QUARTER_H / 2,
      residualGw: longest.deepestGw,
      label: {
        de: `Überschuss ${hm(longest.start)}–${hm(longest.end)}`,
        en: `Surplus ${hm(longest.start)}–${hm(longest.end)}`,
      },
    });
  }

  return drafts
    .sort((left, right) => left.hour - right.hour)
    .slice(0, 3)
    .map((item, index) => ({ ...item, n: index + 1 }));
}

export function windAndSolarStayWeak(slots: ResidualSlot[]): boolean {
  let maxShare = 0;
  let seen = false;
  for (const slot of slots) {
    if (slot.loadMw <= 0) continue;
    seen = true;
    maxShare = Math.max(maxShare, (slot.windMw + slot.solarMw) / slot.loadMw);
  }
  return seen && maxShare < 0.4;
}
