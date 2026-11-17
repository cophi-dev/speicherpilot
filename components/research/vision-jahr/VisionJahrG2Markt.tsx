"use client";

import { useMemo } from "react";

import { yAxisTickLabelDy } from "@/components/research/chartY";
import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { formatVisionGwOne, formatVisionGwPlain } from "@/lib/research/visionJahrFormat";
import { visionAxisFontSize } from "@/lib/research/visionChartMetrics";
import { layoutG2StressCapLabel } from "@/lib/research/visionG2CapLabel";
import { G2_Y_AXIS_MAX_GW } from "@/lib/research/visionJahrG2Stress";
import type { VisionJahrModel, VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

import styles from "@/components/research/research.module.css";

const Y_MIN = 50;
const Y_MAX = G2_Y_AXIS_MAX_GW;
const X_MAX = 100;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 36;
const PAD_BOTTOM_BASE = 56;

const SERIES_KEYS: VisionJahrStufeKey[] = ["x2", "x5", "NEP A", "x10", "NEP B", "NEP C"];
const X_TICKS = [0, 25, 50, 75, 100];

function xPos(gw: number, width: number) {
  return PAD_LEFT + (gw / X_MAX) * (width - PAD_LEFT - PAD_RIGHT);
}

function yPos(gw: number, height: number, padBottom: number) {
  const inner = height - PAD_TOP - padBottom;
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, gw));
  return PAD_TOP + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * inner;
}

function polyline(parts: Array<{ x: number; y: number }>): string {
  return parts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function VisionJahrG2Markt({ model, width, height }: { model: VisionJahrModel; width: number; height: number }) {
  const axisFs = visionAxisFontSize(width);
  const padBottom = width < 480 ? 68 : PAD_BOTTOM_BASE;

  const points = useMemo(() => {
    const p0 = model.peakGw;
    const rows: Array<{ powerGw: number; spitze: number; key: VisionJahrStufeKey | null }> = [
      { powerGw: model.curve[0]!.powerGw, spitze: p0, key: null },
      ...SERIES_KEYS.map((key) => {
        const st = model.stages2h.find((s) => s.key === key)!;
        return {
          powerGw: st.powerGw,
          spitze: st.spitzeNach2hGw,
          key,
        };
      }),
    ];
    return rows
      .sort((a, b) => a.powerGw - b.powerGw)
      .map((row) => {
        const stressGw = row.key ? model.marktStressTestGw[row.key] : p0;
        return {
          powerGw: row.powerGw,
          x: xPos(row.powerGw, width),
          ySpitze: yPos(row.spitze, height, padBottom),
          yLow: yPos(row.key ? model.marktRueckwirkungLowGw[row.key] : p0, height, padBottom),
          yHigh: yPos(row.key ? model.marktRueckwirkungHighGw[row.key] : p0, height, padBottom),
          stressGw,
          yStress: yPos(stressGw, height, padBottom),
          stressClipped: stressGw > Y_MAX,
        };
      });
  }, [height, model, padBottom, width]);

  const spitzePts = points.map((p) => ({ x: p.x, y: p.ySpitze }));
  const lowPts = points.map((p) => ({ x: p.x, y: p.yLow }));
  const highPts = points.map((p) => ({ x: p.x, y: p.yHigh }));
  const stressPts = points.map((p) => ({ x: p.x, y: p.yStress }));

  const band =
    `${polyline(highPts)} L${lowPts[lowPts.length - 1]!.x.toFixed(1)},${lowPts[lowPts.length - 1]!.y.toFixed(1)} ` +
    [...lowPts].reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    " Z";

  const refY = yPos(model.peakGw, height, padBottom);
  const stressMax = Math.max(...SERIES_KEYS.map((k) => model.marktStressTestGw[k]));
  const yTicks = [50, 60, 70, 80, 90, 100];
  const lastClipped = [...points].reverse().find((p) => p.stressClipped);
  const capLabel = lastClipped
    ? layoutG2StressCapLabel({
        width,
        height,
        padBottom,
        capMarkerX: lastClipped.x,
        stressMaxGw: stressMax,
        fontSize: axisFs,
      })
    : null;

  return (
    <div className={styles.chartClip}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.chartFixed} role="img" aria-label="Markt und spitzenorientiert über das Jahr">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(tick, height, padBottom)} y2={yPos(tick, height, padBottom)} stroke="var(--research-line)" />
            <text x={PAD_LEFT - 8} y={yPos(tick, height, padBottom) + yAxisTickLabelDy(tick)} textAnchor="end" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          </g>
        ))}
        {X_TICKS.map((gw) => (
          <text key={gw} x={xPos(gw, width)} y={height - 28} textAnchor="middle" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {gw}
          </text>
        ))}
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={refY} y2={refY} stroke="var(--research-muted)" strokeWidth={1.25} />
        <text x={width - PAD_RIGHT} y={refY - 6} textAnchor="end" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          beobachtet {formatVisionGwOne(model.peakGw)} GW
        </text>
        <path d={band} fill="color-mix(in srgb, var(--research-muted) 20%, transparent)" stroke="none" />
        <path d={polyline(lowPts)} fill="none" stroke="var(--research-muted)" strokeWidth={1.25} opacity={0.75} />
        <path d={polyline(highPts)} fill="none" stroke="var(--research-muted)" strokeWidth={1.25} />
        <path d={polyline(spitzePts)} fill="none" stroke="var(--research-accent)" strokeWidth={2.25} />
        {spitzePts.slice(1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="var(--research-accent)" />
        ))}
        <path d={polyline(stressPts)} fill="none" stroke="var(--research-dim)" strokeWidth={1.5} strokeDasharray="4 3" />
        {points
          .filter((p) => p.stressClipped)
          .map((p) => (
            <g key={p.powerGw}>
              <text x={p.x} y={yPos(Y_MAX, height, padBottom) - 4} textAnchor="middle" fontSize={axisFs} fill="var(--research-dim)" fontFamily="var(--font-jetbrains-mono)">
                ↑
              </text>
            </g>
          ))}
        {capLabel ? (
          <text x={capLabel.x} y={capLabel.y} textAnchor="end" fontSize={axisFs} fill="var(--research-dim)" fontFamily="var(--font-jetbrains-mono)">
            {capLabel.text}
          </text>
        ) : null}
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize={axisFs} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          Batterieleistung gesamt [GW]
        </text>
      </svg>
      <div className={styles.legendInline} role="list" aria-label="Legende">
        <span role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchSpitze}`} aria-hidden />
          spitzenorientiert (national)
        </span>
        <span role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchBand}`} aria-hidden />
          Preisrückwirkung (Band)
        </span>
        <span role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchRueckLow}`} aria-hidden />
          nach Preis, mit Preisrückwirkung (grob, unten)
        </span>
        <span role="listitem">
          <span className={`${styles.legendSwatch} ${styles.legendSwatchStress}`} aria-hidden />
          Stresstest ohne Rückwirkung (bis {formatVisionGwOne(stressMax)} GW)
        </span>
      </div>
      <VisionJahrChartFoot />
      <p className={styles.meta}>
        Preisrückwirkung grob aus historischen Preisen geschätzt (Band: einfache bis doppelte Wirkung), keine Prognose · nur Day-Ahead, kein Intraday oder Regelenergie · Tagesvoraussicht NEP A:{" "}
        {formatVisionGwPlain(model.tageshorizontNepASenkungGw)} Senkung
      </p>
    </div>
  );
}