"use client";

import { useId } from "react";

import { useMorphedSeries } from "@/components/day-ring/useMorphedSeries";
import type { AppLanguage } from "@/components/language-context";
import { berlinHourFraction, chartAriaLabel, type Beispieltag } from "@/lib/beispieltage";
import { formatQuantity } from "@/lib/formatQuantity";

const NAMEPLATE_MW = 103.5;

function r(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapY(value: number, min: number, max: number, top: number, height: number): number {
  const span = max - min || 1;
  return r(top + (1 - (value - min) / span) * height);
}

export function ExampleDayChart({ day, language }: { day: Beispieltag; language: AppLanguage }) {
  const prices = useMorphedSeries(day.prices);
  const power = useMorphedSeries(day.dispatch.powerMw);
  const soc = useMorphedSeries(day.dispatch.socPct);
  const label = chartAriaLabel(day, language);
  return (
    <div className="beispieltage-chart" data-model-estimate>
      <ChartSvg day={day} language={language} label={label} prices={prices} power={power} soc={soc} compact={false} />
      <ChartSvg day={day} language={language} label={label} prices={prices} power={power} soc={soc} compact />
    </div>
  );
}

function ChartSvg({
  day,
  language,
  label,
  prices,
  power,
  soc,
  compact,
}: {
  day: Beispieltag;
  language: AppLanguage;
  label: string;
  prices: number[];
  power: number[];
  soc: number[];
  compact: boolean;
}) {
  const hatchId = `hatch${useId().replace(/:/g, "")}`;
  const width = compact ? 390 : 960;
  const axis = compact ? 44 : 52;
  const right = 8;
  const priceTop = compact ? 36 : 28;
  const priceH = compact ? 112 : 156;
  const powerTop = priceTop + priceH + (compact ? 26 : 28);
  const powerH = compact ? 96 : 136;
  const socTop = powerTop + powerH + (compact ? 22 : 40);
  const socH = compact ? 26 : 72;
  const height = socTop + socH + (compact ? 22 : 28);
  const plot = width - axis - right;
  const de = language === "de";
  const hours = day.slotStartIso.map((iso) => berlinHourFraction(iso));
  const xAt = (hour: number) => r(axis + (hour / 24) * plot);
  const minPrice = Math.min(...day.prices);
  const maxPrice = Math.max(...day.prices);
  const pad = Math.max(4, (maxPrice - minPrice) * 0.06);
  const yPriceMin = Math.min(0, minPrice - pad);
  const yPriceMax = Math.max(0, maxPrice + pad);
  const yPrice = (value: number) => mapY(value, yPriceMin, yPriceMax, priceTop, priceH);
  const powerLimit = NAMEPLATE_MW * 1.25;
  const yPower = (value: number) => mapY(value, -powerLimit, powerLimit, powerTop, powerH);
  const ySoc = (value: number) => mapY(value, 0, 100, socTop, socH);
  const zeroPrice = yPriceMin <= 0 && yPriceMax >= 0 ? yPrice(0) : null;
  const zeroPower = yPower(0);

  let pricePath = "";
  hours.forEach((hour, index) => {
    const nextHour = hours[index + 1] ?? Math.min(24, hour + 0.25);
    const end = nextHour > hour ? nextHour : hour + 0.25;
    const y = yPrice(prices[index] ?? day.prices[index] ?? 0);
    pricePath += index === 0 ? `M ${xAt(hour)} ${y}` : ` V ${y}`;
    pricePath += ` H ${xAt(Math.min(24, end))}`;
  });

  const chargeIndex = power.findIndex((value) => value < -1);
  const dischargeIndex = power.findIndex((value) => value > 1);
  const showPaid = day.id === "feiertag-negativ";
  const paidIndex = showPaid ? day.slotStartIso.indexOf(day.stats.argminIso) : -1;
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const priceTicks = [maxPrice, ...(zeroPrice !== null ? [0] : []), minPrice];

  return (
    <svg
      className={compact ? "beispieltage-chart-compact" : "beispieltage-chart-wide"}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {compact ? null : (
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--mint)" opacity="0.28" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mint)" strokeWidth="2" />
          </pattern>
        </defs>
      )}
      <text x={axis} y={12} fill="currentColor" fontSize={compact ? 12 : 13}>
        {de ? "€/MWh" : "€/MWh"}
      </text>
      {priceTicks.map((tick) => (
        <g key={`p-${tick}`}>
          <line
            x1={axis}
            x2={width - right}
            y1={yPrice(tick)}
            y2={yPrice(tick)}
            stroke="currentColor"
            strokeWidth={tick === 0 ? 1.75 : 0.6}
            strokeDasharray={tick === 0 ? undefined : "2 4"}
            opacity={tick === 0 ? 0.9 : 0.35}
          />
          <text x={4} y={yPrice(tick) + 4} fill="currentColor" fontSize={compact ? 11 : 12}>
            {formatQuantity(Math.round(tick), language, 0)}
          </text>
        </g>
      ))}
      <path d={pricePath} fill="none" stroke="currentColor" strokeWidth={compact ? 1.6 : 2} />
      {paidIndex >= 0 ? (
        <PaidToCharge
          x={xAt(hours[paidIndex] ?? 0)}
          y={yPrice(day.prices[paidIndex] ?? minPrice)}
          compact={compact}
          priceTop={priceTop}
          axis={axis}
          right={right}
          width={width}
          label={de ? "Geld fürs Laden" : "Paid to charge"}
        />
      ) : null}
      <text x={axis} y={powerTop - 2} fill="currentColor" fontSize={compact ? 12 : 13}>
        MW
      </text>
      <line x1={axis} x2={width - right} y1={zeroPower} y2={zeroPower} stroke="currentColor" strokeWidth="1.75" opacity="0.9" />
      <text x={4} y={yPower(NAMEPLATE_MW) + 4} fill="currentColor" fontSize="11">
        {formatQuantity(NAMEPLATE_MW, language, 0)}
      </text>
      <text x={4} y={yPower(-NAMEPLATE_MW) + 4} fill="currentColor" fontSize="11">
        {formatQuantity(-NAMEPLATE_MW, language, 0)}
      </text>
      {hours.map((hour, index) => {
        const value = power[index] ?? 0;
        if (Math.abs(value) < 0.5) {
          return null;
        }
        const nextHour = hours[index + 1] ?? Math.min(24, hour + 0.25);
        const end = nextHour > hour ? nextHour : hour + 0.25;
        const x = xAt(hour);
        const barWidth = Math.max(1.2, xAt(Math.min(24, end)) - x - 0.4);
        const y0 = zeroPower;
        const y1 = yPower(value);
        const charge = value < 0;
        const fill = charge ? (compact ? "var(--mint)" : `url(#${hatchId})`) : "var(--coral)";
        return <rect key={`b-${day.slotStartIso[index]}`} x={x} y={Math.min(y0, y1)} width={r(barWidth)} height={r(Math.abs(y1 - y0))} fill={fill} />;
      })}
      {dischargeIndex >= 0 ? (
        <text
          x={labelX(xAt(hours[dischargeIndex] ?? 0), de ? "Abgabe" : "Discharge", axis, width - right, compact)}
          y={powerTop - 10}
          textAnchor="middle"
          fill="currentColor"
          fontSize={compact ? 12 : 13}
        >
          {de ? "Abgabe" : "Discharge"}
        </text>
      ) : null}
      {chargeIndex >= 0 ? (
        <text
          x={labelX(xAt(hours[chargeIndex] ?? 0), de ? "Laden" : "Charge", axis, width - right, compact)}
          y={powerTop + powerH + (compact ? 16 : 18)}
          textAnchor="middle"
          fill="currentColor"
          fontSize={compact ? 12 : 13}
        >
          {de ? "Laden" : "Charge"}
        </text>
      ) : null}
      {compact ? (
        <path
          d={socPath(hours, soc, xAt, ySoc)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ) : (
        <>
          <rect x={axis} y={ySoc(90)} width={plot} height={r(ySoc(10) - ySoc(90))} fill="currentColor" opacity="0.08" />
          <line x1={axis} x2={width - right} y1={ySoc(50)} y2={ySoc(50)} stroke="currentColor" strokeDasharray="3 4" opacity="0.45" />
          <text x={4} y={ySoc(90) + 4} fill="currentColor" fontSize="12">
            90 %
          </text>
          <text x={4} y={ySoc(50) + 4} fill="currentColor" fontSize="12">
            50 %
          </text>
          <text x={axis} y={socTop - 6} fill="currentColor" fontSize="13">
            {de ? "Ladezustand" : "State of charge"}
          </text>
          <path d={socPath(hours, soc, xAt, ySoc)} fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      )}
      {ticks.map((hour) => (
        <text key={hour} x={xAt(hour)} y={height - 6} textAnchor="middle" fill="currentColor" fontSize={compact ? 11 : 12}>
          {hour}
        </text>
      ))}
    </svg>
  );
}

function socPath(hours: number[], soc: number[], xAt: (hour: number) => number, ySoc: (value: number) => number): string {
  return hours
    .map((hour, index) => `${index === 0 ? "M" : "L"} ${xAt(hour)} ${ySoc(soc[index] ?? 0)}`)
    .join(" ");
}

function labelX(x: number, text: string, left: number, rightEdge: number, compact: boolean): number {
  const half = (text.length * (compact ? 3.4 : 3.6));
  return r(Math.max(left + half, Math.min(rightEdge - half, x)));
}

function PaidToCharge({
  x,
  y,
  compact,
  priceTop,
  axis,
  right,
  width,
  label,
}: {
  x: number;
  y: number;
  compact: boolean;
  priceTop: number;
  axis: number;
  right: number;
  width: number;
  label: string;
}) {
  const labelWidth = compact ? 96 : 112;
  const textX = r(Math.max(axis, Math.min(width - right - labelWidth, x - labelWidth / 2)));
  const textY = r(priceTop - 8);
  return (
    <g>
      <line x1={x} y1={y} x2={textX + labelWidth / 2} y2={textY + 2} stroke="var(--mint)" strokeWidth="1.25" />
      <circle cx={x} cy={y} r="2.5" fill="var(--mint)" />
      <text x={textX} y={textY} fill="currentColor" fontSize={compact ? 12 : 14}>
        {label}
      </text>
    </g>
  );
}
