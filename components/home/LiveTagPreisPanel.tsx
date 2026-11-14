"use client";

import Link from "next/link";

import { PreisFenster } from "@/components/home/PreisFenster";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { PreisTick } from "@/lib/preisFenster";
import { LUECKE_DESKTOP, plotXFromSlotIndex } from "@/lib/lueckeChartGeometry";

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
  const dayLabel = formatBerlinDayLabel(dayKey);
  const netGw =
    marktFahrplan?.points.map((point) => (point.dischargeMw - point.chargeMw) / 1000) ?? [];

  const padL = LUECKE_DESKTOP.pad.left;
  const padR = LUECKE_DESKTOP.pad.right;
  const width = LUECKE_DESKTOP.w;
  const height = 200;
  const padT = 24;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const priceMin = Math.min(...prices.map((p) => p.eurPerMwh));
  const priceMax = Math.max(...prices.map((p) => p.eurPerMwh));
  const yPrice = (value: number) => padT + ((priceMax - value) / (priceMax - priceMin || 1)) * plotH;
  const xAt = (index: number) => plotXFromSlotIndex(index, prices.length, padL, plotW);

  const pricePath = prices
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yPrice(point.eurPerMwh).toFixed(1)}`)
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
      <div className="v4-content v4-luecke-wrap">
        <svg width={width} height={height} role="img" aria-label="Day-Ahead-Preis und Markt-Fahrplan" className="block max-w-full">
          <path d={pricePath} fill="none" className="stroke-[hsl(var(--c-grid))]" strokeWidth={2} />
          {netGw.map((gw, index) => {
            if (!Number.isFinite(gw) || Math.abs(gw) < 0.01) {
              return null;
            }
            const barW = plotW / Math.max(prices.length, 1) - 1;
            const x = xAt(index);
            const zeroY = padT + plotH * 0.55;
            const h = (Math.abs(gw) / 6) * plotH * 0.35;
            return (
              <rect
                key={index}
                x={x}
                y={gw >= 0 ? zeroY - h : zeroY}
                width={Math.max(1, barW)}
                height={h}
                fill={gw >= 0 ? "hsl(var(--c-bess))" : "hsl(var(--c-pv))"}
                opacity={0.55}
              />
            );
          })}
        </svg>
      </div>
      {prices.length >= 2 ? (
        <div className="v4-content">
          <PreisFenster
            dateLabel={dayLabel}
            points={prices}
            powerGw={fleetPowerGw}
            energyGwh={fleetEnergyGwh}
            surplusGwh={0}
            compactCopy
          />
        </div>
      ) : null}
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
        {formatQuantity(fleetPowerGw, "de", 2)} GW / {formatQuantity(fleetEnergyGwh, "de", 2)} GWh).
      </p>
    </section>
  );
}