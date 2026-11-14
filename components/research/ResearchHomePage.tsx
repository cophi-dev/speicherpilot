"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  researchDayEyebrow,
  researchIncompleteFootnote,
  saturationChartAriaLabel,
  saturationSectionH2,
  weekDurationFootnote,
  weekSectionEyebrow,
} from "@/lib/research/researchFormat";

const FACTORS: ResearchFactor[] = [2, 5, 10];

export function ResearchHomePage({ model, simulatorCostPct }: { model: ResearchHomeModel; simulatorCostPct: string }) {
  const reduced = useReducedMotion();
  const layout = useResearchLayout();
  const [factor, setFactor] = useState<ResearchFactor>(model.day.heroFactor);
  const [weekFactor, setWeekFactor] = useState<ResearchFactor>(2);
  const [weekFourHour, setWeekFourHour] = useState(false);
  const stage = model.day.stages.find((s) => s.factor === factor)!;

  const heroText = useMemo(() => heroReductionDisplay(stage.reductionGw), [stage.reductionGw]);
  const fourh = stage.reduction4hGw;
  const ten = model.day.stages.find((s) => s.factor === 10)!.reductionGw;

  const heroBlock = (
    <>
      <motion.div
        className={styles.heroNum}
        key={`hero-${factor}-${heroText}`}
        initial={reduced ? false : { opacity: 0.55, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.4 }}
        aria-live="polite"
      >
        {heroText}
      </motion.div>
      <p className={styles.meta}>Spitze bei ×{factor} · Modell · national</p>
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
    <div className={styles.page}>
      <header className={styles.heroRow}>
        <div>
          <p className={styles.eyebrow}>{researchDayEyebrow(model.day, model.dayPerspective)}</p>
          <h1 className={styles.h1}>{model.day.h1}</h1>
          {model.incompleteDayNote ? (
            <p className={styles.prose} style={{ marginTop: 8 }}>
              {researchIncompleteFootnote(model.incompleteDayNote)}
            </p>
          ) : null}
        </div>
        <div className={styles.heroAside}>{heroBlock}</div>
      </header>

      <div className={styles.chartClip}>
        <MesserHeroChart model={model.day} factor={factor} onFactor={setFactor} width={layout.messer.width} height={layout.messer.height} />
      </div>

      <p className={styles.prose} style={{ marginTop: 6 }}>
        Restlast national · Fläche: gekappt (Modell) · 4-h-Geist: gestrichelt
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
          <p className={styles.meta}>Wolke: 365 Tage bis {model.day.shortLabel ?? model.day.dateKey} · heutige Flotte · Tageshorizont</p>
        </section>
      </div>

      <div className={styles.marketNews}>
        <NewsPreviewSection place="home" />
      </div>

      <section className={styles.simTeaser} aria-labelledby="simulator-teaser-title">
        <p className={styles.eyebrow}>SIMULATOR · FAHRWEISEN · OKTOBER</p>
        <p className={styles.simTeaserNum}>{simulatorCostPct}</p>
        <h2 id="simulator-teaser-title" className={styles.h2}>
          70 Prozent der Monatssenkung kosten {simulatorCostPct} des Erlöses (ε-70)
        </h2>
        <p className={styles.meta}>Flotte ×2, Modellschätzung, national, kein Netzengpass.</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/simulator" className={styles.link}>
            Im Simulator selbst ausprobieren →
          </Link>
        </p>
      </section>

      <ResearchFoot fleetLabel={model.fleetLabel} />
    </div>
  );
}

function ResearchFoot({ fleetLabel }: { fleetLabel: string }) {
  return (
    <footer className={styles.footer}>
      <p>
        <Link href="/methodik#annahmen">Annahmen &amp; Grenzen ↗</Link>
      </p>
      <p style={{ marginTop: 8 }}>
        Flotte {fleetLabel} · battery-charts.de. Überschuss national, nicht Abregelung. Kein Geschäftsfall, keine Euro auf dieser Ansicht.
      </p>
    </footer>
  );
}
