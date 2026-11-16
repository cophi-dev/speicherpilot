import { readFileSync } from "node:fs";
import { join } from "node:path";

export type NetzUpdatesDurationPoint = {
  factor: number;
  h176: number;
  h4: number;
  powerGwLabel: string;
};

export type NetzUpdatesFahrweiseSlot = {
  hourLabel: string;
  observedGw: number;
  priceGw: number;
  peakGw: number;
};

const FACTORS = [1, 2, 5, 10] as const;

function fleetPowerGwLabel(factor: number): string {
  const baseGw = 4.644;
  const gw = baseGw * factor;
  return `${gw.toFixed(1).replace(".", ",")} GW`;
}

export function loadNetzUpdatesDurationSeries(): NetzUpdatesDurationPoint[] {
  const path = join(process.cwd(), "data/national-fleet/2026-10/duration-sensitivity.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    peak_reduction_gw: Record<string, Record<string, number>>;
  };
  return FACTORS.map((factor) => ({
    factor,
    h176: raw.peak_reduction_gw[String(factor)]["1.76"],
    h4: raw.peak_reduction_gw[String(factor)]["4"],
    powerGwLabel: fleetPowerGwLabel(factor),
  }));
}

export function loadNetzUpdatesFahrweiseDay(): {
  slots: NetzUpdatesFahrweiseSlot[];
  observedPeakGw: number;
  observedPeakLabel: string;
  pricePeakGw: number;
  pricePeakLabel: string;
  peakCapGw: number;
} {
  const path = join(process.cwd(), "data/national-fleet/2026-10/simulator-fahrweisen.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    exampleDays: Record<
      string,
      {
        modes: {
          price: { ts: string; residualMw: number; residualPrimeMw: number }[];
          peak: { ts: string; residualMw: number; residualPrimeMw: number }[];
        };
      }
    >;
  };
  const day = raw.exampleDays["2026-10-21"];
  if (!day) {
    throw new Error("Beispieltag 2026-10-21 fehlt in simulator-fahrweisen.json");
  }
  const slots: NetzUpdatesFahrweiseSlot[] = [];
  let observedPeak = 0;
  let observedPeakLabel = "";
  let pricePeak = 0;
  let pricePeakLabel = "";
  let peakCap = 0;

  for (let i = 0; i < day.modes.price.length; i += 1) {
    const p = day.modes.price[i]!;
    const peak = day.modes.peak[i]!;
    const hour = p.ts.slice(11, 16);
    const observedGw = p.residualMw / 1000;
    const priceGw = (p.residualPrimeMw ?? p.residualMw) / 1000;
    const peakGw = (peak.residualPrimeMw ?? peak.residualMw) / 1000;
    if (observedGw > observedPeak) {
      observedPeak = observedGw;
      observedPeakLabel = hour;
    }
    if (priceGw > pricePeak) {
      pricePeak = priceGw;
      pricePeakLabel = hour;
    }
    peakCap = Math.max(peakCap, peakGw);
  }

  for (let i = 0; i < day.modes.price.length; i += 4) {
    const p = day.modes.price[i]!;
    const peak = day.modes.peak[i]!;
    const hour = p.ts.slice(11, 16);
    const observedGw = p.residualMw / 1000;
    const priceGw = (p.residualPrimeMw ?? p.residualMw) / 1000;
    const peakGw = (peak.residualPrimeMw ?? peak.residualMw) / 1000;
    slots.push({ hourLabel: hour, observedGw, priceGw, peakGw });
  }

  return {
    slots,
    observedPeakGw: Math.round(observedPeak * 10) / 10,
    observedPeakLabel,
    pricePeakGw: Math.round(pricePeak * 10) / 10,
    pricePeakLabel,
    peakCapGw: Math.round(peakCap * 10) / 10,
  };
}