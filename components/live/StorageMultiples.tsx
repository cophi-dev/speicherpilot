"use client";

import { useId } from "react";

import { formatQuantity } from "@/lib/formatQuantity";
import type { MoreStorageReport, MoreStorageStep } from "@/lib/moreStorage";
import { niceAxis } from "@/lib/niceTicks";

type Language = "de" | "en";
type Variant = "page" | "landscape" | "portrait";

const INK = "#F4F7F8";
const MUTED = "#C5CDD1";
const TEAL = "#2AD4C8";
const GRID = "rgba(244,247,248,0.08)";
const ZERO = "rgba(244,247,248,0.35)";
const DASH = "#FF5C54";

function textOf(language: Language, copy: { de: string; en: string }) {
  return language === "de" ? copy.de : copy.en;
}

function posterFooter(storage: MoreStorageReport): string {
  const fleet = storage.fleet;
  const [year, month, day] = (storage.dateBerlin ?? "0000-00-00").split("-");
  const date = `${day}.${month}.${year}`;
  const power = fleet ? formatQuantity(fleet.powerGw, "de", 2) : "–";
  const energy = fleet ? formatQuantity(fleet.energyGwh, "de", 2) : "–";
  const asOf = fleet ? fleet.updatedLabel.de : "";
  const source =
    fleet?.source === "battery-charts"
      ? `Battery Charts (RWTH, aus MaStR), ${asOf}`
      : `Energy-Charts, Datengrundlage ${fleet?.datasource ?? ""}, ${asOf}`;
  return `Daten: Energy-Charts (Fraunhofer ISE), Last/Wind/Solar DE, ${date}, ¼h · Großspeicher heute ${power} GW / ${energy} GWh: ${source} · Modell: Start leer, 90 % Wirkungsgrad, nur Wind+Sonne > Last`;
}

function SeriesChart({
  step,
  yMinGw,
  yMaxGw,
  language,
  width,
  height,
}: {
  step: MoreStorageStep;
  yMinGw: number;
  yMaxGw: number;
  language: Language;
  width: number;
  height: number;
}) {
  const patternId = useId().replace(/:/g, "");
  const pad = { l: 46, r: 8, t: 18, b: 24 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const xOf = (hour: number) => pad.l + (hour / 24) * plotW;
  const yOf = (mw: number) => {
    const span = yMaxGw - yMinGw || 1;
    const share = (mw / 1000 - yMinGw) / span;
    return pad.t + (1 - share) * plotH;
  };
  const placed = step.points.map((point) => ({
    x: xOf(point.hour),
    residual: yOf(point.residualMw),
    zero: yOf(0),
    stored: yOf(-point.chargeMw),
    unstored: yOf(Math.min(0, point.residualMw)),
    shaved: yOf(point.residualMw - point.dischargeMw),
    rawTop: yOf(point.residualMw),
  }));
  const yTicks = niceAxis(yMinGw, yMaxGw).ticks;
  const xTicks = [0, 6, 12, 18, 24];
  const line = placed.map((point) => `${point.x.toFixed(1)},${point.residual.toFixed(1)}`).join(" ");
  const stored = band(placed, (point) => point.stored, (point) => point.zero);
  const unstored = band(placed, (point) => point.unstored, (point) => point.stored);
  const discharged = band(placed, (point) => point.rawTop, (point) => point.shaved);
  const eveningPeak = step.eveningPeakGw !== null && step.eveningPeakGw > 0 ? yOf(step.eveningPeakGw * 1000) : null;
  const label = `${textOf(language, step.title)}, ${textOf(language, step.shareLabel)} ${textOf(language, step.shareCaption)}, ${textOf(language, step.peakLabel)}`;

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
      <title>{label}</title>
      <defs>
        <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(244,247,248,0.55)" strokeWidth="1.4" />
        </pattern>
      </defs>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={width - pad.r} y1={yOf(tick * 1000)} y2={yOf(tick * 1000)} stroke={tick === 0 ? ZERO : GRID} />
          <text x={pad.l - 6} y={yOf(tick * 1000) + 4} textAnchor="end" fill={MUTED} fontSize="11">
            {tick === yMaxGw ? `${tick} GW` : String(tick)}
          </text>
        </g>
      ))}
      {xTicks.map((hour) => (
        <g key={hour}>
          <line x1={xOf(hour)} x2={xOf(hour)} y1={pad.t} y2={height - pad.b} stroke={GRID} />
          <text x={xOf(hour)} y={height - 6} textAnchor="middle" fill={MUTED} fontSize="11">
            {String(hour).padStart(2, "0")}
          </text>
        </g>
      ))}
      {unstored ? <polygon points={unstored} fill={`url(#${patternId})`} /> : null}
      {stored ? <polygon points={stored} fill={TEAL} opacity="0.9" /> : null}
      {discharged ? <polygon points={discharged} fill={TEAL} opacity="0.9" /> : null}
      {eveningPeak !== null ? (
        <line
          x1={xOf(17)}
          x2={xOf(24)}
          y1={eveningPeak}
          y2={eveningPeak}
          stroke={DASH}
          strokeDasharray="5 4"
          strokeWidth="1.5"
        />
      ) : null}
      {line ? <polyline points={line} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /> : null}
      {eveningPeak !== null ? (
        <text x={xOf(23.6)} y={Math.max(pad.t + 12, eveningPeak - 6)} textAnchor="end" fill={INK} fontSize="12">
          {textOf(language, step.peakLabel)}
        </text>
      ) : (
        <text x={width - pad.r} y={pad.t + 14} textAnchor="end" fill={MUTED} fontSize="12">
          {textOf(language, step.peakLabel)}
        </text>
      )}
    </svg>
  );
}

type PlotPoint = {
  x: number;
  residual: number;
  zero: number;
  stored: number;
  unstored: number;
  shaved: number;
  rawTop: number;
};

function band(points: PlotPoint[], top: (point: PlotPoint) => number, bottom: (point: PlotPoint) => number): string | null {
  if (points.length < 2) {
    return null;
  }
  const forward = points.map((point) => `${point.x.toFixed(1)},${top(point).toFixed(1)}`).join(" ");
  const back = [...points].reverse().map((point) => `${point.x.toFixed(1)},${bottom(point).toFixed(1)}`).join(" ");
  return `${forward} ${back}`;
}

function Legend({ language }: { language: Language }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const item = "inline-flex items-center gap-2";
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px]" style={{ color: MUTED }}>
      <span className={item}>
        <svg width="18" height="12" aria-hidden="true"><rect width="18" height="12" fill={TEAL} /></svg>
        {tx("gespeichert / abgegeben", "stored / released")}
      </span>
      <span className={item}>
        <svg width="18" height="12" aria-hidden="true">
          <rect width="18" height="12" fill="rgba(244,247,248,0.08)" />
          <path d="M0 12 L12 0 M6 12 L18 0 M-6 12 L6 0" stroke="rgba(244,247,248,0.7)" strokeWidth="1.2" />
        </svg>
        {tx("Überschuss, nicht gespeichert", "surplus, not stored")}
      </span>
      <span className={item}>
        <svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke={INK} strokeWidth="1.6" /></svg>
        {tx("Residuallast: Last − Wind − Sonne", "Residual load: load − wind − solar")}
      </span>
      <span className={item}>
        <svg width="18" height="12" aria-hidden="true"><line x1="0" y1="6" x2="18" y2="6" stroke={DASH} strokeDasharray="4 3" strokeWidth="1.5" /></svg>
        {tx("Abendspitze ohne Speicher", "Evening peak without storage")}
      </span>
    </div>
  );
}

function StepHeading({ step, language, big }: { step: MoreStorageStep; language: Language; big: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={big ? "text-[22px] font-medium" : "text-base font-medium"} style={{ color: INK }}>
          {textOf(language, step.title)}
        </p>
        <p className="num text-[13px]" style={{ color: MUTED }}>
          {textOf(language, step.fleetLabel)}
        </p>
      </div>
      <p className={`num leading-none ${big ? "mt-1 text-[40px]" : "mt-1 text-[32px]"}`} style={{ color: TEAL }}>
        {textOf(language, step.shareLabel)}
      </p>
      <p className="text-[12px] leading-tight" style={{ color: MUTED }}>
        {textOf(language, step.shareCaption)}
      </p>
      {step.estimateNote ? (
        <p className="mt-1 text-[13px] font-medium leading-tight" style={{ color: "#E7B008" }}>
          {textOf(language, step.estimateNote)}
        </p>
      ) : null}
    </div>
  );
}

export function StoragePoster({
  storage,
  language,
  variant,
}: {
  storage: MoreStorageReport;
  language: Language;
  variant: Variant;
}) {
  const spoken = variant === "page" ? language : "de";
  if (!storage.available || storage.steps.length === 0) {
    return null;
  }
  const landscape = variant === "landscape";
  const portrait = variant === "portrait";
  const fixed = landscape || portrait;
  const chartW = landscape ? 470 : portrait ? 760 : 520;
  const chartH = landscape ? 390 : portrait ? 230 : 230;

  const body = (
    <>
      <p className="text-[12px] tracking-[0.14em] uppercase" style={{ color: TEAL }}>
        SpeicherPilot · Deutschland · <span style={{ color: "#E7B008" }}>Modellschätzung</span>
      </p>
      <h2
        id={variant === "page" ? "more-storage-title" : undefined}
        className={fixed ? "mt-2 font-medium leading-tight" : "mt-2 text-[28px] leading-tight font-medium md:text-[36px]"}
        style={fixed ? { fontSize: portrait ? 42 : 36, color: INK, marginTop: 8 } : { color: INK }}
      >
        {textOf(spoken, storage.headline)}
      </h2>
      <p
        className={fixed ? "mt-2 max-w-[62ch] leading-snug" : "mt-2 max-w-[68ch] text-sm leading-snug md:text-base"}
        style={fixed ? { fontSize: portrait ? 20 : 16, color: MUTED, marginTop: 8 } : { color: MUTED }}
      >
        {textOf(spoken, storage.subhead)}
      </p>
      {fixed ? (
        <p className="max-w-[70ch] leading-snug" style={{ fontSize: portrait ? 18 : 15, color: INK, marginTop: 8 }}>
          Die Kurve ist die Residuallast: was andere Kraftwerke und Import liefern müssen, wenn Wind und Sonne von der Last abgezogen sind.
        </p>
      ) : null}
      <div
        className={fixed ? undefined : "mt-4 grid gap-4 lg:grid-cols-3"}
        style={
          fixed
            ? {
                display: "flex",
                flexDirection: portrait ? "column" : "row",
                gap: portrait ? 8 : 18,
                marginTop: 16,
                flex: 1,
                minHeight: 0,
              }
            : undefined
        }
      >
        {storage.steps.map((step) => (
          <div key={step.id} style={fixed ? { flex: 1, minWidth: 0, display: "flex", flexDirection: portrait ? "row" : "column", gap: 8 } : undefined}>
            <div style={portrait ? { width: 220, flex: "none" } : undefined}>
              <StepHeading step={step} language={spoken} big={fixed && !portrait} />
            </div>
            <div style={fixed ? { flex: 1, minWidth: 0, minHeight: chartH } : { height: 230 }}>
              <SeriesChart
                step={step}
                yMinGw={storage.yMinGw}
                yMaxGw={storage.yMaxGw}
                language={spoken}
                width={chartW}
                height={chartH}
              />
            </div>
          </div>
        ))}
      </div>
      {variant === "page" ? <Legend language={spoken} /> : <FixedLegend />}
      <p className={fixed ? "mt-3 leading-snug" : "mt-3 text-[11px] leading-snug"} style={{ color: MUTED, fontSize: fixed ? 13 : undefined }}>
        {posterFooter(storage)}
      </p>
    </>
  );

  if (!fixed) {
    return <div className="bg-[#101418] p-4 text-white md:p-6">{body}</div>;
  }

  return (
    <div
      style={{
        width: landscape ? 1600 : 1080,
        height: landscape ? 900 : 1350,
        background: "#101418",
        color: INK,
        padding: landscape ? 36 : 40,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {body}
    </div>
  );
}

function FixedLegend() {
  const items: Array<{ swatch: "teal" | "hatch" | "line" | "dash"; label: string }> = [
    { swatch: "teal", label: "gespeichert / abgegeben" },
    { swatch: "hatch", label: "Überschuss, nicht gespeichert" },
    { swatch: "line", label: "Last − Wind − Sonne (Residuallast)" },
    { swatch: "dash", label: "Abendspitze ohne Speicher" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 8, color: MUTED, fontSize: 13 }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <svg width="18" height="12" aria-hidden="true">
            {item.swatch === "teal" ? <rect width="18" height="12" fill={TEAL} /> : null}
            {item.swatch === "hatch" ? (
              <>
                <rect width="18" height="12" fill="rgba(244,247,248,0.08)" />
                <path d="M0 12 L12 0 M6 12 L18 0" stroke="rgba(244,247,248,0.7)" strokeWidth="1.2" />
              </>
            ) : null}
            {item.swatch === "line" ? <line x1="0" y1="6" x2="18" y2="6" stroke={INK} strokeWidth="1.6" /> : null}
            {item.swatch === "dash" ? <line x1="0" y1="6" x2="18" y2="6" stroke={DASH} strokeDasharray="4 3" strokeWidth="1.5" /> : null}
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}

