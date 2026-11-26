"use client";

import Link from "next/link";
import { useMemo } from "react";

import { BkgKurz } from "@/components/bess-netzbetreiber/KarteQuellen";
import { StartKarteCanvas3d } from "@/components/home/StartKarteCanvas3d.client";
import styles from "@/components/home/StartKarteSektion.module.css";
import {
  MOBIL_PUNKT_MAX_R,
  MOBIL_PUNKT_MIN_R,
  ORIENTIERUNGS_STAEDTE,
  punktRadius2d,
} from "@/lib/bessKarte3d/logic";
import { polygonRingsToSvgPath2d, projectGeoTo2d } from "@/lib/bessKarte3d/projection3d";
import type { StartKartePreviewData } from "@/lib/bessKarte3d/types";
import { formatQuantity } from "@/lib/formatQuantity";

const NBSP = "\u00a0";
const VIEW_W = 420;
const VIEW_H = 510;
const PAD = 22;

function formatStichtagDe(raw: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3.$2.$1")
    : raw;
}

export function StartKarteSektion({ data }: { data: StartKartePreviewData }) {
  const gwLabel = formatQuantity(data.nettoMw / 1000, "de", 2);
  const nLabel = formatQuantity(data.n, "de", 0);
  const lokLabel = formatQuantity(data.lokationen, "de", 0);
  const stichtagDe = formatStichtagDe(data.stichtag);

  const mapAriaLabel = `Karte der ${nLabel} Batteriespeicher ab 1${NBSP}MW (${gwLabel}${NBSP}GW netto) an ${lokLabel} Lokationen in Deutschland, MaStR-Stand ${stichtagDe}.`;

  const statePaths = useMemo(
    () =>
      data.geoJson.features.map((feat) => ({
        name: feat.properties.name,
        d: polygonRingsToSvgPath2d(feat.geometry, VIEW_W, VIEW_H, PAD),
      })),
    [data.geoJson],
  );

  const dots = useMemo(
    () =>
      data.sites
        .map((site) => {
          const p = projectGeoTo2d(site.lng, site.lat, VIEW_W, VIEW_H, PAD);
          return {
            lok: site.lok,
            x: p.x,
            y: p.y,
            r: punktRadius2d(site.nettoMw, data.maxScaleValue, MOBIL_PUNKT_MIN_R, MOBIL_PUNKT_MAX_R),
          };
        })
        .sort((a, b) => b.r - a.r),
    [data.sites, data.maxScaleValue],
  );

  const cities = useMemo(
    () =>
      ORIENTIERUNGS_STAEDTE.filter((c) =>
        c.name === "Hamburg" || c.name === "Berlin" || c.name === "München",
      ).map((c) => ({
        name: c.name,
        ...projectGeoTo2d(c.lng, c.lat, VIEW_W, VIEW_H, PAD),
      })),
    [],
  );

  return (
    <section
      className={`v4-content ${styles.section}`}
      aria-labelledby="start-karte-h2"
      data-testid="start-karte-sektion"
    >
      <div className={styles.grid}>
        <div className={styles.copy}>
          <h2 id="start-karte-h2" className={`v4-chapter-h2 ${styles.heading}`}>
            Wo stehen die {gwLabel}
            {NBSP}GW Großspeicher?
          </h2>
          <p className={styles.subline}>
            {nLabel} Speicher an {lokLabel} Lokationen, MaStR-Stand {stichtagDe}. Wo 2025 am
            meisten EE-Strom abgeregelt wurde, stehen nicht automatisch die meisten Speicher.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/netzbetreiber" className={`v4-text-link ${styles.ctaLink}`}>
              Zur Karte
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
          <div className={styles.bkgDesktop}>
            <BkgKurz className={`${styles.bkgLine} num`} />
          </div>
        </div>

        <figure className={styles.figure}>
          <div className={styles.previewDesktop}>
            <StartKarteCanvas3d
              geoJson={data.geoJson}
              sites={data.sites}
              monate={data.monate}
              maxScaleValue={data.maxScaleValue}
              ariaLabel={mapAriaLabel}
            />
          </div>

          <Link
            href="/netzbetreiber"
            className={styles.previewMobile}
            aria-label={`${mapAriaLabel} Zur Karte.`}
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className={styles.mobileSvg}
              aria-hidden="true"
            >
              <g>
                {statePaths.map((st) => (
                  <path
                    key={st.name}
                    d={st.d}
                    className={styles.landPath}
                    strokeWidth={1.4}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              <g>
                {dots.map((d) => (
                  <circle
                    key={d.lok}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    vectorEffect="non-scaling-stroke"
                    className={styles.mobileDot}
                  />
                ))}
              </g>
              <g pointerEvents="none">
                {cities.map((c) => (
                  <g key={c.name} transform={`translate(${c.x}, ${c.y})`}>
                    <circle r={2.1} className={styles.cityDot} />
                    <text x={5} y={3} className={styles.cityLabel}>
                      {c.name}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </Link>

          <figcaption className={styles.bkgMobile}>
            <BkgKurz className={`${styles.bkgLine} num`} />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
