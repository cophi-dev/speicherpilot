"use client";

import Link from "next/link";
import { type CSSProperties, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { NetzbetreiberG3Chart, NetzbetreiberG4Chart } from "@/components/bess-netzbetreiber/NetzbetreiberCharts.client";
import { NetzbetreiberSvgMap } from "@/components/bess-netzbetreiber/NetzbetreiberSvgMap";
import { NetzbetreiberVnbBars } from "@/components/bess-netzbetreiber/NetzbetreiberVnbBars";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { useKnotenTheme } from "@/components/knoten/useKnotenTheme";
import { computeNetzbetreiberHeadlines } from "@/lib/bessNetzbetreiber/computeHeadlines";
import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import { prepareGrowthStacks, prepareVnbBars, truncateVnbLabel } from "@/lib/bessNetzbetreiber/prepareModel";
import { resolveVnbSearchFocusKey } from "@/lib/bessNetzbetreiber/vnbSearch";

type ManifestShape = {
  stichtagMastr?: string;
  filterBreakdown?: {
    excludedNaturalPersonUnits?: number;
    excludedNsUnverifiedUnits?: number;
    excludedBruttoMw?: number;
  };
  eeStockMastr?: { complete?: boolean };
};

export function NetzbetreiberResearchPage({ model }: { model: BessNetzbetreiberBundle }) {
  const { colors } = useKnotenTheme();
  const [eonIncludeMitnetz, setEonIncludeMitnetz] = useState(true);
  const [vnbQuery, setVnbQuery] = useState("");

  const manifest = model.manifest as ManifestShape;
  const headlines = useMemo(
    () => computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz }),
    [model, eonIncludeMitnetz],
  );

  const sites = model.sitesDefault;
  const vnbRanking = model.vnbRanking;
  const growth = useMemo(() => prepareGrowthStacks(model.growthDefault, { showMitnetz: eonIncludeMitnetz }), [model.growthDefault, eonIncludeMitnetz]);
  const vnbBarRows = useMemo(() => {
    const { rows } = prepareVnbBars(vnbRanking);
    return rows.map((r) => {
      const { full, short } = truncateVnbLabel(r.label, 28);
      return {
        ...r,
        fullLabel: full,
        shortLabel: short,
        displayMw: r.bruttoMw,
        capped: false,
        isEonGroup: r.key.startsWith("eon") || r.key === "mitnetz_envia",
      };
    });
  }, [vnbRanking]);

  const focusKey = useMemo(() => {
    const q = vnbQuery.trim();
    if (!q) return null;
    const alias = resolveVnbSearchFocusKey(q);
    if (alias) return alias;
    const hit = vnbRanking.find(
      (o) => o.operatorClass !== "uenb" && o.label.toLowerCase().includes(q.toLowerCase()),
    );
    return hit?.key ?? q.toLowerCase();
  }, [vnbQuery, vnbRanking]);

  const stichtagRaw = manifest.stichtagMastr ?? headlines.stichtag;
  const stichtagDe = /^\d{4}-\d{2}-\d{2}$/.test(stichtagRaw)
    ? stichtagRaw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3.$2.$1")
    : stichtagRaw;
  const eonGwFormatted = formatQuantityUnit(headlines.eonBruttoGw, "de", 2, "GW");
  const eonGwParts = eonGwFormatted.replace(/\s*GW$/i, "").trim();
  const heroCh = String(eonGwParts.replace(/\s/g, "").length + 2);

  const scatterRows = model.scatterBundeslaender;
  const scatterData = scatterRows.map((r) => ({
    name: r.bundesland,
    x: r.eeRedispatch2025Gwh,
    y: r.bessBruttoGw,
    fullName: r.bundesland,
  }));

  const eeStock = model.eeStockBundeslaender;
  const g5Data = eeStock.map((r) => {
    const bessGw = scatterRows.find((s) => s.bundesland === r.bundesland)?.bessBruttoGw ?? 0;
    const eeGw = r.windOnshoreGw + r.pvGw;
    return {
      name: r.bundesland,
      wind: r.windOnshoreGw,
      pv: r.pvGw,
      bess: bessGw,
      mwPerGwEe: eeGw > 0 ? (bessGw * 1000) / eeGw : 0,
    };
  });

  const h1 = eonIncludeMitnetz
    ? "Mehr als die Hälfte der Großspeicher hängt an E.ON-Netzen."
    : "Der Großteil der ≥1-MW-Speicher liegt an westdeutschen Verteilnetzen.";

  return (
    <div className={styles.netzbetreiberV4} data-testid="netzbetreiber-page">
      <section className="v4-kopf" aria-labelledby="nb-h1">
        <div className="v4-kopf-inner v4-content">
          <p className="v4-kicker num">BESS-KARTE · NETZBETREIBER · DATENSTAND {stichtagDe}</p>
          <p id="nb-leitfrage" className="v4-subline" style={{ marginBottom: "0.35rem", fontWeight: 500 }}>
            Wo stehen Deutschlands Batteriespeicher?
          </p>

          <div className="v4-kopf-intro">
            <h1 id="nb-h1" className="v4-h1" style={{ maxWidth: "22ch" }}>
              {h1}
            </h1>
            <div className="v4-kopf-subgrid">
              <p className={`v4-subline ${styles.leadTight}`}>
                Modell: MaStR-Konzeptfilter (Batterie, In Betrieb, netto ≥ 1 MW).{" "}
                {formatQuantity(headlines.units, "de", 0)} Einheiten mit{" "}
                {formatQuantityUnit(headlines.bruttoGw, "de", 2, "GW")} brutto im Bestand. Konzernzuordnung über
                feste SNB-Nummern;{" "}
                <button
                  type="button"
                  className={styles.mitnetzLink}
                  onClick={() => setEonIncludeMitnetz((v) => !v)}
                >
                  {eonIncludeMitnetz ? "MITNETZ im E.ON-Konzern eingeschlossen" : "ohne mitteldeutsche Tochter"}
                </button>
                .
              </p>
              <div className="v4-preis-block">
                <p className="v4-preis-label num">Bestand</p>
                <p className="v4-preis-value num">
                  {formatQuantityUnit(headlines.bruttoGw, "de", 2, "GW")} in Betrieb, MaStR
                </p>
              </div>
            </div>
          </div>

          <div className={`v4-kopf-hero ${styles.netzbetreiberV4Hero}`}>
            <div className="v4-kopf-zahl">
              <p
                className="v4-riesenzahl num"
                aria-hidden="true"
                style={{ "--v4-ries-ch": heroCh } as CSSProperties}
              >
                {eonGwParts}
                <span className="v4-riesenzahl-unit">GW</span>
              </p>
              <div className="v4-kern-row">
                <span>
                  an E.ON-Netzen, {formatQuantityUnit(headlines.eonSharePctTotal, "de", 0, "%")} der Leistung in
                  Betrieb
                </span>
              </div>
            </div>
            <div className={styles.mapColumn}>
              <NetzbetreiberSvgMap sites={sites} focusKey={focusKey} />
            </div>
          </div>

          <p className={styles.flowPara}>
            Zubau mit Inbetriebnahme 2026: {formatQuantityUnit(headlines.zubau2026Gw, "de", 2, "GW")} brutto — davon{" "}
            {formatQuantityUnit(headlines.zubau2026EonGw, "de", 2, "GW")} an E.ON-Netzen (
            {formatQuantityUnit(headlines.zubau2026EonSharePct, "de", 0, "%")} des Zubaus). ÜNB in Betrieb (netto):{" "}
            {formatQuantityUnit(model.uenbEbene.inBetriebNettoGw ?? model.uenbEbene.inBetriebBruttoGw, "de", 2, "GW")}{" "}
            ({model.uenbEbene.inBetriebUnits ?? "—"} Einheiten, Konzeptfilter).
          </p>

          <div className={styles.searchLine}>
            <label htmlFor="vnb-suche" className="v4-subline">
              Netzbetreiber auf der Karte markieren
            </label>
            <input
              id="vnb-suche"
              className={styles.searchInput}
              value={vnbQuery}
              onChange={(e) => setVnbQuery(e.target.value)}
              placeholder="Name eingeben …"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section className="v4-chapter v4-content" aria-labelledby="g2-title">
        <p className="v4-chapter-num num">01 — Verteilnetzbetreiber</p>
        <h2 id="g2-title" className="v4-chapter-h2">
          Bruttoleistung (Top 13)
        </h2>
        <p className="v4-subline">
          Summen je Einheit im Bundle, nicht über Kartenpunkte. E.ON-Tochtergesellschaften im Akzent, übrige Netzbetreiber
          grau.
        </p>
        <NetzbetreiberVnbBars rows={vnbBarRows} />
      </section>

      <details className={styles.moreData}>
        <summary className={styles.moreDataSummary}>Mehr Daten</summary>
        <div className={styles.moreDataBody}>
          <section aria-labelledby="g3-more">
            <p className="v4-chapter-num num">Zubau 2026</p>
            <h2 id="g3-more" className="v4-chapter-h2">
              Bestand vor 2026 und Zubau 2026
            </h2>
            <NetzbetreiberG3Chart data={growth} palette={colors} />
          </section>
          <section aria-labelledby="g4-more">
            <p className="v4-chapter-num num">Bundesländer</p>
            <h2 id="g4-more" className="v4-chapter-h2">
              EE-Redispatch 2025 und BESS (Modell)
            </h2>
            <NetzbetreiberG4Chart data={scatterData} palette={colors} />
            <p className="v4-subline">
              ÜNB in Betrieb brutto {formatQuantityUnit(model.uenbEbene.inBetriebBruttoGw, "de", 2, "GW")}, netto{" "}
              {formatQuantityUnit(model.uenbEbene.inBetriebNettoGw ?? 0, "de", 2, "GW")} — siehe{" "}
              <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
                Methodik
              </Link>
              .
            </p>
          </section>
          {eeStock.length > 0 ? (
            <section aria-labelledby="g5-more">
              <p className="v4-chapter-num num">Erneuerbare</p>
              <h2 id="g5-more" className="v4-chapter-h2">
                Wind, PV und BESS je Bundesland (Modell, MaStR-Auszug)
              </h2>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={g5Data} margin={{ left: 8, right: 8, top: 28, bottom: 72 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="name" tick={{ fill: colors.muted, fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={72} />
                  <YAxis tickFormatter={(v) => `${v} GW`} tick={{ fill: colors.muted, fontSize: 12 }} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                  <Tooltip />
                  <Bar dataKey="wind" stackId="ee" fill={colors.gray} name="Wind an Land" isAnimationActive={false} />
                  <Bar dataKey="pv" stackId="ee" fill={colors.rust} name="PV" isAnimationActive={false} />
                  <Bar dataKey="bess" fill={colors.teal} name="BESS" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          ) : null}
        </div>
      </details>

      <p className={`v4-chapter-foot v4-content num ${styles.chapterFoot}`}>
        Quellen: Marktstammdatenregister (dl-de/by-2-0), SMARD Energiedaten kompakt (CC BY 4.0), Stichtag {stichtagDe}.{" "}
        <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
          Methodik
        </Link>
      </p>
    </div>
  );
}