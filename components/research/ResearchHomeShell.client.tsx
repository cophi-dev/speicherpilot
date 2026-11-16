"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import NewsPreviewSection from "@/components/NewsPreviewSection";
import styles from "@/components/research/research.module.css";
import { SaturationChart, WeekDotsChart } from "@/components/research/charts";
import { MesserHeroChart } from "@/components/research/MesserHeroChart";
import { useResearchLayout } from "@/components/research/useResearchLayout";
import type { ResearchFactor, ResearchHomeModel } from "@/lib/research/researchTypes";
import {
  fourHourSensitivityLine,
  heroReductionDisplay,
  heroSpikeDurationLine,
  saturationChartAriaLabel,
  saturationSectionH2,
  weekDurationFootnote,
  weekSectionEyebrow,
} from "@/lib/research/researchFormat";
import type { Eps70TeaserUi } from "@/lib/simulatorTeaser.types";

const FACTORS: ResearchFactor[] = [2, 5, 10];

export function ResearchHomeShell({
  model,
  simulatorTeaser,
  liveFleetLabel,
}: {
  model: ResearchHomeModel;
  simulatorTeaser: Eps70TeaserUi;
  liveFleetLabel?: string | null;
}) {
  const layout = useResearchLayout();
  const [factor, setFactor] = useState<ResearchFactor>(model.day.heroFactor);
  const [weekFactor, setWeekFactor] = useState<ResearchFactor>(2);
  const [weekFourHour, setWeekFourHour] = useState(false);
  const stage = model.day.stages.find((s) => s.factor === factor)!;

  const heroText = useMemo(() => heroReductionDisplay(stage.reductionGw), [stage.reductionGw]);
  const spikeDurationLine = useMemo(
    () => heroSpikeDurationLine(stage.hoursAboveCap, factor),
    [factor, stage.hoursAboveCap],
  );
  const fourh = stage.reduction4hGw;
  const ten = model.day.stages.find((s) => s.factor === 10)!.reductionGw;

  const heroAside = (
    <>
      <div className={styles.heroNum} key={`hero-${factor}-${heroText}`} aria-live="polite">
        {heroText}
      </div>
      <p className={styles.meta}>
        Senkung der Tagesspitze mit ×{factor} (das {factor}-fache der heutigen Flotte) · Modell · national
      </p>
      <p className={styles.prose}>{spikeDurationLine}</p>
      <p className={styles.prose}>{fourHourSensitivityLine(fourh, ten, factor)}</p>
      <div className={styles.seg} role="group" aria-label="Flottenstufe">
        {FACTORS.map((f) => (
          <button key={f} type="button" aria-pressed={factor === f} onClick={() => setFactor(f)}>
            ×{f}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      <div className={styles.heroAside}>{heroAside}</div>

      <div className={styles.heroMain}>
      <div className={styles.chartClip}>
        <MesserHeroChart model={model.day} factor={factor} onFactor={setFactor} width={layout.messer.width} height={layout.messer.height} />
      </div>

      <p className={styles.prose} style={{ marginTop: 6 }}>
        Restlast national · Fläche: was die Flotte abschneidet (Modell) · Linien: Spitze nach ×2 / ×5 / ×10 · grau
        gestrichelt: ×{factor} mit 4 h
      </p>

      <div className={styles.lowerSplit}>
        <section id="woche" className={styles.sectionInSplit} style={{ scrollMarginTop: 12 }}>
          <p className={styles.eyebrow}>{weekSectionEyebrow(model.week, model.dayPerspective)}</p>
          <h2 className={`${styles.h2} ${styles.weekHeadline}`}>{model.weekHeadline}</h2>
          <div className={styles.seg} role="group" aria-label="Woche Flottenstufe" style={{ marginTop: 4, marginBottom: 6 }}>
            {FACTORS.map((f) => (
              <button key={f} type="button" aria-pressed={weekFactor === f} onClick={() => setWeekFactor(f)}>
                ×{f}
              </button>
            ))}
          </div>
          <div className={styles.seg} role="group" aria-label="Woche Speicherdauer" style={{ marginTop: 0, marginBottom: 10 }}>
            <button type="button" aria-pressed={!weekFourHour} onClick={() => setWeekFourHour(false)}>
              1,76 h
            </button>
            <button type="button" aria-pressed={weekFourHour} onClick={() => setWeekFourHour(true)}>
              4 h
            </button>
          </div>
          <WeekDotsChart
            week={model.week}
            factor={weekFactor}
            useFourHour={weekFourHour}
            width={layout.week.width}
            height={layout.week.height}
          />
          <p className={styles.meta}>
            Spitzensenkung je Tag, national (Modell) · {weekDurationFootnote}
          </p>
        </section>

        <section className={styles.sectionInSplit}>
          <p className={styles.eyebrow}>SÄTTIGUNG · 12 MONATE · 1,76 h</p>
          <h2 className={styles.h2}>{saturationSectionH2(model.day, model.dayPerspective)}</h2>
          <SaturationChart
            model={model.day}
            cloud={model.cloud}
            width={layout.saturation.width}
            height={layout.saturation.height}
            ariaLabel={saturationChartAriaLabel(model.day, model.dayPerspective)}
          />
          <p className={styles.legendInline}>
            <span>— {model.day.shortLabel}</span>
            <span>··· {model.day.shortLabel} 4 h</span>
            <span>--- Median</span>
            <span>▌ P10–P90</span>
          </p>
          <p className={styles.meta}>
            Graue Punkte: jeder Tag der letzten 365 Tage bis {model.day.shortLabel ?? model.day.dateKey} · rot: gestern ·
            ×1 = heutige Flotte = 0
          </p>
        </section>
      </div>

      <div className={styles.marketNews}>
        <NewsPreviewSection place="home" />
      </div>

      <section className={styles.simTeaser} aria-labelledby="simulator-teaser-title">
        <p className={styles.eyebrow}>SIMULATOR · FAHRWEISEN · OKTOBER</p>
        <h2 id="simulator-teaser-title" className={styles.h2}>
          {simulatorTeaser.headlineDe}
        </h2>
        <p className={styles.meta}>{simulatorTeaser.sublineDe}</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/simulator" className={styles.link}>
            Im Simulator selbst ausprobieren →
          </Link>
        </p>
      </section>

      <ResearchFoot fleetLabel={model.fleetLabel} liveFleetLabel={liveFleetLabel} />
      </div>
    </>
  );
}

function ResearchFoot({
  fleetLabel,
  liveFleetLabel,
}: {
  fleetLabel: string;
  liveFleetLabel?: string | null;
}) {
  const fleetLine = liveFleetLabel
    ? `Oktober-Rechnung mit Flotte ${fleetLabel} (Battery Charts). Heute: ${liveFleetLabel}.`
    : `Oktober-Rechnung mit Flotte ${fleetLabel} (Battery Charts).`;
  return (
    <footer className={styles.footer}>
      <p>
        <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
      </p>
      <p style={{ marginTop: 8 }}>
        {fleetLine} Überschuss national, nicht Abregelung. Kein Geschäftsfall, keine Euro auf dieser Ansicht.
      </p>
    </footer>
  );
}