"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

import styles from "@/components/research/research.module.css";
import { useMeasuredChartWidth } from "@/components/research/useMeasuredChartWidth";
import { useResearchLayout } from "@/components/research/useResearchLayout";
import { VisionPlot } from "@/components/research/VisionPlot";
import { VisionJahrChartFoot } from "@/components/research/vision-jahr/VisionJahrChartFoot";
import { VisionJahrG2Markt } from "@/components/research/vision-jahr/VisionJahrG2Markt";
import { VisionJahrG3Ueberschuss } from "@/components/research/vision-jahr/VisionJahrG3Ueberschuss";
import { VisionJahrG4Tage } from "@/components/research/vision-jahr/VisionJahrG4Tage";
import { VisionJahrKernsatzBlock } from "@/components/research/VisionJahrKernsatz";
import {
  formatVisionDurationDe,
  formatVisionGermanDate,
  formatVisionGwOne,
  formatVisionGwPlain,
  formatVisionPercentWhole,
} from "@/lib/research/visionJahrFormat";
import { visionJahrUeberschussPct } from "@/lib/research/visionJahrData";
import type { VisionJahrModel } from "@/lib/research/visionJahrTypes";
import type { VisionStageId } from "@/lib/research/researchTypes";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatGwSenkung, GW_MINUS } from "@/lib/research/fleetBasis";
import surplusMonthsData from "@/data/surplus-months.json";

const MONTH_SHORT_DE: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mär",
  "04": "Apr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Okt",
  "11": "Nov",
  "12": "Dez",
};

function shortMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_SHORT_DE[m ?? ""] ?? m} '${(y ?? "").slice(2)}`;
}

const DURATIONS = [
  { key: "2" as const, label: `2\u00a0h` },
  { key: "4" as const, label: `4\u00a0h (Sensitivität)` },
];

const VISION_SKIP_KEY = "speicherpilot-vision-guess-skip";

export function VisionPage({ model, kernsatz }: { model: VisionJahrModel; kernsatz?: string }) {
  const reduced = useReducedMotion();
  const layout = useResearchLayout();
  const pageRef = useRef<HTMLDivElement>(null);
  const chartWidth = useMeasuredChartWidth(pageRef, layout.vision.width);
  const [duration, setDuration] = useState<"2" | "4">("2");
  const [stageId, setStageId] = useState<VisionStageId>(model.defaultStage);
  const [guessMode, setGuessMode] = useState(false);
  const [gapLabel, setGapLabel] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(true);

  const stage = model.curve.find((s) => s.id === stageId)!;
  const durationKey = duration === "2" ? "2" : "4";
  const truth = stage.senkungGw[durationKey];
  const hero = formatGwSenkung(truth);
  const nepC = model.stages2h.find((s) => s.key === "NEP C")!;
  const nepCCurve = model.curve.find((s) => s.id === "nep-c");
  const nepCSenkung = duration === "4" && nepCCurve ? nepCCurve.senkungGw["4"] : nepC.senkung2hGw;
  const nepA = model.stages2h.find((s) => s.key === "NEP A")!;
  const inGuess = guessMode && !revealed;
  const showTruth = !inGuess;

  const g2Height = layout.isDesktop ? 420 : 360;
  const g4Height = layout.isDesktop ? 360 : 320;

  return (
    <div ref={pageRef} className={`${styles.page} ${styles.visionJahrPage}`}>
      <p className={styles.eyebrow}>VISION · JAHR · 16.11.2025–15.11.2026</p>
      <h1 className={styles.h1}>Was bringt der NEP-Ausbau übers Jahr?</h1>
      {kernsatz ? <VisionJahrKernsatzBlock paragraph={kernsatz} /> : null}
      <p className={styles.prose}>
        {insertDisplayUnitNbsp(
          "NEP = Netzentwicklungsplan Strom. Seine Szenarien A, B und C erwarten 41, 68 und 94 GW Großspeicher. Wir setzen sie in das Stromsystem der letzten zwölf Monate (Deutschland als ein Netzknoten, perfekte Vorausschau = physikalische Obergrenze). Den interaktiven Monats-Regler gibt es unter ",
        )}
        <Link href="/monat/2026-10" className={styles.link}>
          Oktober 2026
        </Link>{" "}
        und{" "}
        <Link href="/monat/2026-11" className={styles.link}>
          November 2026
        </Link>
        .
      </p>

      <dl className={styles.summaryGrid} aria-label="Jahreskennzahlen auf einen Blick">
        <div className={styles.summaryCard}>
          <dt>Jahresspitze Restlast</dt>
          <dd>
            <strong>{model.peakGwDisplay}{"\u00A0"}GW</strong>
            <span>{formatVisionGermanDate(model.peakTag)} · {model.peakTime}{"\u00A0"}Uhr</span>
          </dd>
        </div>
        <div className={styles.summaryCard}>
          <dt>NEP A → NEP C (2{"\u00A0"}h)</dt>
          <dd>
            <strong>−{formatVisionGwOne(nepA.senkung2hGw)} → −{formatVisionGwOne(nepC.senkung2hGw)}{"\u00A0"}GW</strong>
            <span>Ab 41{"\u00A0"}GW flacht der Zusatznutzen je GW ab</span>
          </dd>
        </div>
        <div className={styles.summaryCard}>
          <dt>Engpass-Tage bei NEP C</dt>
          <dd>
            <strong>{model.tageNepCCount}{"\u00A0"}Tage am Limit</strong>
            <span>Fast alle zwischen Oktober und März</span>
          </dd>
        </div>
      </dl>

      <section className={styles.section} aria-labelledby="vision-g1">
        <h2 id="vision-g1" className={styles.h2}>
          Ab NEP A ({formatVisionGwPlain(nepA.powerGw)}) bringt jedes weitere GW Speicher wenig
        </h2>
        <p className={styles.meta}>
          Jahresspitze {model.peakGwDisplay}{"\u00A0"}GW ({formatVisionGermanDate(model.peakTag)}, {model.peakTime}).
          {showTruth ? (
            <>
              {" "}NEP C ({duration}{"\u00A0"}h) senkt sie um {formatVisionGwPlain(nepCSenkung)}
              {duration === "2"
                ? ` (Vorjahreszeitraum: ${formatVisionGwPlain(model.vorjahr2hSenkung["NEP C"] ?? 0)})`
                : ""}
            </>
          ) : null}
        </p>

        {showTruth ? (
          <>
            <motion.div
              className={styles.heroNum}
              key={`${stageId}-${duration}-${truth.toFixed(3)}`}
              initial={reduced ? false : { opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.4 }}
              aria-live="polite"
            >
              {hero}
            </motion.div>
            <p className={styles.meta}>
              {stageId.startsWith("nep") ? `NEP ${stage.label} · ` : `${stage.label} · `}
              {formatVisionGwPlain(stage.powerGw)} ·{" "}
              {duration === "2" ? formatVisionDurationDe("2") : `${formatVisionDurationDe("4")} Sensitivität`} ·
              spitzenorientiert (national)
            </p>
          </>
        ) : (
          <>
            <div className={styles.heroNum} aria-hidden>
              ?
            </div>
            <p className={styles.meta}>Wie viel senkt NEP C die Jahresspitze? Ziehe im Graph.</p>
          </>
        )}

        <div className={styles.seg} role="group" aria-label="Dauer">
          {DURATIONS.map((d) => (
            <button key={d.key} type="button" aria-pressed={duration === d.key} onClick={() => setDuration(d.key)}>
              {d.label}
            </button>
          ))}
        </div>

        <div className={styles.guessBar}>
          {!inGuess ? (
            <button type="button" className={styles.guessStart} onClick={startGuess}>
              Schätzen (NEP C)
            </button>
          ) : (
            <>
              <p className={styles.meta} style={{ margin: 0 }}>
                Ziehe bei NEP C vertikal.
              </p>
              <button type="button" className={styles.skip} onClick={onSkip}>
                Überspringen
              </button>
            </>
          )}
        </div>

        {gapLabel ? (
          <p className={styles.meta} style={{ marginTop: 4 }}>
            {gapLabel}
          </p>
        ) : null}

        <VisionPlot
          model={model}
          duration={duration}
          stageId={stageId}
          onStage={setStageId}
          guessMode={inGuess}
          width={chartWidth}
          height={layout.vision.height}
          yMax={16}
          ariaLabel="Sättigung Jahressenkung"
          guessStageId="nep-c"
          vorjahr2h={model.stages2h
            .filter((s) => model.vorjahr2hSenkung[s.key] != null)
            .map((s) => ({ powerGw: s.powerGw, senkungGw: model.vorjahr2hSenkung[s.key]! }))}
          onGuessEnd={(guess, truthGw) => {
            const diff = Math.abs(guess - truthGw);
            setGapLabel(
              diff < 0.15
                ? "Fast getroffen."
                : `Abstand zur Schätzung: ${formatGwSenkung(diff).replace(GW_MINUS, "")}`
            );
            setRevealed(true);
            setGuessMode(false);
          }}
        />
        <p className={styles.meta} style={{ marginTop: 4 }}>
          * Zusagen: Summe öffentlich genannter Netzanschlusszusagen für Batteriespeicher (BNetzA, Stand in der{" "}
          <Link href="/methodik#lizenzen" className={styles.link}>
            Methodik
          </Link>
          ).
        </p>
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className={styles.guessStart}
            onClick={() => {
              const header = "Stufe;Leistung_GW;Senkung_2h_GW;Senkung_4h_GW;Spitze_nach_2h_GW;Tage_am_Limit_2h";
              const fmt = (n: number) => n.toFixed(2).replace(".", ",");
              const rows = model.stages2h.map(
                (s) =>
                  `${s.key};${fmt(s.powerGw)};${fmt(s.senkung2hGw)};${fmt(s.senkung4hGw)};${fmt(s.spitzeNach2hGw)};${s.tageKappe2h}`,
              );
              const csv = `\uFEFF${[header, ...rows].join("\n")}\n`;
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "speicherpilot-jahr-nep-stufen.csv";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            data-testid="jahr-csv-export"
          >
            NEP-Stufen als CSV exportieren
          </button>
        </div>
        <VisionJahrChartFoot />
      </section>

      <section id="saison-12m" className={styles.section} aria-labelledby="vision-saison">
        <h2 id="vision-saison" className={styles.h2}>
          12{"\u00A0"}Monate im Saisonvergleich: Sommer-Überschuss vs. Winter-Flaute
        </h2>
        <p className={styles.prose}>
          {insertDisplayUnitNbsp(
            "Tage je Monat mit messbarem Wind+Solar-Überschuss (≥ 0,05 GWh): Im Hochsommer bis zu 29 Tage im Monat, im November und Dezember 0 Tage. Interaktive Viertelstunden-Flottenläufe stehen für ",
          )}
          <Link href="/monat/2026-10" className={styles.link}>
            Oktober 2026
          </Link>{" "}
          und{" "}
          <Link href="/monat/2026-11" className={styles.link}>
            November 2026
          </Link>{" "}
          bereit.
        </p>
        <div className={styles.seasonGrid} role="list" aria-label="Überschusstage je Monat">
          {surplusMonthsData.months.map((m) => {
            const pct = Math.round((m.surplusDays / Math.max(1, m.days)) * 100);
            const hasFleet = m.month === "2026-10" || m.month === "2026-11";
            const inner = (
              <>
                <div className={styles.seasonBarWrap} aria-hidden="true">
                  <div className={styles.seasonBar} style={{ height: `${Math.max(4, pct)}%` }} />
                </div>
                <strong className={styles.seasonNum}>{m.surplusDays}</strong>
                <span className={styles.seasonLabel}>{shortMonthLabel(m.month)}</span>
              </>
            );
            return hasFleet ? (
              <Link
                key={m.month}
                href={`/monat/${m.month}`}
                className={`${styles.seasonCell} ${styles.seasonCellActive}`}
                role="listitem"
                title={`${shortMonthLabel(m.month)}: ${m.surplusDays} von ${m.days} Tagen mit Überschuss (Modellmonat öffnen)`}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={m.month}
                className={styles.seasonCell}
                role="listitem"
                title={`${shortMonthLabel(m.month)}: ${m.surplusDays} von ${m.days} Tagen mit Überschuss`}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="vision-g2">
        <h2 id="vision-g2" className={styles.h2}>
          Nach Preis bleibt die Jahresspitze stehen
        </h2>
        <p className={styles.prose}>
          Selbst mit grober Preisrückwirkung holt der Markt höchstens einen Bruchteil der möglichen Senkung — die graue Linie ohne Rückwirkung ist nur ein gekappter Stresstest.
        </p>
        <VisionJahrG2Markt model={model} width={chartWidth} height={g2Height} />
      </section>

      <section className={styles.section} aria-labelledby="vision-g4">
        <h2 id="vision-g4" className={styles.h2}>
          An {model.tageNepCCount} Tagen fährt selbst NEP C am Limit
        </h2>
        <p className={styles.prose}>
          Fast alle Engpass-Tage liegen zwischen Oktober und März. Am {formatVisionGermanDate(model.leerTagNepC)} ist selbst NEP C leer.
        </p>
        <VisionJahrG4Tage model={model} width={chartWidth} height={g4Height} />
      </section>

      <section className={styles.section} aria-labelledby="vision-g3">
        <h2 id="vision-g3" className={styles.h2}>
          Ab NEP B ist der Überschuss voll
        </h2>
        <p className={styles.prose}>
          Auf Überschuss fahren und Jahresspitze senken ziehen ab NEP A auseinander: NEP A nimmt {formatVisionPercentWhole(visionJahrUeberschussPct("NEP A"))} des Pools, die Spitze sinkt um{" "}
          {formatVisionGwOne(nepA.senkung2hGw)}{"\u00A0"}GW.
        </p>
        <VisionJahrG3Ueberschuss model={model} width={chartWidth} />
      </section>

      <footer className={styles.footer}>
        <p>
          National: keine lokalen Engpässe, kein (n{"\u2212"}1), kein vermiedener Redispatch, keine vermiedene Abregelung (Überschuss ≠ Abregelung). Wind/PV/Last bis 2037 nicht mitgewachsen — NEP-Speicher im System von heute. Kein Business-Case-Werkzeug.
        </p>
        <p style={{ marginTop: 8 }}>
          <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
        </p>
        <p style={{ marginTop: 8 }}>Flotte {model.fleetLabel}</p>
        <p style={{ marginTop: 4 }}>Stand {model.stand} · statische Jahresrechnung</p>
      </footer>
    </div>
  );

  function startGuess() {
    setGuessMode(true);
    setRevealed(false);
    setGapLabel(null);
  }

  function onSkip() {
    window.localStorage.setItem(VISION_SKIP_KEY, "1");
    setRevealed(true);
    setGuessMode(false);
  }
}