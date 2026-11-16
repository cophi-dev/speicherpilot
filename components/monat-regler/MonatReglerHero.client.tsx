"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FrontSlider } from "@/components/monat-v1/FrontSlider";
import { MonatReglerChart } from "@/components/monat-regler/MonatReglerChart.client";
import styles from "@/components/monat-regler/monat-regler.module.css";
import { totalFleetAtFactor } from "@/lib/fleetXkConvention";
import { MONAT_REGELR_GRAPH_CAPTION } from "@/lib/monatReglerPflichtzeile";
import { parseMonatReglerCompact, type MonatReglerCompact } from "@/lib/monatReglerAsset";
import { reglerKpisFromBundle } from "@/lib/monatReglerKpis";
import { formatGwAbs } from "@/lib/monatV1Format";
import {
  fleetMonatHref,
  NATIONAL_FLEET_FACTORS,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import type { ReglerKpiSource } from "@/lib/monatReglerKpis";

const STRATEGY_ORDER: NationalFleetStrategyUi[] = ["spitze", "ueberschuss", "markt"];
const STRATEGY_LABEL: Record<NationalFleetStrategyUi, string> = {
  spitze: "Spitze",
  ueberschuss: "Überschuss",
  markt: "Markt",
};

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
  const [zoom, setZoom] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/national-fleet/compact")
      .then((r) => {
        if (!r.ok) throw new Error("Asset fehlt");
        return r.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseMonatReglerCompact(raw);
        setCompact(parsed);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [factor, kpiSource, strategy]);

  const kpis = useMemo(
    () => (compact ? reglerKpisFromBundle(kpiSource, factor, strategy, compact) : null),
    [compact, factor, kpiSource, strategy],
  );

  const factorIndex = NATIONAL_FLEET_FACTORS.indexOf(factor);
  const onFactorSlider = useCallback(
    (idx: number) => {
      const f = NATIONAL_FLEET_FACTORS[idx] ?? factor;
      setZoom(null);
      router.replace(fleetMonatHref(monthKey, f, strategy));
    },
    [factor, monthKey, router, strategy],
  );

  return (
    <section className={styles.hero} aria-labelledby="monat-regler-h1" data-testid="monat-regler-hero">
      <p className="num" style={{ fontSize: "0.75rem", color: "var(--mr-muted)" }}>
        MONATSHORIZONT · OKTOBER 2026 · MODELL
      </p>
      <h1 id="monat-regler-h1" className={styles.h1}>
        Wie hätte eine größere Flotte den Oktober verändert?
      </h1>

      <div className={styles.controls}>
        <FrontSlider
          value={factorIndex >= 0 ? factorIndex : 0}
          count={NATIONAL_FLEET_FACTORS.length}
          namedIndices={[0, 1, 2, 3]}
          onChange={onFactorSlider}
          label="Flottengröße (×1 Ist · ×2 · ×5 · ×10)"
          ariaValueText={`×${factor}`}
        />
        <div className={styles.chipGroup} role="group" aria-label="Flottenstufe">
          {NATIONAL_FLEET_FACTORS.map((f) => {
            const total = totalFleetAtFactor(f);
            const gw = (total.powerMw / 1000).toFixed(2).replace(".", ",");
            return (
              <Link
                key={f}
                href={fleetMonatHref(monthKey, f, strategy)}
                className={`${styles.chip}${f === factor ? ` ${styles.chipActive}` : ""}`}
                aria-current={f === factor ? "true" : undefined}
              >
                ×{f}
                <span className={styles.chipSub}>{gw} GW</span>
              </Link>
            );
          })}
        </div>
        <div className={styles.chipGroup} role="group" aria-label="Fahrweise">
          {STRATEGY_ORDER.map((id) => (
            <Link
              key={id}
              href={fleetMonatHref(monthKey, factor, id)}
              className={`${styles.chip}${id === strategy ? ` ${styles.chipActive}` : ""}`}
              title={NATIONAL_FLEET_STRATEGY_UI[id].labelDe}
            >
              {STRATEGY_LABEL[id]}
            </Link>
          ))}
        </div>
        <p className={styles.durationRow}>
          Dauer:{" "}
          <strong>1,76 h</strong> aktiv · 2 h und 4 h ohne Zeitreihe — siehe Graph darunter (Paket B).
        </p>
      </div>

      {kpis ? (
        <dl className={styles.kpiGrid}>
          <div className={styles.kpi}>
            <dt>Monatsspitze</dt>
            <dd>{formatGwAbs(kpis.peakAfterGw)}</dd>
          </div>
          <div className={styles.kpi}>
            <dt>Δ zur Beobachtung</dt>
            <dd>{kpis.deltaLabel}</dd>
          </div>
          {strategy === "ueberschuss" && kpis.surplusCaptureGwh != null ? (
            <div className={styles.kpi}>
              <dt>Überschuss-Pool</dt>
              <dd>
                {kpis.surplusCaptureGwh.toFixed(1).replace(".", ",")} GWh
                {kpis.surplusSharePct != null ? ` (${kpis.surplusSharePct.toFixed(0)} %)` : ""}
              </dd>
            </div>
          ) : null}
          {strategy === "markt" && factor > 1 && kpis.marktQhAboveRef != null ? (
            <div className={styles.kpi}>
              <dt>Über {formatGwAbs(64.4)}</dt>
              <dd>
                {kpis.marktQhAboveRef} QH · {kpis.marktDaysAboveRef} Tage · Kipppunkt ≈ ×{kpis.kipppunktFactor}
              </dd>
            </div>
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
        <MonatReglerChart
          compact={compact}
          factor={factor}
          strategy={strategy}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      ) : null}

      <p className={styles.caption} data-testid="monat-regler-pflichtzeile">
        {MONAT_REGELR_GRAPH_CAPTION}
        {strategy === "markt" && factor > 1 ? " · Schraffur = über beobachteter Monatsspitze" : ""}
      </p>
    </section>
  );
}