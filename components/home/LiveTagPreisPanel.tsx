"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import { hmToHourFraction, plotXFromBerlinHour, quarterWidthPx } from "@/lib/liveTagChartGeometry";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { PreisTick } from "@/lib/preisFenster";
import { LUECKE_DESKTOP, LUECKE_MOBILE_PAD } from "@/lib/lueckeChartGeometry";

function subscribeCompact(onStoreChange: () => void) {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getCompactSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function getCompactServerSnapshot() {
  return false;
}

export function LiveTagPreisPanel({
  dayKey,
  prices,
  tomorrowKey,
  tomorrowPrices,
  marktFahrplan,
  fleetPowerGw,
  fleetEnergyGwh,
}: {
  dayKey: string;
  prices: PreisTick[];
  tomorrowKey: string;
  tomorrowPrices: PreisTick[];
  marktFahrplan: ReferenceParkModelDay | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const compact = useSyncExternalStore(subscribeCompact, getCompactSnapshot, getCompactServerSnapshot);
  const [shellWidth, setShellWidth] = useState(390);
  const dayLabel = formatBerlinDayLabel(dayKey);

  useEffect(() => {
    const node = shellRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }
    const sync = () => setShellWidth(Math.max(280, Math.round(node.clientWidth)));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const frame = compact
    ? { w: Math.max(320, shellWidth), h: 220, pad: LUECKE_MOBILE_PAD }
    : { w: LUECKE_DESKTOP.w, h: 220, pad: { ...LUECKE_DESKTOP.pad, right: 52 } };
  const padL = frame.pad.left;
  const padR = frame.pad.right;
  const padT = compact ? 36 : 40;
  const padB = compact ? 28 : 32;
  const plotW = frame.w - padL - padR;
  const plotH = frame.h - padT - padB;

  if (prices.length < 2) {
    return null;
  }

  const priceMin = Math.min(...prices.map((point) => point.eurPerMwh));
  const priceMax = Math.max(...prices.map((point) => point.eurPerMwh));
  const yPrice = (value: number) => padT + ((priceMax - value) / (priceMax - priceMin || 1)) * plotH;
  const xAt = (hour: number) => plotXFromBerlinHour(hour, padL, plotW);

  const fahrplan =
    marktFahrplan?.points.map((point) => ({
      hour: point.hour,
      netGw: (point.dischargeMw - point.chargeMw) / 1000,
    })) ?? [];
  const maxGw = Math.max(fleetPowerGw, ...fahrplan.map((point) => Math.abs(point.netGw)), 0.5);
  const yGw = (gw: number) => padT + plotH / 2 - (gw / maxGw) * (plotH * 0.42);
  const zeroY = yGw(0);
  const barW = quarterWidthPx(plotW) * 0.85;

  const pricePath = prices
    .map((point, index) => {
      const hour = hmToHourFraction(point.hm);
      return `${index === 0 ? "M" : "L"} ${xAt(hour).toFixed(1)} ${yPrice(point.eurPerMwh).toFixed(1)}`;
    })
    .join(" ");

  return (
    <section className="v4-chapter" aria-labelledby="live-tag-preis">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Preis und Modell</p>
        <h2 id="live-tag-preis" className="v4-chapter-h2">
          Day-Ahead und Markt-Fahrplan am {dayLabel}
        </h2>
        <p className="v4-tag-side">
          Fahrplan aus dem Day-Ahead-Preis (Modell). Überschuss- und Spitzen-Fahrweise rechnen wir, wenn der Tag komplett
          ist.
        </p>
      </div>
      <div ref={shellRef} className="v4-content v4-luecke-wrap w-full overflow-hidden">
        <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-[hsl(var(--c-grid))]" aria-hidden />
            Day-Ahead (€/MWh)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--c-pv))]" aria-hidden />
            Laden (GW)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--c-bess))]" aria-hidden />
            Entladen (GW)
          </span>
        </div>
        <svg
          viewBox={`0 0 ${frame.w} ${frame.h}`}
          width="100%"
          height={frame.h}
          role="img"
          aria-label="Day-Ahead-Preis und Markt-Fahrplan"
          preserveAspectRatio="xMidYMid meet"
        >
          {[0, 6, 12, 18, 24].map((hour) => (
            <text
              key={hour}
              x={xAt(hour)}
              y={frame.h - 6}
              textAnchor="middle"
              className="fill-muted-foreground num"
              fontSize="11"
            >
              {String(hour).padStart(2, "0")}
            </text>
          ))}
          <text x={padL - 8} y={padT - 8} textAnchor="end" className="fill-muted-foreground" fontSize="10">
            €/MWh
          </text>
          <text x={frame.w - padR + 8} y={padT - 8} textAnchor="start" className="fill-muted-foreground" fontSize="10">
            GW
          </text>
          <line x1={padL} x2={frame.w - padR} y1={zeroY} y2={zeroY} className="stroke-gridline" strokeWidth={0.8} />
          {fahrplan.map((point, index) => {
            if (!Number.isFinite(point.netGw) || Math.abs(point.netGw) < 0.02) {
              return null;
            }
            const x = xAt(point.hour) - barW / 2;
            const h = Math.abs(yGw(point.netGw) - zeroY);
            const y = point.netGw >= 0 ? zeroY - h : zeroY;
            return (
              <rect
                key={`fp-${index}`}
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={point.netGw >= 0 ? "hsl(var(--c-bess) / 0.65)" : "hsl(var(--c-pv) / 0.65)"}
              />
            );
          })}
          <path d={pricePath} fill="none" stroke="hsl(var(--c-grid))" strokeWidth={2.2} />
        </svg>
      </div>
      {tomorrowPrices.length >= 4 ? (
        <div className="v4-content mt-4">
          <p className="text-sm text-muted-foreground">
            Preisvorschau morgen ({formatBerlinDayLabel(tomorrowKey)}): {formatQuantity(tomorrowPrices[0]!.eurPerMwh, "de", 0)}{" "}
            bis {formatQuantity(tomorrowPrices[tomorrowPrices.length - 1]!.eurPerMwh, "de", 0)} €/MWh.{" "}
            <Link href={`/tag/${tomorrowKey}`} className="v4-text-link">
              Nur als Preisvorschau
            </Link>
            , keine eigene Tagesseite.
          </p>
        </div>
      ) : null}
      <p className="v4-content mt-3 text-sm text-muted-foreground">
        Modellrand: Preisnehmer, 85 % Wirkungsgrad, SoC 10 bis 90 %, Rückkehr auf 50 % um 24 Uhr. Referenzflotte ×1 (
        {formatQuantity(fleetPowerGw, "de", 2)} GW / {formatQuantity(fleetEnergyGwh, "de", 2)} GWh). Spanne heute{" "}
        {formatQuantity(priceMin, "de", 0)} bis {formatQuantity(priceMax, "de", 0)} €/MWh.
      </p>
    </section>
  );
}