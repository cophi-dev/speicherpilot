"use client";

import { useMemo } from "react";

import { yAxisTickLabelDy, yAxisUnitLabelY } from "@/components/research/chartY";
import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import type { VisionJahrModel } from "@/lib/research/visionJahrTypes";

import styles from "@/components/research/research.module.css";

const Y_MIN = 40;
const Y_MAX = 75;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 32;
const PAD_BOTTOM = 52;

const MONTHS = ["Nov", "Dez", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov"];

function yPos(gw: number, height: number) {
  const inner = height - PAD_TOP - PAD_BOTTOM;
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, gw));
  return PAD_TOP + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * inner;
}

export function VisionJahrG4Tage({ model, width, height }: { model: VisionJahrModel; width: number; height: number }) {
  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const barW = innerW / model.tagesspitzen.length;
  const kappeC = model.kappeNepCGw;
  const kappeA = model.kappeNepAGw;
  const annotIndex = model.tagesspitzen.findIndex((d) => d.tag === model.leerTagNepC);

  const monthTicks = useMemo(() => {
    const ticks: Array<{ x: number; label: string }> = [];
    let cursor = 0;
    for (let m = 0; m < MONTHS.length; m += 1) {
      const daysInSlice = m === 0 ? 15 : m === MONTHS.length - 1 ? 15 : m === 2 ? 31 : 30;
      if (m === 1 || m === 2) {
        const approxDays = m === 1 ? 31 : 28;
        cursor += m === 1 ? 15 : approxDays;
      } else if (m > 0 && m < MONTHS.length - 1) {
        cursor += 30;
      }
      ticks.push({ x: PAD_LEFT + cursor * barW, label: MONTHS[m]! });
    }
    return [
      { x: PAD_LEFT + 15 * barW, label: "Dez" },
      { x: PAD_LEFT + 45 * barW, label: "Feb" },
      { x: PAD_LEFT + 105 * barW, label: "Apr" },
      { x: PAD_LEFT + 165 * barW, label: "Jun" },
      { x: PAD_LEFT + 225 * barW, label: "Aug" },
      { x: PAD_LEFT + 285 * barW, label: "Okt" },
      { x: PAD_LEFT + 345 * barW, label: "Dez" },
    ];
  }, [barW]);

  const yTicks = [40, 45, 50, 55, 60, 65, 70, 75];
  const annot = annotIndex >= 0 ? model.tagesspitzen[annotIndex]! : null;

  return (
    <div className={styles.chartClip}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.chartFixed} role="img" aria-label="Tageshöchstwerte über das Jahr">
        <text x={PAD_LEFT - 8} y={yAxisUnitLabelY(PAD_TOP)} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          GW
        </text>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(tick, height)} y2={yPos(tick, height)} stroke="var(--research-line)" />
            <text x={PAD_LEFT - 8} y={yPos(tick, height) + yAxisTickLabelDy(tick)} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
              {tick}
            </text>
          </g>
        ))}
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(kappeC, height)} y2={yPos(kappeC, height)} stroke="var(--research-fg)" strokeWidth={1.25} />
        <text x={width - PAD_RIGHT} y={yPos(kappeC, height) - 4} textAnchor="end" fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
          NEP C hält {formatVisionGwOne(kappeC)} GW
        </text>
        <line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={yPos(kappeA, height)} y2={yPos(kappeA, height)} stroke="var(--research-muted)" strokeDasharray="4 3" />
        <text x={width - PAD_RIGHT} y={yPos(kappeA, height) + 14} textAnchor="end" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          NEP A {formatVisionGwOne(kappeA)}
        </text>
        {model.tagesspitzen.map((day, i) => {
          const x = PAD_LEFT + i * barW;
          const yTop = yPos(day.spitzeGw, height);
          const yBase = yPos(Y_MIN, height);
          const over = day.spitzeGw > kappeC;
          return (
            <a key={day.tag} href={`/tag/${day.tag}`} aria-label={`Tag ${day.tag}`}>
              <rect
                x={x}
                y={yTop}
                width={Math.max(1, barW - 0.2)}
                height={yBase - yTop}
                fill={over ? "var(--research-accent-light)" : "var(--research-dim)"}
                opacity={over ? 0.95 : 0.5}
              >
                <title>
                  {day.tag}: {formatVisionGwOne(day.spitzeGw)} GW
                </title>
              </rect>
            </a>
          );
        })}
        {annot ? (
          <g>
            <line
              x1={PAD_LEFT + annotIndex * barW + barW / 2}
              y1={yPos(annot.spitzeGw, height) - 6}
              x2={PAD_LEFT + annotIndex * barW + barW / 2}
              y2={PAD_TOP + 8}
              stroke="var(--research-fg)"
              strokeWidth={1}
            />
            <text x={PAD_LEFT + annotIndex * barW + barW / 2 + 6} y={PAD_TOP + 18} fontSize={12} fill="var(--research-fg)" fontFamily="var(--font-jetbrains-mono)">
              {annot.tag.slice(8, 10)}.{annot.tag.slice(5, 7)}.: Speicher leer
            </text>
          </g>
        ) : null}
        {monthTicks.map((tick) => (
          <text key={tick.label + tick.x} x={tick.x} y={height - 16} fontSize={11} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
            {tick.label}
          </text>
        ))}
        <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={12} fill="var(--research-muted)" fontFamily="var(--font-jetbrains-mono)">
          höchste Restlast des Tages [GW]
        </text>
      </svg>
      <VisionJahrChartFoot />
      <p className={styles.meta}>Tippen auf einen Tag öffnet /tag — {model.tageNepCCount} Tage über NEP-C-Kappe, fast nur Okt–März</p>
    </div>
  );
}