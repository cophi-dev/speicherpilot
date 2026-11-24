"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { NetzbetreiberG2Chart, NetzbetreiberG3Chart, NetzbetreiberG4Chart } from "@/components/bess-netzbetreiber/NetzbetreiberCharts.client";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import { useKnotenTheme } from "@/components/knoten/useKnotenTheme";
import { computeNetzbetreiberHeadlines } from "@/lib/bessNetzbetreiber/computeHeadlines";
import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import { eonSharePercent, prepareG2Bars, prepareGrowthStacks, prepareVnbBars } from "@/lib/bessNetzbetreiber/prepareModel";
import { resolveVnbSearchFocusKey } from "@/lib/bessNetzbetreiber/vnbSearch";

const NetzbetreiberMap = dynamic(() => import("@/components/bess-netzbetreiber/NetzbetreiberMap.client"), {
  ssr: false,
  loading: () => <div className="min-h-[240px] rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Karte lädt …</div>,
});

type ManifestShape = {
  stichtagMastr?: string;
  filterBreakdown?: {
    excludedNaturalPersonUnits?: number;
    excludedNsUnverifiedUnits?: number;
    excludedBruttoMw?: number;
    unitsAggregatedToSameCoordinate?: number;
  };
  eeStockMastr?: { maxPagesPerEnergyCarrier?: number; complete?: boolean };
};

function vnbSearchOptions(ranking: BessNetzbetreiberBundle["vnbRanking"]) {
  return ranking
    .filter((r) => r.operatorClass !== "uenb")
    .map((r) => ({ key: r.key, label: r.label, mw: r.bruttoMw }))
    .sort((a, b) => b.mw - a.mw);
}

export function NetzbetreiberResearchPage({ model }: { model: BessNetzbetreiberBundle }) {
  const { colors } = useKnotenTheme();
  const [qualityFilterOn, setQualityFilterOn] = useState(false);
  const [eonIncludeMitnetz, setEonIncludeMitnetz] = useState(true);
  const [vnbQuery, setVnbQuery] = useState("");
  const [g5Mode, setG5Mode] = useState<"stock" | "norm">("stock");

  const manifest = model.manifest as ManifestShape;
  const headlines = useMemo(
    () => computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz }),
    [model, eonIncludeMitnetz],
  );

  const sites = useMemo(
    () => (qualityFilterOn ? (model.sitesQualityFiltered ?? model.sitesDefault) : model.sitesDefault),
    [qualityFilterOn, model.sitesDefault, model.sitesQualityFiltered],
  );

  const vnbRanking = useMemo(
    () => (qualityFilterOn ? (model.vnbRankingQualityFiltered ?? model.vnbRanking) : model.vnbRanking),
    [qualityFilterOn, model.vnbRanking, model.vnbRankingQualityFiltered],
  );

  const scatterRows = useMemo(
    () => (qualityFilterOn ? (model.scatterQualityFiltered ?? model.scatterBundeslaender) : model.scatterBundeslaender),
    [qualityFilterOn, model.scatterBundeslaender, model.scatterQualityFiltered],
  );

  const growthSource = qualityFilterOn ? (model.growthQualityFiltered ?? model.growthDefault) : model.growthDefault;
  const growth = useMemo(() => prepareGrowthStacks(growthSource, true), [growthSource]);
  const g2Rows = useMemo(() => prepareG2Bars(vnbRanking), [vnbRanking]);
  const vnbBars = useMemo(() => prepareVnbBars(vnbRanking), [vnbRanking]);
  const eonPctVnb = eonSharePercent(vnbRanking, eonIncludeMitnetz);

  const focusKey = useMemo(() => {
    const q = vnbQuery.trim();
    if (!q) return null;
    const alias = resolveVnbSearchFocusKey(q);
    if (alias) return alias;
    const hit = vnbSearchOptions(vnbRanking).find((o) => o.label.toLowerCase().includes(q.toLowerCase()));
    return hit?.key ?? q.toLowerCase();
  }, [vnbQuery, vnbRanking]);

  const scatterData = scatterRows.map((r) => ({
    name: r.bundesland,
    x: r.eeRedispatch2025Gwh,
    y: r.bessBruttoGw,
    fullName: r.bundesland,
  }));

  const eeStock = model.eeStockBundeslaender;
  const eeSumGw = eeStock.reduce((s, r) => s + r.windOnshoreGw + r.pvGw, 0);
  const eeVorlaeufig = !((manifest.eeStockMastr?.complete ?? false) || eeSumGw > 130);

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

  const eonRow = g2Rows.find((r) => r.isEonGroup);
  const sh = scatterRows.find((r) => r.bundesland === "Schleswig-Holstein");
  const ni = scatterRows.find((r) => r.bundesland === "Niedersachsen");
  const by = scatterRows.find((r) => r.bundesland === "Bayern");

  return (
    <div className="v4-start" data-testid="netzbetreiber-page">
      <section className="v4-kopf" aria-labelledby="nb-h1">
        <div className="v4-kopf-inner v4-content">
          <p className="v4-kicker num">Bestand · MaStR · Speicher ≥ 1 MW netto in Betrieb</p>
          <h1 id="nb-h1" className="v4-h1">
            Über {formatQuantityUnit(headlines.bruttoGw, "de", 2, "GW")} Batteriespeicher in Betrieb — rund{" "}
            {formatQuantityUnit(headlines.eonBruttoGw, "de", 2, "GW")} ({formatQuantityUnit(headlines.eonSharePctTotal, "de", 0, "%")}) an
            E.ON-Netzen{eonIncludeMitnetz ? " inkl. MITNETZ" : " ohne MITNETZ"}.
          </h1>
          <p className="v4-subline mt-3">
            Öffentliche Bestände und SMARD-Redispatch je Bundesland, ohne Euro und ohne Netzgebietspolygone. Für Szenarien:{" "}
            <Link href="/szenarien" className="v4-text-link">
              Szenarien rechnen
            </Link>
            .
          </p>

          <div className={styles.kopfMap}>
            <div className={styles.mapShell} data-testid="nb-map">
              <NetzbetreiberMap sites={sites} palette={colors} focusKey={focusKey} />
            </div>
            <p className={styles.footnote}>
              Basiskarte ©{" "}
              <a href="https://www.openstreetmap.org/copyright" className="v4-text-link">
                OpenStreetMap
              </a>
              . VNB-Zuordnung über Anschluss-Netzbetreiber (MaStR).
            </p>
          </div>

          <ul className={styles.kpiGrid} aria-label="Kernaussagen">
            <li className={styles.kpiCard}>
              <strong>
                {formatQuantity(headlines.units, "de", 0)} Speicher ≥ 1 MW, {formatQuantityUnit(headlines.bruttoGw, "de", 2, "GW")} in Betrieb
              </strong>
              MaStR, Stichtag {headlines.stichtag}.
            </li>
            <li className={styles.kpiCard}>
              <strong>
                E.ON-Netze: {formatQuantityUnit(headlines.eonBruttoGw, "de", 2, "GW")} ({formatQuantityUnit(headlines.eonSharePctTotal, "de", 0, "%")} des Bestands)
              </strong>
              Zuordnung über MaStR-Nummern der Anschluss-Netzbetreiber (SNB-Liste). MITNETZ:{" "}
              {eonIncludeMitnetz ? "eingeschlossen" : "ausgeklammert"} (
              {formatQuantityUnit((model.headlineStats?.mitnetzOnly.bruttoMw ?? 752.4) / 1000, "de", 2, "GW")} brutto bei MITNETZ
              allein).
            </li>
            <li className={styles.kpiCard}>
              <strong>
                Zubau 2026: {formatQuantityUnit(headlines.zubau2026Gw, "de", 2, "GW")}, davon{" "}
                {formatQuantityUnit(headlines.zubau2026EonGw, "de", 2, "GW")} in E.ON-Netzen (
                {formatQuantityUnit(headlines.zubau2026EonSharePct, "de", 0, "%")})
              </strong>
              Inbetriebnahmejahr 2026 (MaStR-Feld), Einheiten-Summen.
            </li>
          </ul>

          <p className={styles.plainList}>
            Für Netzplanung: der Bestand ballt sich an westdeutschen E.ON-Netzen; auf Länderebene fallen hoher EE-Redispatch (
            {sh ? formatQuantityUnit(sh.eeRedispatch2025Gwh, "de", 0, "GWh") : "—"} in SH, {ni ? formatQuantityUnit(ni.eeRedispatch2025Gwh, "de", 0, "GWh") : "—"} in
            NI) und zugleich sichtbarer BESS-Zubau (Bayern {by ? formatQuantityUnit(by.bessBruttoGw, "de", 2, "GW") : "—"} BESS) nebeneinander — ohne Kausalurteil.
          </p>

          <div className={styles.searchRow}>
            <label htmlFor="vnb-suche" className="text-sm text-muted-foreground">
              Eigenen Netzbetreiber suchen
            </label>
            <input
              id="vnb-suche"
              className={styles.searchInput}
              list="vnb-suggest"
              value={vnbQuery}
              onChange={(e) => setVnbQuery(e.target.value)}
              placeholder="z. B. Westnetz, MITNETZ, EWE NETZ"
            />
            <datalist id="vnb-suggest">
              {vnbSearchOptions(vnbRanking).map((o) => (
                <option key={o.key} value={o.label} />
              ))}
            </datalist>
          </div>

          <details className={styles.filterDetails}>
            <summary className={styles.filterSummary}>Filter &amp; Datenstand</summary>
            <div className={styles.filterBody}>
              <p>
                Konzeptfilter: Batterie, In Betrieb, Netto ≥ 1 MW. Qualitätsfilter streicht{" "}
                {manifest.filterBreakdown?.excludedNaturalPersonUnits ?? 16} natürliche Personen und{" "}
                {manifest.filterBreakdown?.excludedNsUnverifiedUnits ?? 15} Niederspannung ohne NB-Prüfung (
                {formatQuantityUnit(manifest.filterBreakdown?.excludedBruttoMw ?? 134.7, "de", 1, "MW")} brutto).
              </p>
              <button
                type="button"
                className={styles.filterToggle}
                aria-pressed={qualityFilterOn}
                onClick={() => setQualityFilterOn((v) => !v)}
              >
                Qualitätsfilter: {qualityFilterOn ? "an" : "aus"}
              </button>
              <button
                type="button"
                className={styles.filterToggle}
                aria-pressed={eonIncludeMitnetz}
                onClick={() => setEonIncludeMitnetz((v) => !v)}
              >
                E.ON-Konzern: {eonIncludeMitnetz ? "mit MITNETZ" : "ohne MITNETZ"}
              </button>
            </div>
          </details>
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="g2-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">01 · VNB</p>
          <h2 id="g2-title" className="v4-chapter-h2">
            Bruttoleistung je Verteilnetzbetreiber
          </h2>
        </div>
        <div className="v4-content v4-luecke-wrap rounded-lg border border-border bg-card p-3 md:p-4">
          <NetzbetreiberG2Chart data={g2Rows} palette={colors} yAxisWidth={128} />
          <p className={styles.insight}>
            E.ON-Konzern (SNB): {formatQuantityUnit(headlines.eonBruttoGw, "de", 2, "GW")} (
            {formatQuantityUnit(headlines.eonSharePctTotal, "de", 0, "%")} am Gesamtbestand,{" "}
            {formatQuantityUnit(eonPctVnb, "de", 0, "%")} am VNB-Bestand ohne ÜNB).{" "}
            {eonRow ? `Größter E.ON-Bucket: ${eonRow.fullLabel} (${formatQuantityUnit(eonRow.bruttoMw, "de", 0, "MW")}).` : null}{" "}
            Übrige VNB unter Rang 13: {formatQuantityUnit(vnbBars.restMw, "de", 1, "MW")} (Summe, nicht in Grafik).
          </p>
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="g3-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">02 · Zubau</p>
          <h2 id="g3-title" className="v4-chapter-h2">
            Zubau 2026 vs. Bestand vor 2026
          </h2>
        </div>
        <div className="v4-content v4-luecke-wrap rounded-lg border border-border bg-card p-3 md:p-4">
          <NetzbetreiberG3Chart data={growth} palette={colors} />
          <p className={styles.insight}>
            Gesamt-Zubau 2026: {formatQuantityUnit(headlines.zubau2026Gw, "de", 2, "GW")} brutto — E.ON-Netze{" "}
            {formatQuantityUnit(headlines.zubau2026EonSharePct, "de", 0, "%")} davon.
          </p>
        </div>
      </section>

      <section className="v4-chapter" aria-labelledby="g4-title">
        <div className="v4-chapter-head v4-content">
          <p className="v4-chapter-num num">03 · Bundesländer</p>
          <h2 id="g4-title" className="v4-chapter-h2">
            EE-Redispatch 2025 und BESS in Betrieb
          </h2>
        </div>
        <div className="v4-content v4-luecke-wrap rounded-lg border border-border bg-card p-3 md:p-4">
          <NetzbetreiberG4Chart data={scatterData} palette={colors} />
          <p className={styles.footnote}>
            Quelle X: SMARD Energiedaten kompakt, CSV s-nepm_baet-1-* (2025), Spalten Wind an Land + PV (Redispatch-Reduzierung, GWh je Bundesland). Index 2
            = Bayern ({by ? formatQuantityUnit(by.eeRedispatch2025Gwh, "de", 0, "GWh") : "—"}), 9 = Niedersachsen, 15 = Schleswig-Holstein.
          </p>
          <p className={styles.insight}>
            Höchster BESS-Bestand: {formatQuantityUnit(headlines.topBessBl.gw, "de", 2, "GW")} ({headlines.topBessBl.bundesland}).
          </p>
          <p className={styles.footnote}>
            ÜNB in Betrieb: {formatQuantityUnit(model.uenbEbene.inBetriebBruttoGw, "de", 2, "GW")} · in Planung ≥ 1 MW:{" "}
            {formatQuantityUnit(model.uenbEbene.inPlanungBruttoGw, "de", 2, "GW")} (MaStR).
          </p>
        </div>
      </section>

      {eeStock.length > 0 ? (
        <section className="v4-chapter" aria-labelledby="g5-title">
          <div className="v4-chapter-head v4-content">
            <p className="v4-chapter-num num">04 · Erneuerbare</p>
            <h2 id="g5-title" className="v4-chapter-h2">
              Wind an Land, PV und BESS je Bundesland
              {eeVorlaeufig ? (
                <>
                  {" "}
                  <span className={styles.badgeVorl}>vorläufig</span>
                </>
              ) : null}
            </h2>
          </div>
          <div className="v4-content v4-luecke-wrap rounded-lg border border-border bg-card p-3 md:p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" className={styles.filterToggle} aria-pressed={g5Mode === "stock"} onClick={() => setG5Mode("stock")}>
                Bestände (GW)
              </button>
              <button type="button" className={styles.filterToggle} aria-pressed={g5Mode === "norm"} onClick={() => setG5Mode("norm")}>
                MW BESS je GW EE{eeVorlaeufig ? " (vorläufig)" : ""}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              {g5Mode === "norm" ? (
                <BarChart data={g5Data} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.grid} />
                  <XAxis type="number" tick={{ fill: colors.muted, fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={118} tick={{ fill: colors.ink, fontSize: 10 }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="mwPerGwEe" fill={colors.teal} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              ) : (
                <BarChart data={g5Data} margin={{ left: 8, right: 8, top: 28, bottom: 72 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis dataKey="name" tick={{ fill: colors.muted, fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={72} />
                  <YAxis tickFormatter={(v) => `${v} GW`} tick={{ fill: colors.muted, fontSize: 12 }} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                  <Bar dataKey="wind" stackId="ee" fill={colors.gray} name="Wind an Land" isAnimationActive={false} />
                  <Bar dataKey="pv" stackId="ee" fill={colors.rust} name="PV" isAnimationActive={false} />
                  <Bar dataKey="bess" fill={colors.teal} name="BESS" isAnimationActive={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
            <p className={styles.footnote}>
              MaStR Stromerzeugung In Betrieb (Wind 2497 / PV 2495){eeVorlaeufig ? ", Auszug noch unvollständig — Kennzeichnung vorläufig." : "."}
            </p>
          </div>
        </section>
      ) : null}

      <p className={`v4-chapter-foot v4-content num ${styles.chapterFoot}`}>
        Quellen: Marktstammdatenregister (dl-de/by-2-0), SMARD Energiedaten kompakt (CC BY 4.0), Stichtag {headlines.stichtag}.{" "}
        <Link href="/methodik#bess-netzbetreiber" className="v4-text-link">
          Methodik
        </Link>
      </p>
    </div>
  );
}