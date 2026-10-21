"use client";

import { useId } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import { areaTrueRadius, hourClock, priceInk, type NetzbriefIssue } from "@/lib/netzbrief";

type Language = "de" | "en";

function tx(language: Language, de: string, en: string) {
  return language === "de" ? de : en;
}

function wedge(cx: number, cy: number, radius: number, start: number, end: number) {
  const span = end - start;
  const large = span > Math.PI ? 1 : 0;
  const x0 = cx + radius * Math.cos(start);
  const y0 = cy + radius * Math.sin(start);
  const x1 = cx + radius * Math.cos(end);
  const y1 = cy + radius * Math.sin(end);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function DayClock({
  clock,
  language,
  label,
}: {
  clock: NonNullable<NetzbriefIssue["clock"]>;
  language: Language;
  label: string;
}) {
  const size = 360;
  const center = 180;
  const radius = 112;
  const hours = tx(language, `${formatQuantity(clock.surplusHours, "de", clock.surplusHours > 0 && clock.surplusHours < 10 ? 1 : 0)} h`, `${formatQuantity(clock.surplusHours, "en", clock.surplusHours > 0 && clock.surplusHours < 10 ? 1 : 0)} h`);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="netzbrief-in mx-auto w-full max-w-[420px]" role="img" aria-label={label}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--gridline))" strokeWidth="1" />
      {clock.ringsGw.map((ring) => {
        const ringRadius = areaTrueRadius(ring, clock.scaleGw) * radius;
        const angle = -Math.PI * 0.78;
        const x = center + (ringRadius + 2) * Math.cos(angle);
        const y = center + (ringRadius + 2) * Math.sin(angle);
        return (
          <g key={ring}>
            <circle cx={center} cy={center} r={ringRadius} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
            <text x={x} y={y} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
              {ring} GW
            </text>
          </g>
        );
      })}
      {clock.slots.map((slot) => {
        const start = (slot.hour / 24) * Math.PI * 2 - Math.PI / 2;
        const end = ((slot.hour + 0.25) / 24) * Math.PI * 2 - Math.PI / 2;
        const outer = areaTrueRadius(slot.windSolarGw, clock.scaleGw) * radius;
        if (outer <= 0) {
          return null;
        }
        return (
          <path
            key={slot.hour}
            d={wedge(center, center, outer, start, end)}
            fill={slot.surplus ? "hsl(var(--c-bess) / 0.9)" : "hsl(var(--c-grid) / 0.4)"}
          />
        );
      })}
      {[
        { hour: 0, text: "00" },
        { hour: 6, text: "06" },
        { hour: 12, text: "12" },
        { hour: 18, text: "18" },
      ].map((mark) => {
        const angle = (mark.hour / 24) * Math.PI * 2 - Math.PI / 2;
        const x = center + (radius + 18) * Math.cos(angle);
        const y = center + (radius + 18) * Math.sin(angle);
        return (
          <text key={mark.hour} x={x} y={y + 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {mark.text}
          </text>
        );
      })}
      <text x={center} y={center - 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="28" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
        {hours}
      </text>
      <text x={center} y={center + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
        {clock.surplusHours > 0 ? tx(language, "über der Last", "above load") : tx(language, "kein Überschuss", "no surplus")}
      </text>
    </svg>
  );
}

export function PriceBarcode({
  prices,
  language,
}: {
  prices: NonNullable<NetzbriefIssue["prices"]>;
  language: Language;
}) {
  const width = 640;
  const height = 120;
  const slotWidth = width / prices.slots.length;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
        <p>
          <span className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx(language, "Günstigste Stunden", "Lowest-priced hours")}</span>
          <span className="mt-1 block font-medium">{hourClock(prices.minHour)} · {formatQuantity(prices.minEur, language, 2)} €/MWh</span>
        </p>
        <p className="text-right">
          <span className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx(language, "Höchste Preise", "Highest prices")}</span>
          <span className="mt-1 block font-medium">{hourClock(prices.maxHour)} · {formatQuantity(prices.maxEur, language, 2)} €/MWh</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-28 w-full" role="img" aria-label={tx(language, "Day-Ahead-Preise als Streifen, günstig hell und teuer dunkel", "Day-ahead prices as stripes, low prices light and high prices dark")}>
        {prices.slots.map((slot, index) => (
          <rect
            key={`${slot.hour}-${index}`}
            x={index * slotWidth}
            y={0}
            width={slotWidth + 0.4}
            height={height}
            fill="hsl(var(--foreground))"
            opacity={priceInk(slot.eurPerMwh, prices.minEur, prices.maxEur)}
          />
        ))}
      </svg>
      <p className="mt-2 text-sm text-muted-foreground">
        {tx(language, "Day-Ahead-Auktion der Gebotszone DE-LU. Keine Handelsempfehlung.", "Day-ahead auction of the DE-LU bidding zone. Not trading advice.")}
      </p>
    </div>
  );
}

export function ZoneMirror({
  zones,
  language,
  label,
}: {
  zones: NonNullable<NetzbriefIssue["zones"]>;
  language: Language;
  label: string;
}) {
  const pattern = useId().replace(/:/g, "");
  const width = 640;
  const height = 320;
  const left = 44;
  const right = 88;
  const top = 16;
  const bottom = 28;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const mid = top + plotH / 2;
  const max = zones.maxPct || 1;
  const yNorth = (pct: number) => mid - (pct / max) * (plotH / 2);
  const ySouth = (pct: number) => mid + (pct / max) * (plotH / 2);
  const xOf = (hour: number) => left + (hour / 24) * plotW;
  const slots = zones.slots;
  const northPath = slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yNorth(slot.northPct)}`).join(" ");
  const southPath = slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${ySouth(slot.southPct)}`).join(" ");
  const northArea = `${northPath} L ${xOf(slots[slots.length - 1]?.hour ?? 0)} ${mid} L ${xOf(slots[0]?.hour ?? 0)} ${mid} Z`;
  const southArea = `${southPath} L ${xOf(slots[slots.length - 1]?.hour ?? 0)} ${mid} L ${xOf(slots[0]?.hour ?? 0)} ${mid} Z`;
  const last = slots[slots.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="netzbrief-in h-auto w-full" role="img" aria-label={label}>
      <defs>
        <pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0" stroke="hsl(var(--c-grid))" strokeWidth="1" />
        </pattern>
      </defs>
      {zones.ticks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={left + plotW} y1={yNorth(tick)} y2={yNorth(tick)} stroke="hsl(var(--gridline))" strokeWidth="1" />
          {tick > 0 ? <line x1={left} x2={left + plotW} y1={ySouth(tick)} y2={ySouth(tick)} stroke="hsl(var(--gridline))" strokeWidth="1" /> : null}
          <text x={left - 8} y={yNorth(tick) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {tick === zones.ticks[zones.ticks.length - 1] ? `${tick} %` : tick}
          </text>
        </g>
      ))}
      <path d={northArea} fill="hsl(var(--c-grid) / 0.55)" />
      <path d={southArea} fill={`url(#${pattern})`} opacity="0.9" />
      <path d={northPath} fill="none" stroke="hsl(var(--c-grid))" strokeWidth="1.5" />
      <path d={southPath} fill="none" stroke="hsl(var(--c-grid))" strokeWidth="1.5" />
      {last ? (
        <>
          <text x={xOf(last.hour) + 8} y={yNorth(last.northPct)} fill="hsl(var(--foreground))" fontSize="12">50Hertz</text>
          <text x={xOf(last.hour) + 8} y={ySouth(last.southPct) + 4} fill="hsl(var(--foreground))" fontSize="12">TransnetBW</text>
        </>
      ) : null}
      {["00", "06", "12", "18", "24"].map((mark) => (
        <text key={mark} x={xOf(Number(mark))} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
          {mark}
        </text>
      ))}
      <text x={left + 8} y={top + 14} fill="hsl(var(--muted-foreground))" fontSize="12">{tx(language, "Norden", "North")}</text>
      <text x={left + 8} y={top + plotH - 6} fill="hsl(var(--muted-foreground))" fontSize="12">{tx(language, "Süden", "South")}</text>
    </svg>
  );
}

export function StorageChart({
  storage,
  language,
  label,
}: {
  storage: NonNullable<NetzbriefIssue["storage"]>;
  language: Language;
  label: string;
}) {
  const pattern = useId().replace(/:/g, "");
  const width = 640;
  const height = 340;
  const left = 48;
  const right = 16;
  const top = 18;
  const bottom = 28;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const yMin = storage.yMinGw;
  const yMax = storage.yMaxGw;
  const span = yMax - yMin || 1;
  const yOf = (gw: number) => top + (1 - (gw - yMin) / span) * plotH;
  const xOf = (hour: number) => left + (Math.min(24, Math.max(0, hour)) / 24) * plotW;
  const slots = storage.slots;
  const residual = slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.residualGw)}`).join(" ");
  const evening = slots.filter((slot) => slot.hour >= 17);
  const before = evening.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.residualGw)}`).join(" ");
  const after = evening.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.residualGw - slot.dischargeGw)}`).join(" ");
  const segments: string[] = [];
  const stored: string[] = [];
  for (let index = 0; index < slots.length - 1; index += 1) {
    const current = slots[index];
    const next = slots[index + 1];
    if (current.residualGw < 0 || next.residualGw < 0) {
      const x0 = xOf(current.hour);
      const x1 = xOf(next.hour);
      segments.push(`M ${x0} ${yOf(Math.min(0, current.residualGw))} L ${x1} ${yOf(Math.min(0, next.residualGw))} L ${x1} ${yOf(0)} L ${x0} ${yOf(0)} Z`);
    }
    if (current.chargeGw > 0) {
      const x0 = xOf(current.hour);
      const x1 = xOf(next.hour);
      stored.push(
        `M ${x0} ${yOf(current.residualGw)} L ${x1} ${yOf(next.residualGw)} L ${x1} ${yOf(next.residualGw + next.chargeGw)} L ${x0} ${yOf(current.residualGw + current.chargeGw)} Z`
      );
    }
  }
  const storedSlot = slots.reduce((best, slot) => (slot.chargeGw > best.chargeGw ? slot : best), slots[0]);
  const storedHeight = storedSlot ? Math.abs(yOf(storedSlot.residualGw) - yOf(storedSlot.residualGw + storedSlot.chargeGw)) : 0;
  const hatchHeight = storedSlot ? Math.abs(yOf(0) - yOf(storedSlot.residualGw + storedSlot.chargeGw)) : 0;
  const showStored = storedSlot && storedHeight > 16;
  const showHatch = storedSlot && hatchHeight > 18 && Math.abs(hatchHeight) > 20 && storedHeight > 16;
  const first = slots[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="netzbrief-in h-auto w-full" role="img" aria-label={label}>
      <defs>
        <pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 6 L6 0" stroke="hsl(var(--c-curtail))" strokeWidth="1" />
        </pattern>
      </defs>
      {storage.yTicksGw.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={left + plotW} y1={yOf(tick)} y2={yOf(tick)} stroke="hsl(var(--gridline))" />
          <text x={left - 8} y={yOf(tick) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {tick === storage.yTicksGw[storage.yTicksGw.length - 1] ? `${tick} GW` : tick}
          </text>
        </g>
      ))}
      {segments.map((path, index) => (
        <path key={`hatch-${index}`} d={path} fill={`url(#${pattern})`} />
      ))}
      {stored.map((path, index) => (
        <path key={`stored-${index}`} d={path} fill="hsl(var(--c-bess) / 0.85)" />
      ))}
      <path d={residual} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      {evening.length > 1 ? <path d={before} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4 3" /> : null}
      {evening.length > 1 ? <path d={after} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" /> : null}
      {first ? (
        <text x={xOf(first.hour) + 6} y={Math.max(top + 12, yOf(first.residualGw) - 8)} fill="hsl(var(--foreground))" fontSize="12">
          {tx(language, "Residuallast", "Residual load")}
        </text>
      ) : null}
      {showStored && storedSlot ? (
        <text x={xOf(storedSlot.hour)} y={(yOf(storedSlot.residualGw) + yOf(storedSlot.residualGw + storedSlot.chargeGw)) / 2} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="12">
          {tx(language, "gespeichert", "stored")}
        </text>
      ) : null}
      {showHatch && storedSlot ? (
        <text x={xOf(storedSlot.hour)} y={yOf((storedSlot.residualGw + storedSlot.chargeGw) / 2)} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
          {tx(language, "nicht gespeichert", "not stored")}
        </text>
      ) : null}
      {["00", "06", "12", "18", "24"].map((mark) => (
        <text key={mark} x={xOf(Number(mark))} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
          {mark}
        </text>
      ))}
    </svg>
  );
}

export function PeakChart({
  peak,
  language,
  label,
}: {
  peak: NonNullable<NetzbriefIssue["peak"]>;
  language: Language;
  label: string;
}) {
  const width = 640;
  const height = 300;
  const left = 48;
  const right = 16;
  const top = 16;
  const bottom = 28;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const yMin = Math.min(0, ...peak.yTicks);
  const yMax = peak.yMax;
  const span = yMax - yMin || 1;
  const yOf = (value: number) => top + (1 - (value - yMin) / span) * plotH;
  const xOf = (hour: number) => left + (Math.min(24, Math.max(0, hour)) / 24) * plotW;
  const before = peak.slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.beforeKw)}`).join(" ");
  const after = peak.slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.afterKw)}`).join(" ");
  const last = peak.slots[peak.slots.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="netzbrief-in h-auto w-full" role="img" aria-label={label}>
      {peak.yTicks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={left + plotW} y1={yOf(tick)} y2={yOf(tick)} stroke="hsl(var(--gridline))" />
          <text x={left - 8} y={yOf(tick) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
            {tick === peak.yTicks[peak.yTicks.length - 1] ? `${tick} kW` : tick}
          </text>
        </g>
      ))}
      <line x1={left} x2={left + plotW} y1={yOf(peak.limitKw)} y2={yOf(peak.limitKw)} stroke="hsl(var(--c-limit))" strokeDasharray="4 3" />
      <text x={left + plotW - 4} y={yOf(peak.limitKw) - 6} textAnchor="end" fill="hsl(var(--c-limit))" fontSize="12">
        {tx(language, "Anschluss", "Connection")}
      </text>
      <path d={before} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={after} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
      {last ? (
        <>
          <text x={xOf(last.hour) - 6} y={yOf(last.beforeKw) - 6} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12">
            {tx(language, "ohne Speicher", "without storage")}
          </text>
          <text x={xOf(last.hour) - 6} y={yOf(last.afterKw) + 14} textAnchor="end" fill="hsl(var(--foreground))" fontSize="12">
            {tx(language, "mit Speicher", "with storage")}
          </text>
        </>
      ) : null}
      {["00", "06", "12", "18", "24"].map((mark) => (
        <text key={mark} x={xOf(Number(mark))} y={height - 8} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="var(--font-plex-mono), ui-monospace, monospace">
          {mark}
        </text>
      ))}
    </svg>
  );
}

export function IssueThumb({ issue }: { issue: NetzbriefIssue }) {
  if (issue.clock && issue.clock.slots.length > 0) {
    const center = 90;
    const radius = 62;
    return (
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
        <rect width="320" height="180" fill="hsl(var(--secondary))" />
        <circle cx="160" cy="90" r={radius} fill="none" stroke="hsl(var(--gridline))" />
        {issue.clock.slots.map((slot) => {
          const start = (slot.hour / 24) * Math.PI * 2 - Math.PI / 2;
          const end = ((slot.hour + 0.25) / 24) * Math.PI * 2 - Math.PI / 2;
          const outer = areaTrueRadius(slot.windSolarGw, issue.clock?.scaleGw ?? 40) * radius;
          if (outer <= 0) {
            return null;
          }
          return <path key={slot.hour} d={wedge(160, center, outer, start, end)} fill={slot.surplus ? "hsl(var(--c-bess) / 0.9)" : "hsl(var(--c-grid) / 0.45)"} />;
        })}
      </svg>
    );
  }
  if (issue.zones && issue.zones.slots.length > 1) {
    const slots = issue.zones.slots;
    const max = issue.zones.maxPct || 1;
    const xOf = (hour: number) => 16 + (hour / 24) * 288;
    const north = slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${90 - (slot.northPct / max) * 70}`).join(" ");
    const south = slots.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${90 + (slot.southPct / max) * 70}`).join(" ");
    return (
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
        <rect width="320" height="180" fill="hsl(var(--secondary))" />
        <path d={`${north} L ${xOf(slots[slots.length - 1].hour)} 90 L ${xOf(slots[0].hour)} 90 Z`} fill="hsl(var(--c-grid) / 0.55)" />
        <path d={`${south} L ${xOf(slots[slots.length - 1].hour)} 90 L ${xOf(slots[0].hour)} 90 Z`} fill="hsl(var(--c-grid) / 0.28)" />
      </svg>
    );
  }
  const series = issue.peak?.slots ?? issue.storage?.slots.map((slot) => ({ hour: slot.hour, beforeKw: slot.residualGw, afterKw: slot.residualGw - slot.dischargeGw })) ?? [];
  if (series.length > 1) {
    const values = series.flatMap((slot) => [slot.beforeKw, slot.afterKw]);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const xOf = (hour: number) => 16 + (hour / 24) * 288;
    const yOf = (value: number) => 150 - ((value - min) / (max - min || 1)) * 120;
    const before = series.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.beforeKw)}`).join(" ");
    const after = series.map((slot, index) => `${index === 0 ? "M" : "L"} ${xOf(slot.hour)} ${yOf(slot.afterKw)}`).join(" ");
    return (
      <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
        <rect width="320" height="180" fill="hsl(var(--secondary))" />
        <path d={before} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        <path d={after} fill="none" stroke="hsl(var(--c-bess))" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="180" fill="hsl(var(--secondary))" />
    </svg>
  );
}
