import Link from "next/link";

import styles from "@/components/home/PreisFenster.module.css";
import { formatQuantity } from "@/lib/formatQuantity";
import { niceAxis } from "@/lib/niceTicks";
import { computeDauerSpanne, preisFigurSatz, type PreisTick } from "@/lib/preisFenster";

const VIEW_W = 720;
const VIEW_H = 240;
const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;

export function PreisFenster({
  dateLabel,
  points,
  powerGw,
  energyGwh,
  surplusGwh,
}: {
  dateLabel: string;
  points: PreisTick[];
  powerGw: number;
  energyGwh: number;
  surplusGwh: number;
}) {
  if (points.length < 2) {
    return null;
  }
  const dauer = computeDauerSpanne(points, powerGw, energyGwh);
  const satz = preisFigurSatz({ surplusGwh, dauer });
  const values = points.map((point) => point.eurPerMwh);
  const axis = niceAxis(Math.min(...values), Math.max(...values), 4);
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const yOf = (value: number) => PAD_T + ((axis.max - value) / (axis.max - axis.min)) * plotH;
  const xOf = (index: number) => PAD_L + (index / (points.length - 1)) * plotW;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xOf(index).toFixed(1)},${yOf(point.eurPerMwh).toFixed(1)}`)
    .join(" ");
  const marked = new Set([...(dauer?.low ?? []), ...(dauer?.high ?? [])].map((point) => `${point.hm}|${point.eurPerMwh}`));
  const labelEvery = Math.max(1, Math.round(points.length / 4));

  return (
    <figure className={styles.figure} data-testid="preis-fenster">
      <div className={styles.frame}>
        <svg className={styles.svg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={satz}>
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line className={styles.grid} x1={PAD_L} x2={VIEW_W - PAD_R} y1={yOf(tick)} y2={yOf(tick)} />
              <text className={styles.axis} x={PAD_L - 8} y={yOf(tick)} textAnchor="end" dominantBaseline="middle">
                {formatQuantity(tick, "de", 0)}
              </text>
            </g>
          ))}
          {axis.min < 0 && axis.max > 0 ? (
            <line className={styles.zero} x1={PAD_L} x2={VIEW_W - PAD_R} y1={yOf(0)} y2={yOf(0)} />
          ) : null}
          <path className={styles.line} d={path} />
          {points.map((point, index) =>
            marked.has(`${point.hm}|${point.eurPerMwh}`) ? (
              <circle key={`${point.hm}-${index}`} className={styles.mark} cx={xOf(index)} cy={yOf(point.eurPerMwh)} r={3.5} />
            ) : null,
          )}
          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text
                key={`x-${point.hm}-${index}`}
                className={styles.axis}
                x={xOf(index)}
                y={VIEW_H - 8}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              >
                {point.hm}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <figcaption className="v4-footnote">
        <p>
          Börsenpreis am {dateLabel}, €/MWh. {satz}
        </p>
        <p>
          Quelle: Energy-Charts, Day-Ahead DE-LU, Bundesnetzagentur | SMARD.de, CC BY 4.0.{" "}
          <Link href="/methodik#preis-fenster" className="v4-footnote-link">
            Formel, Einheit, Unsicherheit
          </Link>
          . Die markierten Punkte sind das günstige und das teure Fenster
          {dauer ? ` (${dauer.n} Viertelstunden, Flotte ${formatQuantity(powerGw, "de", 2)} GW / ${formatQuantity(energyGwh, "de", 2)} GWh)` : ""}.
          {dauer
            ? ` Handrechnung dieses Tages: ${formatQuantity(dauer.meanLow, "de", 2)} und ${formatQuantity(dauer.meanHigh, "de", 2)}.`
            : ""}
        </p>
      </figcaption>
    </figure>
  );
}
