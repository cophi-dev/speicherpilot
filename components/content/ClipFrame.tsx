"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/components/content/contentClip.module.css";
import { clamp01, easeInOutCubic, easeOutCubic, samplePiecewise } from "@/lib/content/clipEasing";
import { formatGwSenkung, GW_MINUS, RESEARCH_FLEET_POWER_MW } from "@/lib/research/fleetBasis";
import type { ResearchHomeModel, ResearchFactor, ResearchWeekDay, VisionPageModel } from "@/lib/research/researchTypes";

const Y_MIN = 45;
const Y_MAX = 70;
const V_Y_MAX = 20;
const V_X_MAX = 100;

function yRes(gw: number, h: number) {
  const inner = h - 66;
  return 26 + ((Y_MAX - gw) / (Y_MAX - Y_MIN)) * inner;
}

function xSeries(i: number, n: number, w: number) {
  return 40 + (i / Math.max(1, n - 1)) * (w - 76);
}

function xVis(gw: number, w: number) {
  return 40 + (gw / V_X_MAX) * (w - 72);
}

function yVis(reduction: number, h: number) {
  const inner = h - 100;
  const clamped = Math.max(0, Math.min(V_Y_MAX, reduction));
  return 36 + (clamped / V_Y_MAX) * inner;
}

function weekHeadlineText(week: ResearchWeekDay[]): string {
  const vals = week.map((d) => d.points.find((p) => p.factor === 2)!.reduction175Gw);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const fmt = (gw: number) => (Math.round(gw * 10) / 10).toFixed(1).replace(".", ",");
  return `Letzte Woche hätte doppelt so viel Speicher die Abendspitze jeden Tag um ${fmt(min)} bis ${fmt(max)} GW gesenkt.`;
}

function reductionAtFactor(model: ResearchHomeModel, factor: number): number {
  if (factor <= 1) return 0;
  const stage = model.day.stages.find((s) => s.factor === factor);
  if (stage) return stage.reductionGw;
  const keys: ResearchFactor[] = [2, 5, 10];
  const vals = keys.map((f) => model.day.stages.find((s) => s.factor === f)!.reductionGw);
  const fs = [2, 5, 10];
  if (factor <= 2) return vals[0]! * (factor - 1);
  if (factor <= 5) return vals[0]! + ((vals[1]! - vals[0]!) * (factor - 2)) / 3;
  return vals[1]! + ((vals[2]! - vals[1]!) * (factor - 5)) / 5;
}

function capAtFactor(model: ResearchHomeModel, factor: number): number {
  if (factor <= 1.01) return model.day.peakGw;
  const stage = model.day.stages.find((s) => s.factor === Math.round(factor) as ResearchFactor);
  return stage?.capGw ?? model.day.peakGw - reductionAtFactor(model, factor);
}

function GesternClip({ t, model, w, h }: { t: number; model: ResearchHomeModel; w: number; h: number }) {
  const series = model.day.series;
  const n = series.length;
  const lineP = easeOutCubic(clamp01(t / 3));
  const fracIdx = lineP * (n - 1);
  const endIdx = Math.max(1, Math.floor(fracIdx));
  const segFrac = fracIdx - endIdx;
  const factor = samplePiecewise(t, [
    { t: 0, v: 1 },
    { t: 3, v: 1 },
    { t: 10, v: 10 },
  ]);
  const reduction = reductionAtFactor(model, factor);
  const cap = capAtFactor(model, factor);
  const capY = yRes(cap, h);

  const linePts = series.slice(0, endIdx + 1);
  let lineD = linePts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xSeries(i, n, w).toFixed(1)},${yRes(p.residualGw, h).toFixed(1)}`)
    .join(" ");
  if (endIdx < n - 1 && segFrac > 0.001) {
    const a = series[endIdx]!;
    const b = series[endIdx + 1]!;
    const x = xSeries(endIdx, n, w) + segFrac * (xSeries(endIdx + 1, n, w) - xSeries(endIdx, n, w));
    const y = yRes(a.residualGw, h) + segFrac * (yRes(b.residualGw, h) - yRes(a.residualGw, h));
    lineD += ` L${x.toFixed(1)},${y.toFixed(1)}`;
  }

  const fillPaths = useMemo(() => {
    const run: string[] = [];
    let open: Array<{ x: number; y: number }> = [];
    const flush = () => {
      if (open.length < 2) {
        open = [];
        return;
      }
      const top = open.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");
      const bot = [...open].reverse().map((p) => `${p.x.toFixed(1)},${capY.toFixed(1)}`).join(" L");
      run.push(`M${top} L${bot} Z`);
      open = [];
    };
    const clipPts = [...linePts];
    if (endIdx < n - 1 && segFrac > 0.001) {
      const a = series[endIdx]!;
      const b = series[endIdx + 1]!;
      clipPts.push({
        ...b,
        residualGw: a.residualGw + segFrac * (b.residualGw - a.residualGw),
      });
    }
    clipPts.forEach((p, i) => {
      const x = i < linePts.length ? xSeries(i, n, w) : xSeries(endIdx, n, w) + segFrac * (xSeries(endIdx + 1, n, w) - xSeries(endIdx, n, w));
      const y = yRes(p.residualGw, h);
      if (p.residualGw > cap) open.push({ x, y });
      else flush();
    });
    flush();
    return run;
  }, [cap, capY, endIdx, h, linePts, n, segFrac, series, w]);

  const showEnd = t >= 7.2;
  const numOpacity = clamp01((t - 3) / 1.2);

  return (
  <>
    <p className={styles.heroNum} style={{ opacity: numOpacity }}>
      {formatGwSenkung(reduction)}
    </p>
    <div className={styles.chartBox}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <line x1={40} x2={w - 36} y1={yRes(Y_MIN, h)} y2={yRes(Y_MIN, h)} stroke="var(--clip-line)" strokeWidth={1} />
        <line x1={40} x2={w - 36} y1={capY} y2={capY} stroke="var(--clip-accent)" strokeWidth={2.5} />
        {fillPaths.map((d) => (
          <path key={d.slice(0, 24)} d={d} fill="var(--clip-accent)" opacity={0.35} />
        ))}
        <path d={lineD} fill="none" stroke="var(--clip-fg)" strokeWidth={2.5} />
      </svg>
    </div>
    {showEnd ? (
      <>
        <h1 className={`${styles.title} ${styles.titleCompact}`}>{model.day.h1}</h1>
        <p className={styles.badge}>national · Modell</p>
      </>
    ) : null}
  </>
  );
}

function WocheClip({ t, model, w, h }: { t: number; model: ResearchHomeModel; w: number; h: number }) {
  const week = model.week;
  const vals = week.map((d) => d.points.find((p) => p.factor === 2)!.reduction175Gw);
  const yMax = Math.max(6, Math.ceil((Math.max(...vals) + 1.5) / 2) * 2);
  const colW = (w - 80) / week.length;
  const padTop = 40;
  const padBottom = 70;
  const yZero = padTop;
  const y = (v: number) => padTop + (v / yMax) * (h - padTop - padBottom);
  const barW = Math.min(48, colW * 0.62);
  const barSpan = 7;
  const showHeadline = t >= 6.8;
  const headOpacity = easeOutCubic(clamp01((t - 6.8) / 0.9));

  return (
    <>
      {showHeadline ? (
        <h1 className={styles.title} style={{ opacity: headOpacity }}>
          {weekHeadlineText(week)}
        </h1>
      ) : (
        <p className={styles.badge} style={{ opacity: 0.45 + 0.55 * clamp01(t / 6.8) }}>
          Letzte Woche · national (Modell)
        </p>
      )}
      <div className={styles.chartBox}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <text x={36} y={28} fontSize={14} fill="var(--clip-muted)" fontFamily="var(--font-jetbrains-mono)">
            GW
          </text>
          {week.map((day, col) => {
            const v = vals[col]!;
            const windowS = 7.5 / barSpan;
            const p = easeOutCubic(clamp01((t - col * windowS) / (windowS * 0.92)));
            const value = v * p;
            const cx = 56 + col * colW;
            const barTop = y(value);
            const barH = Math.max(2, y(0) - barTop);
            const label = `${GW_MINUS}${value.toFixed(2).replace(".", ",")}`;
            return (
              <g key={day.dateKey}>
                {day.isFocus ? (
                  <rect x={cx - barW * 0.7} y={padTop - 4} width={barW * 1.4} height={h - padBottom - padTop + 8} rx={8} fill="#121518" />
                ) : null}
                <rect
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={day.isFocus ? "var(--clip-accent)" : "#b4532a"}
                  opacity={day.isFocus ? 1 : 0.82}
                />
                <text x={cx} y={y(0) + 22} textAnchor="middle" fontSize={16} fill="var(--clip-fg)" fontFamily="var(--font-jetbrains-mono)">
                  {p > 0.08 ? label : ""}
                </text>
                <text x={cx} y={h - 32} textAnchor="middle" fontSize={18} fill="var(--clip-muted)" fontFamily="var(--font-jetbrains-mono)">
                  {day.weekdayShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

function VisionClip({ t, vision, w, h }: { t: number; vision: VisionPageModel; w: number; h: number }) {
  const pts = vision.curve;
  const p2 = easeOutCubic(clamp01(t / 3));
  const p4 = easeOutCubic(clamp01((t - 3) / 3));
  const markerT = easeInOutCubic(clamp01((t - 6) / 3));

  const frac2 = p2 * (pts.length - 1);
  const end2 = Math.max(1, Math.floor(frac2));
  const frac2Tail = frac2 - end2;
  const frac4 = p4 * (pts.length - 1);
  const end4 = Math.max(1, Math.floor(frac4));
  const frac4Tail = frac4 - end4;
  const buildLine = (key: "2" | "4", end: number, tail: number) => {
    const slice = pts.slice(0, end + 1);
    let d = slice.map((p, i) => `${i === 0 ? "M" : "L"}${xVis(p.powerGw, w).toFixed(1)},${yVis(p.senkungGw[key], h).toFixed(1)}`).join(" ");
    if (end < pts.length - 1 && tail > 0.001) {
      const a = pts[end]!;
      const b = pts[end + 1]!;
      const x = xVis(a.powerGw, w) + tail * (xVis(b.powerGw, w) - xVis(a.powerGw, w));
      const y = yVis(a.senkungGw[key], h) + tail * (yVis(b.senkungGw[key], h) - yVis(a.senkungGw[key], h));
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };
  const line2 = buildLine("2", end2, frac2Tail);
  const line4 = buildLine("4", end4, frac4Tail);

  const power = RESEARCH_FLEET_POWER_MW / 1000 + markerT * (46.4409022 - RESEARCH_FLEET_POWER_MW / 1000);
  let senk2 = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (power >= a.powerGw && power <= b.powerGw) {
      const u = (power - a.powerGw) / (b.powerGw - a.powerGw);
      senk2 = a.senkungGw["2"] + u * (b.senkungGw["2"] - a.senkungGw["2"]);
      break;
    }
  }
  const mx = xVis(power, w);
  const my = yVis(senk2, h);

  return (
    <>
      <p className={styles.badge}>Vision · Sättigung · {vision.monthLabel}</p>
      <div className={styles.chartBox}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <text x={xVis(92, w) - 8} y={yVis(vision.curve[vision.curve.length - 1]!.senkungGw["2"], h) - 8} fontSize={22} fill="var(--clip-fg)">
            2 h
          </text>
          <text x={xVis(92, w) - 8} y={yVis(vision.curve[vision.curve.length - 1]!.senkungGw["4"], h) - 8} fontSize={22} fill="var(--clip-muted)">
            4 h
          </text>
          <path d={line2} fill="none" stroke="var(--clip-fg)" strokeWidth={3} />
          <path d={line4} fill="none" stroke="var(--clip-muted)" strokeWidth={2.5} strokeDasharray="6 5" />
          {markerT > 0 ? (
            <g>
              <line x1={40} x2={mx} y1={my} y2={my} stroke="var(--clip-accent)" strokeWidth={2} opacity={0.5} />
              <circle cx={mx} cy={my} r={10} fill="var(--clip-accent)" />
            </g>
          ) : null}
        </svg>
      </div>
      <p className={styles.badge}>×1 → ×10 · national · Modell</p>
    </>
  );
}

export function ClipFrame({
  id,
  t: tProp,
  aspect,
  home,
  vision,
}: {
  id: string;
  t: number;
  aspect: "45" | "11";
  home: ResearchHomeModel;
  vision: VisionPageModel;
}) {
  const [t, setT] = useState(tProp);
  useEffect(() => {
    setT(tProp);
  }, [tProp]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __clipTApplied?: number }).__clipTApplied = t;
  }, [t]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as Window & { __clipSetT?: (next: number) => void }).__clipSetT = (next: number) => {
      setT(next);
    };
    return () => {
      delete (window as Window & { __clipSetT?: (next: number) => void }).__clipSetT;
    };
  }, []);

  const W = 1080;
  const H = aspect === "11" ? 1080 : 1350;
  const chartW = W - 96;
  const chartH = aspect === "11" ? 420 : 520;

  let body: React.ReactNode = null;
  if (id === "gestern") body = <GesternClip t={t} model={home} w={chartW} h={chartH} />;
  else if (id === "woche") body = <WocheClip t={t} model={home} w={chartW} h={chartH} />;
  else if (id === "vision") body = <VisionClip t={t} vision={vision} w={chartW} h={chartH} />;

  return (
    <div className={`${styles.root} ${aspect === "11" ? styles.aspect11 : ""}`} style={{ width: W, height: H }} data-clip-ready>
      <div className={styles.top}>
        <span className={styles.brand}>SpeicherPilot</span>
        <span className={styles.badge}>national · Modell</span>
      </div>
      <div className={styles.main}>{body}</div>
      <div className={styles.foot}>speicherpilot.app</div>
    </div>
  );
}
