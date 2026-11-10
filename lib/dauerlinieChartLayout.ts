import type { DauerlinieModel } from "@/lib/monatKonzeptC";
import { dauerlinieSeriesSamples, morphX } from "@/lib/monatKonzeptC";

export const DAUER_SORTED_HOURS = 745;
export const DAUER_Y_TICKS = [-60, 0, 60, 100] as const;
export const DAUER_X_TICKS_H = [0, 350, 700] as const;
/** Gesamthöhe C-Chart in CSS-Pixel (Mobil). */
export const DAUER_MOBILE_CHART_H = 336;

export type DauerlinieLayoutMode = "desktop" | "mobile";

export type DauerlinieScene = {
  viewW: number;
  viewH: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  plotW: number;
  plotH: number;
  yPix: (gw: number) => number;
  xPixFromHours: (hours: number) => number;
  dObs: string;
  dStor: string;
  dTint: string;
  storColor: string;
  peakLabel: number;
  valleyObs: number;
  valleyStor: number | null;
  y60: number;
  morphT: number;
};

function yDomain() {
  return { min: -60, max: 100 };
}

export function buildDauerlinieScene(
  model: DauerlinieModel,
  morphT: number,
  mode: DauerlinieLayoutMode,
  viewW: number,
  fleetAvailable: boolean,
  storColor: string,
): DauerlinieScene {
  const n = model.intervalCount;
  const padL = mode === "mobile" ? 44 : 92;
  const padR = mode === "mobile" ? 12 : 28;
  const padT = mode === "mobile" ? 36 : 48;
  const padB = mode === "mobile" ? 20 : 36;
  const viewH = mode === "mobile" ? DAUER_MOBILE_CHART_H : 48 + 300 + 36;
  const plotH = mode === "mobile" ? viewH - padT - padB : 300;
  const plotW = viewW - padL - padR;
  const { min: yMin, max: yMax } = yDomain();
  const yPix = (gw: number) => padT + plotH - ((gw - yMin) / (yMax - yMin)) * plotH;
  const xPixFromHours = (hours: number) => padL + (hours / DAUER_SORTED_HOURS) * plotW;

  const xPixRank = (xNorm: number) => {
    const hours = (xNorm / Math.max(1, n - 1)) * DAUER_SORTED_HOURS;
    return xPixFromHours(hours);
  };

  const obsSamples = dauerlinieSeriesSamples(model, morphT, "observed");
  const storSamples = fleetAvailable ? dauerlinieSeriesSamples(model, morphT, "storage") : [];

  const toPath = (samples: { x: number; y: number }[]) =>
    samples
      .map((p, i) => `${i === 0 ? "M" : "L"}${xPixRank(p.x).toFixed(1)},${yPix(p.y).toFixed(1)}`)
      .join("");

  let dTint = "";
  if (fleetAvailable && morphT > 0.55) {
    const step = Math.max(1, Math.ceil(n / 400));
    const byObs = new Map(model.points.map((p) => [p.sortRankObserved, p]));
    const bySt = new Map(
      model.points.filter((p) => p.sortRankStorage != null).map((p) => [p.sortRankStorage!, p]),
    );
    const top: string[] = [];
    const bot: string[] = [];
    for (let rank = 0; rank < n; rank += step) {
      const po = byObs.get(rank);
      const ps = bySt.get(rank);
      if (!po || !ps || ps.withStorageGw == null) continue;
      const hours = (morphX(rank, rank, morphT, n) / Math.max(1, n - 1)) * DAUER_SORTED_HOURS;
      const yO = po.observedGw;
      const yS = ps.withStorageGw;
      if (Math.max(yO, yS) <= 60) continue;
      top.push(`${xPixFromHours(hours).toFixed(1)},${yPix(Math.max(yO, yS)).toFixed(1)}`);
      bot.push(`${xPixFromHours(hours).toFixed(1)},${yPix(Math.min(yO, yS)).toFixed(1)}`);
    }
    if (top.length > 2) {
      dTint = `M${top.join(" L")} L${[...bot].reverse().join(" L")} Z`;
    }
  }

  return {
    viewW,
    viewH,
    padL,
    padR,
    padT,
    padB,
    plotW,
    plotH,
    yPix,
    xPixFromHours,
    dObs: toPath(obsSamples),
    dStor: storSamples.length ? toPath(storSamples) : "",
    dTint,
    storColor,
    peakLabel: model.withStorageMaxGw ?? model.observedMaxGw,
    valleyObs: model.observedMinGw,
    valleyStor: model.withStorageMinGw ?? null,
    y60: yPix(60),
    morphT,
  };
}

export function konzeptCDauerHeadline(
  monthKey: string,
  strategyLabel: string,
  factor: number,
  peakAfterGw: number,
  wirkungGw: number,
): string {
  const monthName = monthKey.match(/^\d{4}-(\d{2})$/)
    ? new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)) - 1, 1)).toLocaleDateString(
        "de-DE",
        { month: "long", timeZone: "UTC" },
      )
    : monthKey;
  const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const gw = peakAfterGw.toFixed(2).replace(".", ",");
  if (wirkungGw < -0.5) {
    return `${cap}, nach Höhe sortiert: mit ${strategyLabel} ×${factor} steigt die Spitze auf ${gw} GW.`;
  }
  return `${cap}, nach Höhe sortiert: mit ${strategyLabel} ×${factor} liegt die Spitze bei ${gw} GW.`;
}
