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
  prepareGrowthStacks,
  prepareVnbBars,
} from "@/lib/bessNetzbetreiber/prepareModel";

const NetzbetreiberMap = dynamic(() => import("@/components/bess-netzbetreiber/NetzbetreiberMap.client"), {
  ssr: false,
  loading: () => <div className={styles.missing}>Karte lädt …</div>,
});

function fmtGwFromMw(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(2)} GW`;
  return `${mw.toFixed(1)} MW`;
}

function fmtGw(n: number): string {
  return `${n.toFixed(2)} GW`;
}

export function NetzbetreiberResearchPage({ model }: { model: BessNetzbetreiberBundle }) {
  const [eonFull, setEonFull] = useState(true);
  const [excludeSensitive, setExcludeSensitive] = useState(true);

  const manifest = model.manifest as {
    stichtagMastr?: string;
    plausibility?: { bruttoGw?: number; nettoGw?: number; energyGwh?: number; unitsGe1MwNetto?: number };
    networkLengthNormalization?: { available: boolean; note?: string };
    vg250?: { available: boolean; note?: string };
    eonGroupMembersDefault?: string[];
  };

  const sites = useMemo(
    () => (excludeSensitive ? model.sitesDefault : model.sitesSensitiveOff ?? model.sitesDefault),
    [excludeSensitive, model.sitesDefault, model.sitesSensitiveOff],
  );
  const vnbBars = useMemo(() => prepareVnbBars(model.vnbRanking), [model.vnbRanking]);
  const growth = useMemo(() => {
    const source = eonFull ? model.growthDefault : model.growthEonKern ?? model.growthDefault;
    return prepareGrowthStacks(source, eonFull);
  }, [model.growthDefault, model.growthEonKern, eonFull]);
  const eonPct = eonSharePercent(model.vnbRanking, eonFull);

  const growthChartData = growth.map((g) => ({
    name: g.label,
    vor2026: g.vor2026Mw,
    neu2026: g.y2026Mw,
  }));

  const barData = [
    ...vnbBars.rows.map((r) => ({
      name: r.label.length > 28 ? `${r.label.slice(0, 26)}…` : r.label,
      bruttoMw: r.bruttoMw,
      fill: r.isEonGroup ? "var(--v4-warm)" : "#9ea3a9",
    })),
    ...(vnbBars.restMw > 0
      ? [{ name: "übrige VNB (Summe)", bruttoMw: vnbBars.restMw, fill: "#d0d3d7" }]
      : []),
  ];

  const scatterData = model.scatterBundeslaender.map((r) => ({
    name: r.bundesland.length > 14 ? `${r.bundesland.slice(0, 12)}…` : r.bundesland,
    x: r.eeRedispatch2025Gwh,
    y: r.bessBruttoGw,
    fullName: r.bundesland,
  }));

  const eeStock = model.eeStockBundeslaender;
  const eeStockReady = eeStock.length > 0;

  return (
    <div className={styles.page} data-testid="netzbetreiber-page">
      <p className={research.eyebrow}>Forschung · Bestand in Betrieb</p>
      <h1 className={research.h1}>BESS je Netzbetreiber</h1>
      <p className={styles.lead}>
        Wo stehen Batteriespeicher ab 1&nbsp;MW Bruttoleistung, die im Marktstammdatenregister auf „In Betrieb“ stehen?
        Die Karte zeigt Standorte (MaStR), nicht die Warteschlange. Kein Kausalurteil — öffentliche Bestände und
        Szenario-Vergleiche.
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
          className={excludeSensitive ? styles.toggleOn : styles.toggle}
          onClick={() => setExcludeSensitive((v) => !v)}
          aria-pressed={excludeSensitive}
        >
          Filter: natürliche Personen / ungeprüfte Niederspannung {excludeSensitive ? "aus" : "ein"}
        </button>
      </div>
      {eonFull && manifest.eonGroupMembersDefault ? (
        <p className={styles.eonList}>
          E.ON-Gruppe (Default): {manifest.eonGroupMembersDefault.join(", ")}
        </p>
      ) : null}

      <section className={styles.chartCard} aria-labelledby="g1-title">
        <h2 id="g1-title" className={styles.chartTitle}>
          Karte: Standorte nach Bruttoleistung
        </h2>
        {!manifest.vg250?.available ? (
          <p className={styles.chartFoot}>
            Näherung: keine BKG-VG250-Flächenkarte im Datenstand — Kreisfläche = Leistung, Farbe = E.ON / VNB / ÜNB.
            VNB-Zuordnung über Anschluss-Netzbetreiber (MaStR), nicht amtliche Netzgebiete.
          </p>
        ) : null}
        <div className={styles.mapWrap}>
          <NetzbetreiberMap sites={sites} />
        </div>
        <MapDataFootnote
          stichtag={manifest.stichtagMastr}
          bruttoGw={manifest.plausibility?.bruttoGw}
          nettoGw={manifest.plausibility?.nettoGw}
          units={manifest.plausibility?.unitsGe1MwNetto}
        />
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
        <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 26)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--research-line)" />
            <XAxis type="number" tickFormatter={(v) => fmtGwFromMw(Number(v))} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmtGwFromMw(Number(v ?? 0)), "Brutto"]} />
            <ReferenceLine x={vnbBars.markerMw} stroke="var(--research-accent)" strokeDasharray="4 4" label="50 MW" />
            <Bar dataKey="bruttoMw" radius={[0, 4, 4, 0]}>
              {barData.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className={styles.chartFoot}>
          E.ON-Anteil am Bestand: ca. {eonPct.toFixed(0)}&nbsp;% (Brutto, VNB/Gruppe). Referenz Netzlänge: etwa ein
          Drittel bundesweit (pv magazine, 4.3.2026) — keine VNB-Netzlängen pro Betreiber in öffentlicher Quelle.
          {manifest.networkLengthNormalization?.available
            ? ""
            : ` ${manifest.networkLengthNormalization?.note ?? ""}`}
        </p>
      </section>

      <section className={styles.chartCard} aria-labelledby="g3-title">
        <h2 id="g3-title" className={styles.chartTitle}>
          Zubau 2026 vs. Bestand vor 2026
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={growthChartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--research-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
            <YAxis tickFormatter={(v) => fmtGwFromMw(Number(v))} />
            <Tooltip formatter={(v) => fmtGwFromMw(Number(v ?? 0))} />
            <Legend />
            <Bar dataKey="vor2026" name="vor 2026" stackId="a" fill="#9ea3a9" />
            <Bar dataKey="neu2026" name="Zubau 2026" stackId="a" fill="var(--v4-warm)" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className={styles.scatterSide}>
        <section className={styles.chartCard} aria-labelledby="g4-title">
          <h2 id="g4-title" className={styles.chartTitle}>
            Bundesländer: EE-Redispatch 2025 und BESS in Betrieb
          </h2>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--research-line)" />
              <XAxis
                type="number"
                dataKey="x"
                name="EE-Redispatch"
                unit=" GWh"
                tickFormatter={(v) => `${v}`}
              />
              <YAxis type="number" dataKey="y" name="BESS" unit=" GW" tickFormatter={(v) => `${v}`} />
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
              <Scatter data={scatterData} fill="var(--v4-warm)" />
            </ScatterChart>
          </ResponsiveContainer>
          <p className={styles.chartFoot}>
            X: Wind-onshore- und PV-Redispatch-Reduzierungen 2025 je Bundesland, SMARD Energiedaten kompakt (s-nepm_baet-1-*,
            CC BY 4.0). Y: MaStR Bruttoleistung am Stichtag.
          </p>
        </section>

        <aside className={styles.chartCard}>
          <h2 className={styles.chartTitle}>ÜNB-Ebene</h2>
          <p className={styles.chartFoot}>
            In Betrieb: {fmtGw(model.uenbEbene.inBetriebBruttoGw)}
            <br />
            In Planung (≥1&nbsp;MW): {fmtGw(model.uenbEbene.inPlanungBruttoGw)}
          </p>
          <p className={styles.chartFoot}>Spannungsebene Höchstspannung / ÜNB-Zuordnung (MaStR).</p>
        </aside>
      </div>

      <section className={styles.chartCard} aria-labelledby="g5-title">
        <h2 id="g5-title" className={styles.chartTitle}>
          Erneuerbare vs. BESS je Bundesland
        </h2>
        {eeStockReady ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={eeStock.map((r) => ({
                name: r.bundesland,
                wind: r.windOnshoreGw,
                pv: r.pvGw,
                bess: model.scatterBundeslaender.find((s) => s.bundesland === r.bundesland)?.bessBruttoGw ?? 0,
              }))}
              margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--research-line)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={80} />
              <YAxis tickFormatter={(v) => `${v} GW`} />
              <Tooltip />
              <Legend />
              <Bar dataKey="wind" stackId="ee" fill="#7ab8bc" name="Wind an Land" />
              <Bar dataKey="pv" stackId="ee" fill="#e8c468" name="PV" />
              <Bar dataKey="bess" fill="var(--v4-warm)" name="BESS Brutto" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className={styles.missing}>
            EE-Bestand (Wind an Land, PV) aus MaStR: im Generator ausstehend — bitte{" "}
            <code>python3 scripts/bess-netzbetreiber/build_static_data.py</code> mit ausreichend Laufzeit. BESS-Spalte
            wäre parallel zum Scatter verfügbar.
          </p>
        )}
      </section>

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

function MapDataFootnote(props: { stichtag?: string; bruttoGw?: number; nettoGw?: number; units?: number }) {
  return (
    <p className={styles.chartFoot}>
      Stichtag MaStR: {props.stichtag ?? "—"} · {props.units ?? "—"} Standorte (≥1&nbsp;MW netto, gefiltert) · Brutto{" "}
      {props.bruttoGw != null ? `${props.bruttoGw.toFixed(2)} GW` : "—"} · Netto im Tooltip je Punkt
      {props.nettoGw != null ? ` (gesamt ${props.nettoGw.toFixed(2)} GW)` : ""} · Quelle: Marktstammdatenregister
      (dl-de/by-2-0)
    </p>
  );
}