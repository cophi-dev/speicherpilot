import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { berlinClockParts } from "@/lib/quarterMarks";
import { residualMw, windMw, type PowerSlot } from "@/lib/powerMix";

export type StripReading = {
  id: "load" | "wind" | "solar" | "residual" | "renewableShare" | "price" | "frequency";
  value: number | null;
  unit: "GW" | "%" | "EUR/MWh" | "Hz";
  /** Berlin HH:MM of this reading, or null when nothing was published. */
  time: string | null;
  stale: boolean;
};

export type FrequencySample = {
  unixMs: number;
  hertz: number;
};

export type LiveStripInput = {
  slots: PowerSlot[];
  offshorePresent: boolean;
  powerStale: boolean;
  prices: DayAheadPricePoint[];
  priceStale: boolean;
  frequency: FrequencySample | null;
  frequencyStale: boolean;
  now: Date;
};

function clock(isoOrMs: string | number): string {
  return berlinClockParts(isoOrMs).hm;
}

function latestSlot(slots: PowerSlot[], ready: (slot: PowerSlot) => boolean): PowerSlot | null {
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (ready(slots[index])) {
      return slots[index];
    }
  }
  return null;
}

export function quarterStartMs(now: Date): number {
  return Math.floor(now.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000;
}

export function priceForQuarter(prices: DayAheadPricePoint[], quarterStart: number): DayAheadPricePoint | null {
  return prices.find((point) => point.unixMs >= quarterStart && point.unixMs < quarterStart + 15 * 60 * 1000) ?? null;
}

export function buildLiveReadings(input: LiveStripInput): { stand: string; readings: StripReading[] } {
  const loadSlot = latestSlot(input.slots, (slot) => slot.loadMw !== null);
  const windSlot = latestSlot(input.slots, (slot) => windMw(slot, input.offshorePresent) !== null);
  const solarSlot = latestSlot(input.slots, (slot) => slot.carriers.solar !== null);
  const residualSlot = latestSlot(input.slots, (slot) => residualMw(slot, input.offshorePresent) !== null);
  const shareSlot = latestSlot(input.slots, (slot) => slot.renewableSharePct !== null);
  const quarter = quarterStartMs(input.now);
  const price = priceForQuarter(input.prices, quarter);
  const wind = windSlot ? windMw(windSlot, input.offshorePresent) : null;
  const residual = residualSlot ? residualMw(residualSlot, input.offshorePresent) : null;

  const readings: StripReading[] = [
    {
      id: "load",
      value: loadSlot?.loadMw != null ? loadSlot.loadMw / 1000 : null,
      unit: "GW",
      time: loadSlot ? clock(loadSlot.timestampIso) : null,
      stale: input.powerStale && loadSlot !== null,
    },
    {
      id: "wind",
      value: wind === null ? null : wind / 1000,
      unit: "GW",
      time: windSlot && wind !== null ? clock(windSlot.timestampIso) : null,
      stale: input.powerStale && wind !== null,
    },
    {
      id: "solar",
      value: solarSlot?.carriers.solar != null ? solarSlot.carriers.solar / 1000 : null,
      unit: "GW",
      time: solarSlot && solarSlot.carriers.solar !== null ? clock(solarSlot.timestampIso) : null,
      stale: input.powerStale && solarSlot?.carriers.solar != null,
    },
    {
      id: "residual",
      value: residual === null ? null : residual / 1000,
      unit: "GW",
      time: residualSlot && residual !== null ? clock(residualSlot.timestampIso) : null,
      stale: input.powerStale && residual !== null,
    },
    {
      id: "renewableShare",
      value: shareSlot?.renewableSharePct ?? null,
      unit: "%",
      time: shareSlot && shareSlot.renewableSharePct !== null ? clock(shareSlot.timestampIso) : null,
      stale: input.powerStale && shareSlot?.renewableSharePct != null,
    },
    {
      id: "price",
      value: price ? price.eurPerMwh : null,
      unit: "EUR/MWh",
      time: price ? clock(price.unixMs) : clock(quarter),
      stale: input.priceStale && price !== null,
    },
    {
      id: "frequency",
      value: input.frequency ? input.frequency.hertz : null,
      unit: "Hz",
      time: input.frequency ? clock(input.frequency.unixMs) : null,
      stale: input.frequencyStale && input.frequency !== null,
    },
  ];

  return { stand: clock(input.now.getTime()), readings };
}
