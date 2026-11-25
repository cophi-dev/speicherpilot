"use client";

import { useMemo, useState } from "react";

import type { BessSite } from "@/lib/bessNetzbetreiber/schema";
import {
  germanyOutlineSvgPath,
  projectSiteToSvg,
} from "@/lib/bessNetzbetreiber/germanyOutlineData";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { formatQuantityUnit } from "@/lib/formatQuantity";

const VIEW_W = 1000;
const VIEW_H = 1350;

function isEonSite(site: BessSite): boolean {
  return site.operatorClass === "eon" || site.vnbBucketKey.startsWith("eon") || site.vnbBucketKey === "mitnetz_envia";
}

function pointRadiusMw(mw: number): number {
  return Math.min(28, Math.max(3, Math.sqrt(Math.max(mw, 0.2)) * 4.2));
}

export function NetzbetreiberSvgMap({
  sites,
  focusKey,
}: {
  sites: BessSite[];
  focusKey?: string | null;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const outline = useMemo(() => germanyOutlineSvgPath(VIEW_W, VIEW_H), []);

  const points = useMemo(() => {
    const mapped = sites.map((site) => {
      const { x, y } = projectSiteToSvg(site.lat, site.lng, VIEW_W, VIEW_H);
      const dimmed = Boolean(focusKey && site.vnbBucketKey !== focusKey && !site.vnbBucketLabel.toLowerCase().includes((focusKey ?? "").toLowerCase()));
      return {
        site,
        x,
        y,
        r: pointRadiusMw(site.bruttoMw),
        eon: isEonSite(site),
        dimmed,
        label: `${site.vnbBucketLabel}: ${formatQuantityUnit(site.bruttoMw, "de", 1, "MW")} brutto`,
      };
    });
    return mapped.sort((a, b) => a.r - b.r);
  }, [sites, focusKey]);

  return (
    <figure className={styles.svgMapFigure}>
      <svg
        className={styles.svgMap}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Speicherstandorte in Deutschland, Punkte nach Netzbetreiber"
        onMouseLeave={() => setTip(null)}
      >
        <path d={outline} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.4} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <circle
            key={`${p.site.lat}|${p.site.lng}|${p.site.vnbBucketKey}|${p.site.bruttoMw}`}
            cx={p.x}
            cy={p.y}
            r={p.r}
            className={p.eon ? styles.svgDotEon : styles.svgDotOther}
            opacity={p.dimmed ? 0.25 : 0.85}
            onMouseEnter={() => setTip({ x: p.x, y: p.y, text: p.label })}
            onFocus={() => setTip({ x: p.x, y: p.y, text: p.label })}
            tabIndex={0}
          />
        ))}
      </svg>
      {tip ? (
        <p className={styles.svgMapTip} role="status">
          {tip.text}
        </p>
      ) : null}
      <figcaption className={`${styles.svgMapLegend} num`}>● E.ON-Gruppe ● übrige Netzbetreiber</figcaption>
    </figure>
  );
}