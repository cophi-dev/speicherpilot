"use client";

import { useEffect, useMemo, useState } from "react";

import {
  computeKumulierteKurve,
  DEFAULT_KARTE_FILTER,
  deriveMwhReferenzWerte,
  saeulenHoehe,
  sitesAtCut,
} from "@/lib/bessKarte3d/logic";
import {
  type Camera3d,
  DEFAULT_CAMERA_3D,
} from "@/lib/bessKarte3d/projection3d";
import type {
  BundeslaenderGeoJson,
  EinspeisungFilter,
  HoehenModus,
  Karte3dData,
  Karte3dSummary,
  KarteFilter,
  KarteSite,
} from "@/lib/bessKarte3d/types";
import { BessKarteCanvas3d } from "@/components/bess-netzbetreiber/BessKarteCanvas3d";
import {
  BessKarteBottomSheet,
  BessKarteDetailCard,
} from "@/components/bess-netzbetreiber/BessKarteDetails";
import { BessKarteMobile2d } from "@/components/bess-netzbetreiber/BessKarteMobile2d";
import { BessKarteTimeline } from "@/components/bess-netzbetreiber/BessKarteTimeline";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

export function BessKarte3d({
  summary,
  geoJson,
}: {
  summary: Karte3dSummary;
  geoJson: BundeslaenderGeoJson;
}) {
  const [karte, setKarte] = useState<Karte3dData | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const [modus, setModus] = useState<HoehenModus>("mw");
  const [showAbregelung, setShowAbregelung] = useState<boolean>(false);
  const [filter, setFilter] = useState<KarteFilter>(DEFAULT_KARTE_FILTER);
  const [camera, setCamera] = useState<Camera3d>(DEFAULT_CAMERA_3D);
  const [selectedLok, setSelectedLok] = useState<string | null>(null);
  const [monatIndex, setMonatIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    import("@/data/bess-karte-3d/karte3d.json").then((karteMod) => {
      if (!active) return;
      const loaded = (karteMod.default ?? karteMod) as unknown as Karte3dData;
      setKarte(loaded);
      setMonatIndex(loaded.monatKumuliert.length - 1);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 768px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setIsDesktop(mqDesktop.matches);
      setReducedMotion(mqMotion.matches);
    };
    update();
    mqDesktop.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqDesktop.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  const monate = useMemo(
    () => (karte ? karte.monatKumuliert.map((m) => m.monat) : []),
    [karte],
  );

  const effectiveIdx =
    monatIndex !== null && monate.length > 0
      ? Math.max(0, Math.min(monate.length - 1, monatIndex))
      : Math.max(0, monate.length - 1);

  const activeMonat = monate[effectiveIdx] ?? "2026-11";

  useEffect(() => {
    if (!isPlaying || monate.length === 0) return;
    const stepMs = reducedMotion ? 260 : 120;
    const timer = window.setInterval(() => {
      setMonatIndex((prev) => {
        const cur = prev ?? monate.length - 1;
        if (cur >= monate.length - 1) {
          setIsPlaying(false);
          return monate.length - 1;
        }
        return cur + 1;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, monate.length, reducedMotion]);

  const isDefaultFilter =
    !filter.nurGeprueft && filter.einspeisung === "alle";

  const kurve = useMemo(() => {
    if (!karte) return [];
    if (isDefaultFilter) return karte.monatKumuliert;
    return computeKumulierteKurve(karte.einheiten, monate, filter);
  }, [karte, isDefaultFilter, monate, filter]);

  // Referenz-Maximalwerte über den Gesamtbestand, damit Zeitachsen-Wachstum maßstabsgetreu bleibt
  const fullCutAll = useMemo(() => {
    if (!karte || monate.length === 0) return null;
    return sitesAtCut(
      karte.einheiten,
      monate[monate.length - 1]!,
      DEFAULT_KARTE_FILTER,
    );
  }, [karte, monate]);

  const cutResult = useMemo(() => {
    if (!karte) return null;
    return sitesAtCut(karte.einheiten, activeMonat, filter);
  }, [karte, activeMonat, filter]);

  const mwRefs = summary.meta.hoehenReferenzMw;
  const maxMwScale = Math.max(...mwRefs, 140);

  const mwhRefs = useMemo(() => {
    if (!fullCutAll) return [];
    return deriveMwhReferenzWerte(fullCutAll.sites, mwRefs);
  }, [fullCutAll, mwRefs]);

  const maxMwhScale = useMemo(() => {
    if (!fullCutAll || fullCutAll.sites.length === 0) return 1;
    return fullCutAll.sites.reduce((m, s) => Math.max(m, s.kapMwh), 1);
  }, [fullCutAll]);

  const maxScaleValue = modus === "mwh" ? maxMwhScale : maxMwScale;
  const activeRefs = modus === "mwh" ? mwhRefs : mwRefs;

  const selectedSite: KarteSite | null = useMemo(() => {
    if (!selectedLok || !cutResult) return null;
    return cutResult.sites.find((s) => s.lok === selectedLok) ?? null;
  }, [selectedLok, cutResult]);

  const maxAbregGwh = useMemo(() => {
    return summary.bundeslaender.reduce(
      (m, b) => (b.abregelung2025Gwh !== null ? Math.max(m, b.abregelung2025Gwh) : m),
      0,
    );
  }, [summary.bundeslaender]);

  function handleTogglePlay() {
    if (monate.length === 0) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (effectiveIdx >= monate.length - 1) {
      setMonatIndex(0);
    }
    setIsPlaying(true);
  }

  function handleEinspeisung(val: EinspeisungFilter) {
    setFilter((prev) => ({ ...prev, einspeisung: val }));
  }

  if (!karte || !cutResult) {
    return (
      <div className={styles.karteShell} aria-busy="true" aria-label="Speicherkarte wird geladen">
        <div className={styles.karteLoading}>
          <p className="num">Interaktive Speicherkarte (545 Standorte) wird geladen …</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.karteShell} data-testid="bess-karte-3d">
      {/* Steuerleiste: Modus, Ebene, Filter */}
      <div className={styles.karteControls} role="region" aria-label="Kartenfilter und Darstellung">
        <div className={styles.controlGroup}>
          <span className={`${styles.controlLabel} num`}>
            {isDesktop ? "Säulenhöhe" : "Kreisfläche"}
          </span>
          <div className={styles.segmented} role="group" aria-label="Skalierung wählen">
            <button
              type="button"
              className={modus === "mw" ? styles.segBtnActive : styles.segBtn}
              aria-pressed={modus === "mw"}
              onClick={() => setModus("mw")}
            >
              √(Netto-MW)
            </button>
            <button
              type="button"
              className={modus === "mwh" ? styles.segBtnActive : styles.segBtn}
              aria-pressed={modus === "mwh"}
              onClick={() => setModus("mwh")}
            >
              √(MWh)
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className={`${styles.controlLabel} num`}>Zweite Ebene</span>
          <button
            type="button"
            className={showAbregelung ? styles.toggleBtnActive : styles.toggleBtn}
            aria-pressed={showAbregelung}
            onClick={() => setShowAbregelung((v) => !v)}
          >
            EE-Abregelung 2025 {showAbregelung ? "an" : "aus"}
          </button>
        </div>

        <div className={styles.controlGroup}>
          <span className={`${styles.controlLabel} num`}>Prüfung</span>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={filter.nurGeprueft}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, nurGeprueft: e.target.checked }))
              }
            />
            <span>nur NB-geprüft</span>
          </label>
        </div>

        <div className={styles.controlGroup}>
          <span className={`${styles.controlLabel} num`}>Einspeisung</span>
          <div className={styles.segmented} role="group" aria-label="Einspeisungsart filtern">
            {(
              [
                ["alle", "Alle"],
                ["voll", "Volleinspeisung"],
                ["teil", "Teileinspeisung"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filter.einspeisung === key ? styles.segBtnActive : styles.segBtn}
                aria-pressed={filter.einspeisung === key}
                onClick={() => handleEinspeisung(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fachliche Kurzhinsweise je aktivem Modus / Filter */}
      <div className={styles.karteNotes}>
        {modus === "mwh" ? (
          <p className={`${styles.karteNoteItem} num`}>
            E/P = MWh ÷ MW; typisch {formatQuantity(summary.meta.epPlausibelH[0], "de", 2)}–
            {formatQuantity(summary.meta.epPlausibelH[1], "de", 0)}&nbsp;h.
          </p>
        ) : null}
        <p className={styles.karteNoteItem}>
          Einspeisungsart: grobes Indiz aus dem MaStR, kein Beleg für Eigenverbrauch („ohne Angabe“ nur unter „Alle“).
        </p>
      </div>

      {/* Hauptbühne: Desktop 3D + Seitenleiste | Mobil 2D */}
      <div className={isDesktop ? styles.karteStageDesktop : styles.karteStageMobile}>
        <div className={styles.karteMapPane}>
          {isDesktop ? (
            <BessKarteCanvas3d
              geoJson={geoJson}
              bundeslaender={summary.bundeslaender}
              sites={cutResult.sites}
              modus={modus}
              maxScaleValue={maxScaleValue}
              showAbregelung={showAbregelung}
              selectedLok={selectedSite?.lok ?? null}
              onSelectSite={(s) => setSelectedLok(s?.lok ?? null)}
              camera={camera}
              onCameraChange={setCamera}
              onResetCamera={() => setCamera(DEFAULT_CAMERA_3D)}
            />
          ) : (
            <BessKarteMobile2d
              geoJson={geoJson}
              bundeslaender={summary.bundeslaender}
              sites={cutResult.sites}
              modus={modus}
              maxScaleValue={maxScaleValue}
              showAbregelung={showAbregelung}
              selectedLok={selectedSite?.lok ?? null}
              onSelectSite={(s) => setSelectedLok(s?.lok ?? null)}
            />
          )}

          {/* Höhen-/Größenlegende + Abregelung-Legende direkt unter der Karte */}
          <div className={styles.legendsRow}>
            <div className={styles.heightLegend} aria-label="Höhenlegende">
              <span className={`${styles.legendTitle} num`}>
                {isDesktop ? "Säulenhöhe" : "Punktgröße"} (√-Skala,{" "}
                {modus === "mwh" ? "MWh" : "Netto-MW"})
              </span>
              <div className={styles.heightBars}>
                {activeRefs.map((refVal) => {
                  const hPx = Math.max(6, Math.round(saeulenHoehe(refVal, maxScaleValue, 44)));
                  return (
                    <div key={refVal} className={styles.heightBarItem}>
                      <div className={styles.heightBarWell}>
                        {isDesktop ? (
                          <span
                            className={styles.heightBarCol}
                            style={{ height: `${hPx}px` }}
                            aria-hidden="true"
                          />
                        ) : (
                          <span
                            className={styles.heightDot}
                            style={{
                              width: `${Math.max(6, Math.round(saeulenHoehe(refVal, maxScaleValue, 26)))}px`,
                              height: `${Math.max(6, Math.round(saeulenHoehe(refVal, maxScaleValue, 26)))}px`,
                            }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <span className={`${styles.heightBarVal} num`}>
                        {insertDisplayUnitNbsp(
                          formatQuantityUnit(refVal, "de", 0, modus === "mwh" ? "MWh" : "MW"),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {showAbregelung ? (
              <div className={styles.abregLegend} aria-label="Legende EE-Abregelung 2025">
                <span className={`${styles.legendTitle} num`}>
                  EE-Abregelung 2025 (GWh) · Standort ist nicht Betriebsweise.
                </span>
                <div className={styles.abregRampRow}>
                  <span className="num">0</span>
                  <span className={styles.abregRampBar} aria-hidden="true" />
                  <span className="num">
                    {insertDisplayUnitNbsp(formatQuantityUnit(maxAbregGwh, "de", 0, "GWh"))}
                  </span>
                  <span className={styles.abregNullSwatch}>
                    <span className={styles.abregNullBox} aria-hidden="true" />
                    <span className="num">HH/BE: k.&nbsp;A.</span>
                  </span>
                </div>
                <p className={styles.abregSource}>
                  Quelle: SMARD / BMWE-Antwort 12.05.2026, ohne Offshore-AWZ.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {isDesktop ? (
          <BessKarteDetailCard
            site={selectedSite}
            sites={cutResult.sites}
            epPlausibelH={summary.meta.epPlausibelH}
            onSelectSite={(s) => setSelectedLok(s?.lok ?? null)}
          />
        ) : (
          <div className={styles.mobileSelectWrap}>
            <label htmlFor="karte-standort-mobile" className={`${styles.detailSelectLabel} num`}>
              Standort per Liste / Tastatur wählen
            </label>
            <select
              id="karte-standort-mobile"
              className={styles.detailSelect}
              value={selectedSite?.lok ?? ""}
              onChange={(e) => {
                const lok = e.target.value;
                const found = cutResult.sites.find((s) => s.lok === lok) ?? null;
                setSelectedLok(found?.lok ?? null);
              }}
            >
              <option value="">
                — {formatQuantity(cutResult.sites.length, "de", 0)} kartierte Standorte —
              </option>
              {cutResult.sites.map((s) => (
                <option key={s.lok} value={s.lok}>
                  {s.name} ({s.bl}) · {formatQuantity(s.nettoMw, "de", 1)}{"\u00a0"}MW
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Zeitachse + Kumulierte Netto-Kurve */}
      <BessKarteTimeline
        kurve={kurve}
        activeIndex={effectiveIdx}
        onChangeIndex={(idx) => {
          setIsPlaying(false);
          setMonatIndex(idx);
        }}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        mappedSitesCount={cutResult.sites.length}
      />

      {/* Mobil: Bottom-Sheet bei Tap */}
      {!isDesktop ? (
        <BessKarteBottomSheet
          site={selectedSite}
          epPlausibelH={summary.meta.epPlausibelH}
          onClose={() => setSelectedLok(null)}
        />
      ) : null}
    </div>
  );
}
