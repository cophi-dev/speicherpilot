"use client";

import "leaflet/dist/leaflet.css";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";
import research from "@/components/research/research.module.css";
import type { BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";
import {
  eonSharePercent,
  maxBarMw,
  prepareGrowthStacks,
  prepareVnbBars,
  truncateVnbLabel,
} from "@/lib/bessNetzbetreiber/prepareModel";

const EON_BAR = "#0b6870";
const VNB_BAR = "#c4a574";
const MUTED_BAR = "#9ea3a9";
const SCATTER_FILL = "#0b6870";

const NetzbetreiberMap = dynamic(() => import("@/components/bess-netzbetreiber/NetzbetreiberMap.client"), {
  ssr: false,
  loading: () => <div className={styles.missing}>Karte lädt …</div>,
});

function fmtGwFromMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(2)} GW`;
  return `${mw.toFixed(0)} MW`;
}

function fmtGw(n: number): string {
  return `${n.toFixed(2)} GW`;
}

type ManifestShape = {
  stichtagMastr?: string;
  plausibility?: {
    bruttoGw?: number;
    nettoGw?: number;
    energyGwh?: number;
    unitsGe1MwNetto?: number;
    sitesOnMap?: number;
  };
  filterBreakdown?: {
    conceptUnits?: number;
    excludedNaturalPersonUnits?: number;
    excludedNsUnverifiedUnits?: number;
    excludedBruttoMw?: number;
    unitsAggregatedToSameCoordinate?: number;
    uenbAttachedUnitsConcept?: number;
    explanation?: string;
  };
  networkLengthNormalization?: { available: boolean; status?: string; note?: string };
  eonGroupMembersDefault?: string[];
};

export function NetzbetreiberResearchPage({ model }: { model: BessNetzbetreiberBundle }) {
  const [eonFull, setEonFull] = useState(true);
  const [qualityFilterOn, setQualityFilterOn] = useState(false);
  const [g2EeNorm, setG2EeNorm] = useState(false);

  const manifest = model.manifest as ManifestShape;

  const sites = useMemo(
    () =>
      qualityFilterOn
        ? (model.sitesQualityFiltered ?? model.sitesDefault)
        : model.sitesDefault,
    [qualityFilterOn, model.sitesDefault, model.sitesQualityFiltered],
  );

  const vnbRanking = useMemo(
    () => (qualityFilterOn ? (model.vnbRankingQualityFiltered ?? model.vnbRanking) : model.vnbRanking),
    [qualityFilterOn, model.vnbRanking, model.vnbRankingQualityFiltered],
  );

  const scatterRows = useMemo(
    () =>
      qualityFilterOn
        ? (model.scatterQualityFiltered ?? model.scatterBundeslaender)
        : model.scatterBundeslaender,
    [qualityFilterOn, model.scatterBundeslaender, model.scatterQualityFiltered],
  );

  const totals = useMemo(() => {
    if (qualityFilterOn && model.totalsQualityFiltered) return model.totalsQualityFiltered;
    return model.totalsDefault;
  }, [qualityFilterOn, model.totalsDefault, model.totalsQualityFiltered]);

  const growthSource = useMemo(() => {
    if (!eonFull) return model.growthEonKern ?? model.growthDefault;
    return qualityFilterOn
      ? (model.growthQualityFiltered ?? model.growthDefault)
      : model.growthDefault;
  }, [eonFull, qualityFilterOn, model.growthDefault, model.growthEonKern, model.growthQualityFiltered]);

  const vnbBars = useMemo(() => prepareVnbBars(vnbRanking), [vnbRanking]);
  const growth = useMemo(() => prepareGrowthStacks(growthSource, eonFull), [growthSource, eonFull]);
  const eonPct = eonSharePercent(vnbRanking, eonFull);

  const vnbTotalVnbOnly = useMemo(
    () => vnbRanking.filter((r) => r.operatorClass !== "uenb").reduce((s, r) => s + r.bruttoMw, 0),
    [vnbRanking],
  );

  const eonRow = vnbBars.rows.find((r) => r.isEonGroup);
  const eonBrutto = eonRow?.bruttoMw ?? vnbRanking.filter((r) => r.key.startsWith("eon")).reduce((s, r) => s + r.bruttoMw, 0);

  const barData = vnbBars.rows.map((r) => {
    const { short, full } = truncateVnbLabel(r.label, 26);
    return {
      name: short,
      fullLabel: full,
      bruttoMw: r.bruttoMw,
      fill: r.isEonGroup ? EON_BAR : MUTED_BAR,
    };
  });

  const barXMax = Math.max(maxBarMw(vnbBars.rows) * 1.08, vnbBars.markerMw * 1.2);

  const growthChartData = growth.map((g) => ({
    name: g.label.length > 22 ? `${g.label.slice(0, 20)}…` : g.label,
    fullLabel: g.label,
    vor2026: g.vor2026Mw,
    neu2026: g.y2026Mw,
    total: g.vor2026Mw + g.y2026Mw,
  }));

  const growthYMax = Math.max(...growthChartData.map((g) => g.total), 1) * 1.1;

  const scatterData = scatterRows.map((r) => ({
    name: r.bundesland.length > 16 ? `${r.bundesland.slice(0, 14)}…` : r.bundesland,
    x: r.eeRedispatch2025Gwh,
    y: r.bessBruttoGw,
    fullName: r.bundesland,
  }));

  const scatterYMax = Math.max(...scatterData.map((d) => d.y), 0.01) * 1.15;
  const scatterXMax = Math.max(...scatterData.map((d) => d.x), 1) * 1.05;

  const eeStock = model.eeStockBundeslaender;
  const eeStockReady = eeStock.length > 0;

  const g5Data = useMemo(() => {
    if (!eeStockReady) return [];
    return eeStock.map((r) => {
      const bessGw =
        scatterRows.find((s) => s.bundesland === r.bundesland)?.bessBruttoGw ?? 0;
      const eeGw = r.windOnshoreGw + r.pvGw;
      const mwPerGwEe = eeGw > 0 ? (bessGw * 1000) / eeGw : 0;
      return {
        name: r.bundesland.length > 12 ? `${r.bundesland.slice(0, 10)}…` : r.bundesland,
        fullName: r.bundesland,
        wind: r.windOnshoreGw,
        pv: r.pvGw,
        bess: bessGw,
        mwPerGwEe: Math.round(mwPerGwEe * 10) / 10,
      };
    });
  }, [eeStock, eeStockReady, scatterRows]);

  const topScatter = [...scatterData].sort((a, b) => b.y - a.y)[0];
  const topGrowth2026 = [...growthChartData].sort((a, b) => b.neu2026 - a.neu2026)[0];

  const fb = manifest.filterBreakdown;

  return (
    <div className={`${styles.netzbetreiberPage} ${styles.root}`} data-testid="netzbetreiber-page">
      <p className={research.eyebrow}>Forschung · Bestand in Betrieb</p>
      <h1 className={research.h1}>BESS je Netzbetreiber</h1>
      <p className={styles.lead}>
        Wo stehen Batteriespeicher ab 1&nbsp;MW Nettonennleistung, die im Marktstammdatenregister auf „In Betrieb“ stehen
        (Energieträger Speicher, Technologie Batterie)? Die Karte zeigt Standorte (MaStR), nicht die Warteschlange. Kein
        Kausalurteil — öffentliche Bestände und Szenario-Vergleiche.
      </p>

      <p className={styles.kpiLine}>
        {totals.units ?? manifest.plausibility?.unitsGe1MwNetto ?? "—"} Einheiten · Brutto{" "}
        {fmtGw(totals.bruttoMw / 1000)} · Netto {fmtGw(totals.nettoMw / 1000)} ·{" "}
        {totals.energyGwh.toFixed(2)} GWh nutzbare Kapazität
        {qualityFilterOn ? " (Qualitätsfilter an)" : " (Konzeptfilter)"}
      </p>

      <div className={styles.controls}>
        <button
          type="button"
          className={eonFull ? styles.toggleOn : styles.toggle}
          onClick={() => setEonFull((v) => !v)}
          aria-pressed={eonFull}
        >
          E.ON-Gruppe: {eonFull ? "erweitert" : "Kern"}
        </button>
        <button
          type="button"
          className={qualityFilterOn ? styles.toggleOn : styles.toggle}
          onClick={() => setQualityFilterOn((v) => !v)}
          aria-pressed={qualityFilterOn}
        >
          Qualitätsfilter (natürliche Personen / ungeprüfte NS): {qualityFilterOn ? "an" : "aus"}
        </button>
      </div>

      {fb ? (
        <p className={styles.filterNote}>
          Konzeptfilter: {fb.conceptUnits ?? "—"} Einheiten. Qualitätsfilter streicht optional{" "}
          {fb.excludedNaturalPersonUnits ?? 0} natürliche Personen ({fb.excludedBruttoMw ?? 0} MW brutto) und{" "}
          {fb.excludedNsUnverifiedUnits ?? 0} Niederspannung ohne NB-Prüfung. Auf der Karte{" "}
          {manifest.plausibility?.sitesOnMap ?? sites.length} Punkte — {fb.unitsAggregatedToSameCoordinate ?? 0} Einheiten
          teilen dieselbe Koordinate; {fb.uenbAttachedUnitsConcept ?? 0} Einheiten am ÜNB nach MaStR-Feld.{" "}
          {fb.explanation}
        </p>
      ) : null}

      {eonFull && manifest.eonGroupMembersDefault ? (
        <p className={styles.eonList}>E.ON-Gruppe (erweitert): {manifest.eonGroupMembersDefault.join(", ")}</p>
      ) : null}

      <section className={styles.chartCard} aria-labelledby="g1-title">
        <h2 id="g1-title" className={styles.chartTitle}>
          Karte: Standorte nach Bruttoleistung
        </h2>
        <div className={styles.mapWrap}>
          <NetzbetreiberMap sites={sites} />
        </div>
        <p className={styles.mapAttribution}>
          Basiskarte ©{" "}
          <a href="https://www.openstreetmap.org/copyright" className="v4-text-link">
            OpenStreetMap
          </a>{" "}
          (ODbL). VNB-Zuordnung über Anschluss-Netzbetreiber (MaStR), nicht amtliche Netzgebiete.
        </p>
        <p className={styles.insight}>
          Stichtag {manifest.stichtagMastr ?? "—"}: {sites.length} Kartenpunkte, {totals.units} Einheiten, Brutto{" "}
          {fmtGw(totals.bruttoMw / 1000)} — Kreisfläche ∝ Bruttoleistung.
        </p>
        <div className={styles.legendRow}>
          <span>
            <span className={styles.dotEon} aria-hidden /> E.ON-Gruppe
          </span>
          <span>
            <span className={styles.dotVnb} aria-hidden /> andere VNB
          </span>
          <span>
            <span className={styles.dotUenb} aria-hidden /> ÜNB-Ebene
          </span>
        </div>
      </section>

      <section className={styles.chartCard} aria-labelledby="g2-title">
        <h2 id="g2-title" className={styles.chartTitle}>
          Bruttoleistung je Verteilnetzbetreiber
        </h2>
        {!manifest.networkLengthNormalization?.available ? (
          <p className={styles.chartFoot}>
            MW je 1.000&nbsp;km Stromkreislänge ({manifest.networkLengthNormalization?.status ?? "folgt"}): erst mit
            belastbaren VNB-Veröffentlichungen (siehe Datenfile). Darstellung hier: absolute Brutto-MW je VNB.
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 28 + 40)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 28, top: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d0d3d7" />
            <XAxis
              type="number"
              domain={[0, barXMax]}
              tickFormatter={(v) => fmtGwFromMw(Number(v))}
            />
            <YAxis type="category" dataKey="name" width={138} tick={{ fontSize: 11 }} interval={0} />
            <Tooltip
              formatter={(v) => [fmtGwFromMw(Number(v ?? 0)), "Brutto"]}
              labelFormatter={(_, p) => {
                const row = p?.[0]?.payload as { fullLabel?: string } | undefined;
                return row?.fullLabel ?? "";
              }}
            />
            <ReferenceLine
              x={vnbBars.markerMw}
              stroke="#6b7178"
              strokeDasharray="4 4"
              label={{ value: "50 MW", position: "insideTopRight", fill: "#6b7178", fontSize: 10 }}
            />
            <Bar dataKey="bruttoMw" radius={[0, 4, 4, 0]}>
              {barData.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className={styles.insight}>
          {eonRow
            ? `${eonRow.label}: ${fmtGwFromMw(eonBrutto)} von ${fmtGwFromMw(vnbTotalVnbOnly)} VNB-Bestand (${eonPct.toFixed(0)} %)`
            : `E.ON-Anteil: ca. ${eonPct.toFixed(0)} %`}
          . Übrige VNB unter Top 13: {fmtGwFromMw(vnbBars.restMw)} (nur Summenzeile, nicht in der Achse).
        </p>
      </section>

      <section className={styles.chartCard} aria-labelledby="g3-title">
        <h2 id="g3-title" className={styles.chartTitle}>
          Zubau 2026 vs. Bestand vor 2026
        </h2>
        <ResponsiveContainer width="100%" height={Math.max(260, growthChartData.length * 52)}>
          <BarChart
            data={growthChartData}
            layout="vertical"
            margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d0d3d7" />
            <XAxis
              type="number"
              domain={[0, growthYMax]}
              tickFormatter={(v) => fmtGwFromMw(Number(v))}
            />
            <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 11 }} interval={0} />
            <Tooltip
              formatter={(v, key) => [
                fmtGwFromMw(Number(v ?? 0)),
                key === "vor2026" ? "vor 2026" : "Zubau 2026",
              ]}
              labelFormatter={(_, p) => (p?.[0]?.payload as { fullLabel?: string })?.fullLabel ?? ""}
            />
            <Legend />
            <Bar dataKey="vor2026" name="vor 2026" stackId="a" fill={MUTED_BAR} />
            <Bar dataKey="neu2026" name="Zubau 2026" stackId="a" fill={VNB_BAR} />
          </BarChart>
        </ResponsiveContainer>
        <p className={styles.insight}>
          Größter Zubau 2026: {topGrowth2026?.fullLabel ?? "—"} mit{" "}
          {topGrowth2026 ? fmtGwFromMw(topGrowth2026.neu2026) : "—"} (Brutto, Inbetriebnahmejahr 2026).
        </p>
      </section>

      <section className={styles.chartCard} aria-labelledby="g4-title">
        <h2 id="g4-title" className={styles.chartTitle}>
          Bundesländer: EE-Redispatch 2025 und BESS in Betrieb
        </h2>
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d0d3d7" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, scatterXMax]}
              name="EE-Redispatch"
              unit=" GWh"
              tickFormatter={(v) => `${Number(v).toFixed(0)}`}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, scatterYMax]}
              name="BESS"
              unit=" GW"
              tickFormatter={(v) => `${Number(v).toFixed(2)}`}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(val, key) => {
                const n = Number(val ?? 0);
                return key === "x"
                  ? [`${n.toFixed(1)} GWh`, "EE-Redispatch 2025"]
                  : [`${n.toFixed(2)} GW`, "BESS Brutto"];
              }}
              labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
            />
            <Scatter data={scatterData} fill={SCATTER_FILL} />
          </ScatterChart>
        </ResponsiveContainer>
        <p className={styles.chartFoot}>
          X: Wind-onshore- und PV-Redispatch-Reduzierungen 2025 je Bundesland, SMARD Energiedaten kompakt (CC BY 4.0).
          Y: MaStR-Bruttoleistung (GW).
        </p>
        <p className={styles.insight}>
          Höchster BESS-Bestand: {topScatter?.fullName ?? "—"} mit {topScatter ? fmtGw(topScatter.y) : "—"} Brutto bei{" "}
          {topScatter ? `${topScatter.x.toFixed(0)} GWh` : "—"} EE-Redispatch 2025.
        </p>
        <div className={styles.uenbBox}>
          <h3 className={styles.chartTitle}>ÜNB-Ebene</h3>
          <p className={styles.chartFoot}>
            In Betrieb: {fmtGw(model.uenbEbene.inBetriebBruttoGw)} · In Planung (≥1&nbsp;MW):{" "}
            {fmtGw(model.uenbEbene.inPlanungBruttoGw)} (MaStR Spannungsebene / Netzbetreiberfeld).
          </p>
        </div>
      </section>

      {eeStockReady ? (
        <section className={styles.chartCard} aria-labelledby="g5-title">
          <h2 id="g5-title" className={styles.chartTitle}>
            Erneuerbare vs. BESS je Bundesland
          </h2>
          <div className={styles.controls}>
            <button
              type="button"
              className={g2EeNorm ? styles.toggleOn : styles.toggle}
              onClick={() => setG2EeNorm((v) => !v)}
              aria-pressed={g2EeNorm}
            >
              Anzeige: {g2EeNorm ? "MW BESS je GW Wind+PV" : "Bestände (GW)"}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {g2EeNorm ? (
              <BarChart data={g5Data} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d0d3d7" />
                <XAxis type="number" dataKey="mwPerGwEe" unit=" MW/GW" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} interval={0} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)} MW/GW`, "BESS je GW EE"]}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
                />
                <Bar dataKey="mwPerGwEe" fill={EON_BAR} radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <BarChart data={g5Data} margin={{ left: 8, right: 8, top: 8, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d0d3d7" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={72} />
                <YAxis tickFormatter={(v) => `${v} GW`} />
                <Tooltip
                  labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
                />
                <Legend />
                <Bar dataKey="wind" stackId="ee" fill="#7ab8bc" name="Wind an Land" />
                <Bar dataKey="pv" stackId="ee" fill="#e8c468" name="PV" />
                <Bar dataKey="bess" fill={EON_BAR} name="BESS Brutto" />
              </BarChart>
            )}
          </ResponsiveContainer>
          <p className={styles.insight}>
            MaStR In Betrieb: Wind an Land + PV je Bundesland gegen BESS-Brutto. Normierung: MW Speicher je GW
            installierter EE — keine Kausalität. Generator-Auszug über{" "}
            {(model.manifest as { eeStockMastr?: { maxPagesPerEnergyCarrier?: number } })?.eeStockMastr
              ?.maxPagesPerEnergyCarrier ?? "n"}{" "}
            MaStR-Seiten je Energieträger (siehe Methodik).
          </p>
        </section>
      ) : null}

      <p className={styles.chartFoot}>
        Quellen, Lizenzen, Stichtage:{" "}
        <a href="/methodik#bess-netzbetreiber" className="v4-text-link">
          Methodik → BESS je Netzbetreiber
        </a>
        . Daten: <code>data/bess-netzbetreiber/</code>
      </p>
    </div>
  );
}