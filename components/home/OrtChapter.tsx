"use client";

import Link from "next/link";
import { useMemo } from "react";

import { supermarketTeachingDay } from "@/lib/peakShavingExplain";
import { formatQuantity } from "@/lib/formatQuantity";
import { HAMBURG_SUPERMARKET } from "@/lib/hamburgSupermarket";

const W = 1152;
const H = 240;
const PAD = { top: 16, right: 48, bottom: 36, left: 40 };

export function OrtChapter() {
  const teach = useMemo(() => supermarketTeachingDay(), []);
  const peakBefore = Math.round(teach.peakBeforeKw);
  const peakAfter = Math.round(teach.peakAfterKw);
  const limit = teach.limitKw;
  const peakHour = teach.peakHour;

  const { path, overPath, peakX, peakY } = useMemo(() => {
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const yMax = 125;
    const pts = teach.quarters;
    const x = (i: number) => PAD.left + (i / (pts.length - 1)) * plotW;
    const y = (kw: number) => PAD.top + plotH - (kw / yMax) * plotH;
    const loadPath = pts
      .map((q, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(q.loadKw).toFixed(1)}`)
      .join(" ");
    let maxLoad = 0;
    let maxI = 0;
    const overParts: string[] = [];
    pts.forEach((q, i) => {
      if (q.loadKw > limit) {
        overParts.push(`${overParts.length ? "L" : "M"} ${x(i).toFixed(1)} ${y(q.loadKw).toFixed(1)}`);
        overParts.push(`L ${x(i).toFixed(1)} ${y(limit).toFixed(1)}`);
      }
      if (q.loadKw > maxLoad) {
        maxLoad = q.loadKw;
        maxI = i;
      }
    });
    return {
      path: loadPath,
      overPath: overParts.join(" "),
      peakX: x(maxI),
      peakY: y(maxLoad),
    };
  }, [teach.quarters, limit]);

  const limitY = PAD.top + (H - PAD.top - PAD.bottom) - (limit / 125) * (H - PAD.top - PAD.bottom);

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-ort">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">03 · Der Ort</p>
        <h2 id="kapitel-ort" className="v4-chapter-h2">
          Ob das dem Netz hilft, entscheidet sich vor Ort
        </h2>
        <div className="v4-ort-kern">
          <p className="v4-ort-kw num">
            {formatQuantity(peakBefore, "de", 0)} → {formatQuantity(peakAfter, "de", 0)} kW
          </p>
          <p className="v4-ort-side">
            Spitze eines Supermarkts, {formatQuantity(limit, "de", 0)} kW Anschluss.{" "}
            <span className="v4-chip num">Beispieldaten</span>
          </p>
        </div>
      </div>
      <ol className="v4-st-steps v4-content">
        <li>
          <span className="v4-st-num num">01</span>
          <p>Gegen {formatQuantity(Math.floor(peakHour), "de", 0)}:{peakHour % 1 >= 0.5 ? "30" : "00"} Uhr braucht der Markt {formatQuantity(peakBefore, "de", 0)} kW.</p>
        </li>
        <li>
          <span className="v4-st-num num">02</span>
          <p>Der Anschluss lässt {formatQuantity(limit, "de", 0)} kW zu.</p>
        </li>
        <li>
          <span className="v4-st-num num">03</span>
          <p>
            Ein Speicher mit {formatQuantity(HAMBURG_SUPERMARKET.powerKw, "de", 0)} kW und{" "}
            {formatQuantity(HAMBURG_SUPERMARKET.energyKwh, "de", 0)} kWh gibt die{" "}
            {formatQuantity(peakBefore - limit, "de", 0)} kW darüber ab. Die Spitze bleibt bei{" "}
            {formatQuantity(limit, "de", 0)} kW (Modell).
          </p>
        </li>
      </ol>
      <div className="v4-content v4-ort-chart-wrap">
        <svg className="v4-ort-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Lastgang Supermarkt und Anschlussgrenze">
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={limitY}
            y2={limitY}
            className="v4-ort-limit"
            strokeDasharray="4 4"
          />
          <text x={W - PAD.right} y={limitY - 6} textAnchor="end" className="v4-ort-limit-label num">
            Anschluss {formatQuantity(limit, "de", 0)} kW
          </text>
          <path d={overPath} className="v4-ort-over" />
          <path d={path} className="v4-ort-line" fill="none" />
          <text x={peakX + 8} y={peakY} className="v4-ort-peak-label num">
            {formatQuantity(peakBefore, "de", 0)} kW
          </text>
          {[0, 12, 24].map((h) => {
            const x = PAD.left + (h / 24) * (W - PAD.left - PAD.right);
            return (
              <text key={h} x={x} y={H - 8} textAnchor="middle" className="v4-luecke-axis num">
                {String(h).padStart(2, "0")}:00
              </text>
            );
          })}
        </svg>
      </div>
      <div className="v4-ort-doors v4-content">
        <Link href="/ort?sicht=projekt" className="v4-door">
          <span className="v4-door-title">Ich entwickle Speicherprojekte</span>
          <span className="v4-door-label num">→</span>
        </Link>
        <Link href="/ort?sicht=netz" className="v4-door">
          <span className="v4-door-title">Ort prüfen</span>
          <span className="v4-door-label num">Netz</span>
        </Link>
      </div>
    </section>
  );
}
