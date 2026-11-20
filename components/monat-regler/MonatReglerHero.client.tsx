"use client";

import Link from "next/link";

import { FleetScenarioLink } from "@/components/home/FleetScenarioLink";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FrontSlider } from "@/components/monat-v1/FrontSlider";
import { MonatReglerChart } from "@/components/monat-regler/MonatReglerChart.client";
import styles from "@/components/monat-regler/monat-regler.module.css";
import { totalFleetAtFactor } from "@/lib/fleetXkConvention";
import {
  MONAT_REGELR_GRAPH_CAPTION,
  MONAT_REGELR_MARKT_HERO_SUFFIX,
} from "@/lib/monatReglerPflichtzeile";
import { parseMonatReglerCompact, type MonatReglerCompact } from "@/lib/monatReglerAsset";
import { reglerKpisFromBundle } from "@/lib/monatReglerKpis";
import { formatDeDurationH, formatDeGw } from "@/lib/displayUnitFormat";
import { formatGwAbs } from "@/lib/monatV1Format";
import {
  fleetMonatHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { formatBerlinMonthLabel } from "@/lib/monatCalendar";
import type { ReglerKpiSource } from "@/lib/monatReglerKpis";
import { formatQuantity } from "@/lib/formatQuantity";

const NBSP = "\u00a0";
const STRATEGY_ORDER: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];
const STRATEGY_LABEL: Record<NationalFleetStrategyUi, string> = {
  spitze: "Spitze",
  ueberschuss: "Überschuss",
  markt: "Markt",
};

function formatPoolLine(gwh: number, sharePct: number | null): string {
  const g = `${formatQuantity(gwh, "de", 1)}${NBSP}GWh`;
  if (sharePct == null) return g;
  return `${g} (${formatQuantity(sharePct, "de", 0)}${NBSP}%)`;
}

export function MonatReglerHero({
  monthKey,
  factor,
  strategy,
  kpiSource,
}: {
  monthKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  kpiSource: ReglerKpiSource;
}) {
  const router = useRouter();
  const [compact, setCompact] = useState<MonatReglerCompact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = formatBerlinMonthLabel(monthKey);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/national-fleet/compact?month=${encodeURIComponent(monthKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Asset fehlt");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        setCompact(parseMonatReglerCompact(raw));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const kpis = useMemo(
    () => (compact ? reglerKpisFromBundle(kpiSource, factor, strategy, compact) : null),
    [compact, factor, kpiSource, strategy],
  );

  const factorIndex = NATIONAL_FLEET_FACTORS.indexOf(factor);
  const onFactorSlider = useCallback(
    (idx: number) => {
      const f = NATIONAL_FLEET_FACTORS[idx] ?? factor;
      sessionStorage.setItem("speicherpilot-fleet-scroll", String(window.scrollY));
      router.replace(fleetMonatHref(monthKey, f, strategy), { scroll: false });
    },
    [factor, monthKey, router, strategy],
  );

  const surplusPoolZero =
    strategy === "ueberschuss" && compact != null && compact.surplusPoolGwh < 0.05;
  const surplusZeroNote = `Im ${monthLabel} gab es im Modell keinen Überschuss aus Wind+Solar über Last.`;

  return (
    <section
      className={`${styles.hero}${strategy === "markt" && factor > 1 ? ` ${styles.heroMarktKpi}` : ""}${
        surplusPoolZero ? ` ${styles.heroZeroSurplus}` : ""
      }`}
      aria-labelledby="monat-regler-h1"
      data-testid="monat-regler-hero"
    >
      <p className="num" style={{ fontSize: "0.75rem", color: "var(--mr-muted)" }}>
        MONATSHORIZONT · {monthLabel.toUpperCase()} · MODELL
      </p>
      <h1 id="monat-regler-h1" className={styles.h1}>
        Wie hätte eine größere Flotte den {monthLabel} verändert?
      </h1>

      <div className={styles.controls}>
        <div className={styles.sliderDesktopOnly} data-testid="monat-regler-slider">
          <FrontSlider
            value={factorIndex >= 0 ? factorIndex : 0}
            count={NATIONAL_FLEET_FACTORS.length}
            namedIndices={[0, 1, 2, 3]}
            onChange={onFactorSlider}
            label="Flottengröße (×1 Ist · ×2 · ×5 · ×10)"
            ariaValueText={`×${factor}`}
            showHint={false}
          />
        </div>
        <div className={styles.chipGroup} role="group" aria-label="Flottenstufe">
          {NATIONAL_FLEET_FACTORS.map((f) => {
            const total = totalFleetAtFactor(f);
            return (
              <FleetScenarioLink
                key={f}
                href={fleetMonatHref(monthKey, f, strategy)}
                className={`${styles.chip}${f === factor ? ` ${styles.chipActive}` : ""}`}
                aria-current={f === factor ? "true" : undefined}
              >
                ×{f}
                <span className={styles.chipSub}>{formatDeGw(total.powerMw / 1000, 2)}</span>
              </FleetScenarioLink>
            );
          })}
        </div>
        <div className={styles.chipGroup} role="group" aria-label="Fahrweise">
          {STRATEGY_ORDER.map((id) => (
            <FleetScenarioLink
              key={id}
              href={fleetMonatHref(monthKey, factor, id)}
              className={`${styles.chip}${id === strategy ? ` ${styles.chipActive}` : ""}`}
              title={NATIONAL_FLEET_STRATEGY_UI[id].labelDe}
            >
              {STRATEGY_LABEL[id]}
            </FleetScenarioLink>
          ))}
        </div>
        <p className={styles.durationRow}>
          Speicherdauer heute: <strong>{formatDeDurationH("1,76")}</strong>. Was längere Speicher ({formatDeDurationH("2")},{" "}
          {formatDeDurationH("4")}) bringen, zeigt „Es fehlen Stunden“
          weiter unten.
        </p>
      </div>

      {kpis ? (
        <dl
          className={`${styles.kpiGrid}${
            strategy === "markt" && factor > 1 ? ` ${styles.kpiGridDense}` : ""
          }`}
        >
          <div className={styles.kpi}>
            <dt>Monatsspitze</dt>
            <dd>{formatGwAbs(kpis.peakAfterGw)}</dd>
          </div>
          <div className={styles.kpi}>
            <dt>
              gegenüber gemessen ({compact ? formatGwAbs(compact.refPeakMw / 1000) : formatGwAbs(64.4)})
            </dt>
            <dd>{kpis.deltaLabel}</dd>
          </div>
          {strategy === "ueberschuss" && kpis.surplusCaptureGwh != null ? (
            <div className={styles.kpi}>
              <dt>Überschuss-Pool</dt>
              <dd>{surplusPoolZero ? `0${NBSP}GWh` : formatPoolLine(kpis.surplusCaptureGwh, kpis.surplusSharePct)}</dd>
              {surplusPoolZero ? <p className={styles.kpiNote}>{surplusZeroNote}</p> : null}
            </div>
          ) : null}
          {strategy === "markt" && factor > 1 && kpis.marktQhAboveRef != null ? (
            <>
              <div className={styles.kpi}>
                <dt>
                  Über {compact ? formatGwAbs(compact.refPeakMw / 1000) : formatGwAbs(64.4)} (
                  {formatBerlinMonthLabel(monthKey)})
                </dt>
                <dd>{kpis.marktQhAboveRef} QH</dd>
              </div>
              <div className={styles.kpi}>
                <dt>Kipppunkt</dt>
                <dd>
                  ≈{NBSP}×{formatQuantity(kpis.kipppunktFactor, "de", 1)} · {kpis.marktDaysAboveRef} Tage
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      ) : null}

      {error ? <p className={styles.placeholder}>{error}</p> : null}
      {!compact && !error ? (
        <p className={styles.placeholder} aria-busy="true">
          Zeitreihe wird geladen …
        </p>
      ) : null}
      {compact ? (
        <MonatReglerChart compact={compact} factor={factor} strategy={strategy} monthKey={monthKey} />
      ) : null}

      <p className={styles.caption} data-testid="monat-regler-pflichtzeile">
        {MONAT_REGELR_GRAPH_CAPTION}
        {strategy === "markt" && factor > 1 ? MONAT_REGELR_MARKT_HERO_SUFFIX : ""}
      </p>
    </section>
  );
}