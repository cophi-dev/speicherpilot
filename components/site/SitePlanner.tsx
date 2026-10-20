"use client";

import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ChartLegend, DispatchChart, type DispatchPoint, useNarrowScreen } from "@/components/charts/DispatchChart";
import { useLanguage } from "@/components/language-context";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axis, common, cssVar, grid, series, tooltip } from "@/lib/chart-theme";
import {
  defaultPlannerEconomics,
  exampleProfile,
  manualAnnualProfile,
  parseLoadProfileCsv,
  planSite,
  type ConnectionStatus,
  type ExampleProfileId,
  type GridImpact,
  type LoadProfile,
  type ManualShapeId,
  type OperationMode,
  type PvOrientation,
  type SitePlan,
  type VoltageLevel,
} from "@/lib/sitePlanner";

type ProfileMode = ExampleProfileId | "manual" | "csv";

type Draft = {
  mode: ProfileMode;
  csv: LoadProfile | null;
  csvError: string | null;
  annualKwh: number;
  shape: ManualShapeId;
  pvEnabled: boolean;
  pvKwp: number;
  orientation: PvOrientation;
  limitKw: number;
  voltage: VoltageLevel;
  demand: number;
  energyCt: number;
  feedIn: number;
  dynamic: boolean;
  autoSize: boolean;
  powerKw: number;
  energyKwh: number;
  rtePct: number;
  capex: number;
  cycles: number;
  life: number;
  discountPct: number;
  transformerKw: number;
  flexible: boolean;
  importCapPct: number;
  exportCapPct: number;
  advanced: boolean;
};

const economics = defaultPlannerEconomics();

function defaultDraft(): Draft {
  return {
    mode: "gewerbe",
    csv: null,
    csvError: null,
    annualKwh: 3_100_000,
    shape: "G0",
    pvEnabled: true,
    pvKwp: economics.pvKwp,
    orientation: "south",
    limitKw: economics.limitKw,
    voltage: economics.voltage,
    demand: economics.demandChargeEurPerKwYear,
    energyCt: economics.energyPriceCtPerKwh,
    feedIn: economics.feedInCtPerKwh,
    dynamic: true,
    autoSize: true,
    powerKw: 310,
    energyKwh: 620,
    rtePct: 90,
    capex: economics.capexEurPerKwh,
    cycles: economics.maxCyclesPerYear,
    life: economics.lifetimeYears,
    discountPct: 0,
    transformerKw: 0,
    flexible: false,
    importCapPct: 80,
    exportCapPct: 80,
    advanced: false,
  };
}

function profileFromDraft(draft: Draft): LoadProfile | null {
  if (draft.mode === "csv") {
    return draft.csv;
  }
  if (draft.mode === "manual") {
    return manualAnnualProfile(draft.shape, draft.annualKwh);
  }
  return exampleProfile(draft.mode);
}

function run(
  draft: Draft,
  operation: OperationMode,
  caps?: { importCapKw: number; exportCapKw: number } | null
): SitePlan | null {
  const profile = profileFromDraft(draft);
  if (!profile || draft.limitKw <= 0 || draft.rtePct <= 0 || draft.rtePct > 100) {
    return null;
  }
  return planSite({
    profile,
    pvEnabled: draft.pvEnabled,
    pvKwp: draft.pvKwp,
    pvOrientation: draft.orientation,
    limitKw: draft.limitKw,
    voltage: draft.voltage,
    operation,
    importCapKw: caps?.importCapKw ?? null,
    exportCapKw: caps?.exportCapKw ?? null,
    transformerRatingKw: draft.transformerKw > 0 ? draft.transformerKw : null,
    demandChargeEurPerKwYear: draft.demand,
    energyPriceCtPerKwh: draft.energyCt,
    feedInCtPerKwh: draft.feedIn,
    dynamicTariff: draft.dynamic,
    autoSize: draft.autoSize,
    manualPowerKw: draft.powerKw,
    manualEnergyKwh: draft.energyKwh,
    roundTripEfficiency: draft.rtePct / 100,
    capexEurPerKwh: draft.capex,
    maxCyclesPerYear: draft.cycles,
    lifetimeYears: draft.life,
    discountRate: draft.discountPct / 100,
  });
}

function flexibleCaps(draft: Draft) {
  return {
    importCapKw: (draft.limitKw * draft.importCapPct) / 100,
    exportCapKw: (draft.limitKw * draft.exportCapPct) / 100,
  };
}

export function SitePlanner() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const narrow = useNarrowScreen();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(searchParams));
  const [operation, setOperation] = useState<OperationMode>("market");
  const [perspective, setPerspective] = useState<"developer" | "dso">("developer");
  const [marketPlan, setMarketPlan] = useState<SitePlan | null>(() => run(draftFromParams(searchParams), "market"));
  const [servingPlan, setServingPlan] = useState<SitePlan | null>(() => run(draftFromParams(searchParams), "grid-serving"));
  const [flexiblePlan, setFlexiblePlan] = useState<SitePlan | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [tab, setTab] = useState<"peak" | "duration">("peak");
  const [dayPick, setDayPick] = useState<"peak" | "median">("peak");
  const posterRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setMarketPlan(run(draft, "market"));
      setServingPlan(run(draft, "grid-serving"));
      setFlexiblePlan(draft.flexible ? run(draft, "grid-serving", flexibleCaps(draft)) : null);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const plan = operation === "market" ? marketPlan : servingPlan;

  const profile = profileFromDraft(draft);
  const peakKw = profile ? profile.samplesKw.reduce((max, kw) => Math.max(max, kw), 0) : 0;
  const annualKwh = profile ? profile.samplesKw.reduce((sum, kw) => sum + kw, 0) * (profile.intervalMinutes / 60) : 0;

  const day = plan ? (dayPick === "peak" ? plan.peakDay : plan.medianDay) : null;
  const points: DispatchPoint[] = day
    ? day.loadKw.map((load, index) => ({
        label: day.loadKw.length > 24 && index % 4 !== 0 ? "" : String(Math.round((index * (profile?.intervalMinutes ?? 15)) / 60)).padStart(2, "0"),
        load,
        grid: day.gridKw[index] ?? load,
        bess: (day.dischargeKw[index] ?? 0) - (day.chargeKw[index] ?? 0),
        pv: day.pvKw[index] ?? 0,
      }))
    : [];
  const dsoPoints = points.map((point) => ({ ...point, uncontrolled: point.load - point.pv }));

  const statusLabel: Record<ConnectionStatus, string> = {
    ok: tx("ANSCHLUSS OK", "CONNECTION OK"),
    near: tx("NAHE LIMIT", "NEAR LIMIT"),
    over: tx("ÜBER LIMIT", "OVER LIMIT"),
  };

  async function exportPng() {
    if (!posterRef.current) {
      return;
    }
    const url = await toPng(posterRef.current, { cacheBust: true, pixelRatio: 1 });
    const link = document.createElement("a");
    link.href = url;
    link.download = "speicherpilot-bess-dispatch.png";
    link.click();
  }

  function exportCsv() {
    if (!plan || !profile) {
      return;
    }
    const lines = [
      "metric,value,unit,note",
      `power_kw,${plan.powerKw},kW,${plan.assumptions.sizingRule}`,
      `energy_kwh,${plan.energyKwh},kWh,`,
      `peak_before_kw,${plan.peakImportBeforeKw},kW,`,
      `peak_after_kw,${plan.peakImportAfterKw},kW,`,
      `exceedance_before_h,${plan.exceedanceHoursBefore},h,`,
      `exceedance_after_h,${plan.exceedanceHoursAfter},h,`,
      `annual_benefit_eur,${plan.annualBenefitEur},EUR,model`,
      `payback_years,${plan.paybackYears ?? ""},a,`,
      `npv_eur,${plan.npvEur},EUR,same annual benefit`,
      `revenue_stacking_eur,,EUR,not calculated`,
      `grid_impact,${plan.gridImpact},,gcp peak`,
      `requested_kw,${plan.requestedConnectionKw},kW,`,
      `available_kw,${plan.availableConnectionKw},kW,`,
      `voltage_hint,${plan.voltageSuggestion.level},,${plan.voltageSuggestion.rule}`,
      `synthetic_profile,${profile.synthetic},,${profile.sourceNote}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "speicherpilot-standort.csv";
    link.click();
  }

  async function shareLink() {
    const params = new URLSearchParams();
    params.set("profile", draft.mode);
    params.set("pv", String(draft.pvKwp));
    params.set("limit", String(draft.limitKw));
    params.set("demand", String(draft.demand));
    params.set("energy", String(draft.energyCt));
    params.set("dynamic", draft.dynamic ? "1" : "0");
    params.set("auto", draft.autoSize ? "1" : "0");
    if (language === "en") {
      params.set("lang", "en");
    }
    const url = `${window.location.origin}/site?${params.toString()}`;
    await navigator.clipboard.writeText(url);
  }

  async function exportPdf() {
    if (!plan || !profile || pdfBusy) {
      return;
    }
    setPdfBusy(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { SiteProposalDocument } = await import("@/components/site/SiteProposalDocument");
      const blob = await pdf(
        <SiteProposalDocument plan={plan} profile={profile} language={language} enteredVoltage={draft.voltage} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "speicherpilot-standortvorschlag.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="num text-[12px] text-muted-foreground">Start / {tx("Standort", "Site")}</p>
          <h1 className="mt-1.5 text-[28px] leading-tight font-medium tracking-[-0.015em] md:text-[36px]">{tx("Standort rechnen", "Size a site")}</h1>
          <p className="mt-1 max-w-[68ch] text-muted-foreground">
            {tx(
              "Dieselbe Rechnung für Projektierer und Netzbetreiber: Speichergröße, Wirtschaftlichkeit und Wirkung am Netzanschlusspunkt.",
              "The same calculation for a developer and a grid operator: storage size, economics, and the effect at the connection point."
            )}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          {profile?.synthetic ? <span className="num rounded-[4px] border border-border px-2 py-0.5 text-[12px]">BEISPIELDATEN</span> : null}
          <button type="button" className="h-10 rounded-md px-3 text-sm" onClick={() => setDraft(defaultDraft())}>
            {tx("Beispiel laden", "Load example")}
          </button>
          <button type="button" className="h-10 rounded-md border border-border-strong px-3 text-sm" onClick={() => setDraft({ ...defaultDraft(), mode: "csv", csv: null })}>
            {tx("Zurücksetzen", "Reset")}
          </button>
        </div>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form className="rounded-md border border-border bg-card p-5 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-auto" onSubmit={(event) => event.preventDefault()}>
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">01 {tx("Lastprofil", "Load profile")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["gewerbe", "kuehlhaus", "ladepark"] as const).map((kind) => (
              <button key={kind} type="button" className={`num h-8 rounded-md border px-2 text-[12px] ${draft.mode === kind ? "border-foreground bg-foreground text-background" : "border-border"}`} onClick={() => setDraft({ ...draft, mode: kind })}>
                {kind === "gewerbe" ? tx("Gewerbe", "Commercial") : kind === "kuehlhaus" ? tx("Kühlhaus", "Cold store") : tx("Ladepark", "Charging hub")}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm font-medium" htmlFor="annual">
            {tx("oder Jahresverbrauch", "or annual consumption")}
          </label>
          <div className="mt-1.5 flex h-10 items-center rounded-md border border-input bg-card px-3 dark:bg-secondary">
            <input id="annual" inputMode="decimal" className="num w-full bg-transparent text-right outline-none" value={draft.annualKwh} onChange={(event) => setDraft({ ...draft, mode: "manual", annualKwh: Number(event.target.value) })} />
            <span className="num ml-2 text-[13px] text-muted-foreground">kWh</span>
          </div>
          <label className="mt-3 block text-sm font-medium" htmlFor="shape">{tx("Profiltyp", "Shape")}</label>
          <select id="shape" className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-2 dark:bg-secondary" value={draft.shape} onChange={(event) => setDraft({ ...draft, mode: "manual", shape: event.target.value as ManualShapeId })}>
            <option value="G0">G0</option>
            <option value="G1">G1</option>
            <option value="L0">L0</option>
          </select>
          <button type="button" className="mt-3 flex h-[120px] w-full items-center justify-center rounded-md border border-dashed border-border-strong px-3 text-center" onClick={() => fileRef.current?.click()}>
            <span className="num text-[12px] text-muted-foreground">CSV · 15-min {tx("oder", "or")} 60-min · kW {tx("oder", "or")} kWh · max 10 MB</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              if (file.size > 10 * 1024 * 1024) {
                setDraft({ ...draft, mode: "csv", csv: null, csvError: tx("Datei größer als 10 MB.", "File is larger than 10 MB.") });
                return;
              }
              void file.text().then((text) => {
                const parsed = parseLoadProfileCsv(text);
                if (!parsed.ok) {
                  setDraft({ ...draft, mode: "csv", csv: null, csvError: parsed.message });
                  return;
                }
                setDraft({ ...draft, mode: "csv", csv: { ...parsed.profile, label: file.name }, csvError: null });
              });
            }}
          />
          {draft.csvError ? <p className="mt-2 text-[12px] text-destructive">! {draft.csvError}</p> : null}
          {profile ? (
            <div className="mt-3 rounded-md border border-border p-3">
              <div className="flex justify-between text-sm">
                <span className="num truncate">{profile.label}</span>
                {draft.mode === "csv" ? (
                  <button type="button" aria-label={tx("Profil entfernen", "Remove profile")} onClick={() => setDraft({ ...draft, csv: null })}>
                    ✕
                  </button>
                ) : null}
              </div>
              <p className="num mt-2 text-[12px] text-muted-foreground">
                {formatQuantity(profile.rowCount, language, 0)} {tx("Werte", "values")} · {profile.intervalMinutes} min · {tx("Spitze", "peak")} {formatQuantity(peakKw, language, 0)} kW · {formatQuantity(annualKwh / 1e6, language, 1)} GWh/a
              </p>
              {profile.warnings[0] ? <p className="mt-1 text-[12px] text-destructive">{profile.warnings[0]}</p> : null}
              {profile.synthetic ? <p className="num mt-1 text-[12px] text-muted-foreground">{profile.sourceNote}</p> : null}
            </div>
          ) : null}

          <Section label={`02 PV`}>
            <label className="flex items-center justify-between text-sm">
              {tx("PV vorhanden", "PV on site")}
              <input type="checkbox" checked={draft.pvEnabled} onChange={(event) => setDraft({ ...draft, pvEnabled: event.target.checked })} />
            </label>
            <Field label={tx("PV-Leistung", "PV power")} unit="kWp" value={draft.pvKwp} onChange={(pvKwp) => setDraft({ ...draft, pvKwp })} />
            <div className="mt-3 flex gap-2">
              {(["south", "east-west"] as const).map((orientation) => (
                <button key={orientation} type="button" className={`h-8 flex-1 rounded-md border text-sm ${draft.orientation === orientation ? "border-foreground bg-foreground text-background" : "border-border"}`} onClick={() => setDraft({ ...draft, orientation })}>
                  {orientation === "south" ? tx("Süd", "South") : tx("Ost-West", "East-west")}
                </button>
              ))}
            </div>
          </Section>

          <Section label={`03 ${tx("Netzanschluss", "Connection")}`}>
            <Field label={tx("Anschlussleistung", "Connection capacity")} unit="kW" value={draft.limitKw} onChange={(limitKw) => setDraft({ ...draft, limitKw })} />
            <p className="mt-1 text-[12px] text-muted-foreground">
              {tx("Profilspitze", "Profile peak")}: {formatQuantity(peakKw, language, 0)} kW
              {peakKw > draft.limitKw ? <span className="text-warning"> · {tx("über Limit", "above the limit")}</span> : null}
            </p>
            <label className="mt-3 block text-sm font-medium" htmlFor="voltage">{tx("Spannungsebene", "Voltage")}</label>
            <select id="voltage" className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-2 dark:bg-secondary" value={draft.voltage} onChange={(event) => setDraft({ ...draft, voltage: event.target.value as VoltageLevel })}>
              <option value="NS">NS</option>
              <option value="MS">MS</option>
              <option value="HS">HS</option>
            </select>
            <p className="mt-2 text-[12px] text-muted-foreground">{tx("Gewählte Ebene. Der Hinweis aus der angefragten Leistung steht in der Netzbetreiber-Sicht.", "Entered level. The hint from requested power is in the grid-operator view.")}</p>
          </Section>

          <Section label={`04 ${tx("Tarif", "Tariff")}`}>
            <Field label={tx("Leistungspreis", "Demand charge")} unit="€/kW·a" value={draft.demand} onChange={(demand) => setDraft({ ...draft, demand })} />
            <Field label={tx("Arbeitspreis", "Energy price")} unit="ct/kWh" value={draft.energyCt} onChange={(energyCt) => setDraft({ ...draft, energyCt })} />
            <Field label={tx("Einspeisevergütung", "Feed-in")} unit="ct/kWh" value={draft.feedIn} onChange={(feedIn) => setDraft({ ...draft, feedIn })} />
            <label className="mt-3 flex items-center justify-between text-sm">
              {tx("Dynamischer Tarif (Day-Ahead)", "Dynamic tariff (day-ahead)")}
              <input type="checkbox" checked={draft.dynamic} onChange={(event) => setDraft({ ...draft, dynamic: event.target.checked })} />
            </label>
          </Section>

          <button type="button" className="num mt-4 flex w-full items-center justify-between border-t border-border pt-3 text-[12px] tracking-[0.08em] text-muted-foreground uppercase" onClick={() => setDraft({ ...draft, advanced: !draft.advanced })}>
            05 {tx("Speicher · erweitert", "Storage · advanced")}
            <span>{draft.advanced ? "▾" : "▸"}</span>
          </button>
          {draft.advanced ? (
            <div className="mt-3">
              <label className="flex items-center justify-between text-sm">
                {tx("Automatisch dimensionieren", "Size automatically")}
                <input type="checkbox" checked={draft.autoSize} onChange={(event) => setDraft({ ...draft, autoSize: event.target.checked })} />
              </label>
              <Field label="kW" unit="kW" value={draft.powerKw} onChange={(powerKw) => setDraft({ ...draft, autoSize: false, powerKw })} />
              <Field label="kWh" unit="kWh" value={draft.energyKwh} onChange={(energyKwh) => setDraft({ ...draft, autoSize: false, energyKwh })} />
              <Field label={tx("Wirkungsgrad", "Round trip")} unit="%" value={draft.rtePct} onChange={(rtePct) => setDraft({ ...draft, rtePct })} />
              <Field label="CAPEX" unit="€/kWh" value={draft.capex} onChange={(capex) => setDraft({ ...draft, capex })} />
              <Field label={tx("Zyklen/Jahr max", "Max cycles/year")} unit="/a" value={draft.cycles} onChange={(cycles) => setDraft({ ...draft, cycles })} />
              <Field label={tx("Lebensdauer", "Lifetime")} unit="a" value={draft.life} onChange={(life) => setDraft({ ...draft, life })} />
              <Field label={tx("Diskont", "Discount")} unit="%" value={draft.discountPct} onChange={(discountPct) => setDraft({ ...draft, discountPct })} />
              <Field label={tx("Trafo / Anschluss, Plan", "Transformer / connection, plan")} unit="kW" value={draft.transformerKw} onChange={(transformerKw) => setDraft({ ...draft, transformerKw })} />
              <p className="mt-2 text-[12px] text-muted-foreground">{tx("0 kW übernimmt die Anschlussleistung. Das ist kein gemessener Transformator.", "0 kW uses the connection capacity. That is not a measured transformer.")}</p>
            </div>
          ) : null}

          <button
            type="button"
            className="no-print mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
            disabled={!plan || pdfBusy}
            onClick={() => void exportPdf()}
          >
            {pdfBusy ? tx("PDF wird gebaut", "Building PDF") : tx("Proposal-PDF", "Proposal PDF")}
          </button>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">{tx("Daten bleiben im Browser", "Data stays in the browser")}</p>
        </form>

        <div className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-0">
          {!plan || !profile ? (
            <div className="rounded-md border border-dashed border-border-strong p-8">
              <p>{tx("Noch kein Lastprofil. CSV hochladen oder Beispielprofil laden.", "No load profile yet. Upload a CSV or load an example.")}</p>
              <button type="button" className="mt-4 h-10 rounded-md border border-border px-3 text-sm" onClick={() => setDraft(defaultDraft())}>
                {tx("Beispiel laden", "Load example")}
              </button>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Empfehlung", "Recommendation")}</p>
                  <span className={`num rounded-[4px] border bg-card px-2 py-0.5 text-[12px] ${plan.connection === "ok" ? "border-success text-success" : plan.connection === "near" ? "border-warning text-warning" : "border-limit text-destructive"}`}>
                    {statusLabel[plan.connection]}
                  </span>
                </div>
                <div className="mt-2.5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Tile className="md:col-span-2" tone="bess" label={tx("Speicher", "Storage")} value={`${formatQuantity(plan.energyKwh, language, 0)} / ${formatQuantity(plan.powerKw, language, 0)}`} unit="kWh / kW" hint={`C-Rate ${formatQuantity(plan.cRate, language, 2)} · ${formatQuantity(plan.durationHours, language, 1)} h`} hero />
                  <Tile tone="limit" label={tx("Spitze", "Peak")} value={formatQuantity(plan.peakImportAfterKw, language, 0)} unit="kW" hint={`${tx("von", "from")} ${formatQuantity(plan.peakImportBeforeKw, language, 0)} kW`} />
                  <Tile label={tx("Amortisation", "Payback")} value={formatYears(plan.paybackYears, language)} unit={plan.paybackYears ? "a" : ""} hint={`${tx("Nutzen", "Benefit")} ${formatQuantity(plan.annualBenefitEur, language, 0)} €/a · NPV ${formatQuantity(plan.npvEur, language, 0)} €`} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(["market", "grid-serving"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={operation === mode}
                      className={`h-8 rounded-md border px-3 text-sm ${operation === mode ? "border-foreground bg-foreground text-background" : "border-border"}`}
                      onClick={() => setOperation(mode)}
                    >
                      {mode === "market" ? tx("Marktgetrieben", "Market-driven") : tx("Netzdienlich", "Grid-serving")}
                    </button>
                  ))}
                  <p className="text-sm text-muted-foreground">{impactSentence(plan.gridImpact, tx)}</p>
                </div>
                <div className="mt-4 flex border border-border" role="tablist" aria-label={tx("Sicht", "Perspective")}>
                  {(["developer", "dso"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={perspective === key}
                      className={`h-10 flex-1 text-sm ${perspective === key ? "bg-foreground text-background" : "bg-card"}`}
                      onClick={() => setPerspective(key)}
                    >
                      {key === "developer" ? tx("Projektierer", "Developer") : tx("Netzbetreiber", "Grid operator")}
                    </button>
                  ))}
                </div>
              </div>

              {perspective === "developer" ? (
              <>
              <article className="rounded-md border border-border bg-card p-4 md:p-6">
                <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">Peak Shaving · {profile.intervalMinutes} min</p>
                <h2 className="mt-1.5 text-lg font-semibold">
                  {plan.importImpact === "increases"
                    ? tx("Spitze steigt von", "Peak rises from")
                    : plan.importImpact === "unchanged"
                      ? tx("Spitze bleibt von", "Peak stays from")
                      : tx("Spitze sinkt von", "Peak falls from")}{" "}
                  {formatQuantity(plan.peakImportBeforeKw, language, 0)} {tx("auf", "to")} {formatQuantity(plan.peakImportAfterKw, language, 0)} kW, {tx("Überschreitung", "exceedance")} {formatQuantity(plan.exceedanceHoursBefore, language, 0)} h → {formatQuantity(plan.exceedanceHoursAfter, language, 0)} h
                </h2>
                <div className="mt-3 flex gap-6 overflow-x-auto border-b border-border text-sm font-medium">
                  <button type="button" className={tab === "peak" ? "border-b-2 border-foreground py-2" : "py-2 text-muted-foreground"} onClick={() => setTab("peak")}>{tx("Typischer Spitzentag", "Typical peak day")}</button>
                  <button type="button" className={tab === "duration" ? "border-b-2 border-foreground py-2" : "py-2 text-muted-foreground"} onClick={() => setTab("duration")}>{tx("Jahresdauerlinie", "Duration curve")}</button>
                </div>
                {tab === "peak" ? (
                  <>
                    <div className="mt-3 flex gap-2">
                      {(["peak", "median"] as const).map((key) => (
                        <button key={key} type="button" className={`h-8 rounded-md border px-3 text-sm ${dayPick === key ? "border-foreground bg-foreground text-background" : "border-border"}`} onClick={() => setDayPick(key)}>
                          {key === "peak" ? tx("Spitzentag", "Peak day") : tx("Median", "Median")}
                        </button>
                      ))}
                    </div>
                    <ChartLegend items={[
                      { label: tx("Last ohne BESS", "Load without BESS"), swatch: "line" },
                      { label: tx("Netzbezug mit BESS", "Grid with BESS"), swatch: "line-bold" },
                      { label: tx("Entladen", "Discharge"), swatch: "teal" },
                      { label: tx("Laden", "Charge"), swatch: "teal-dim" },
                      { label: "PV", swatch: "pv" },
                      { label: tx("Netzanschluss", "Connection"), swatch: "dashed" },
                    ]} />
                    <DispatchChart points={points} limitKw={draft.limitKw} language={language} />
                  </>
                ) : (
                  <DurationChart before={plan.durationBeforeKw} after={plan.durationAfterKw} limitKw={draft.limitKw} narrow={narrow} />
                )}
                <p className="num mt-2 text-[12px] text-muted-foreground">
                  {profile.synthetic ? profile.sourceNote : tx("Quelle: hochgeladenes Profil · modelliert", "Source: uploaded profile · modelled")}
                </p>
                <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-3">
                  <Mini label={tx("Leistungspreis-Ersparnis", "Demand-charge saving")} value={`${formatQuantity(plan.demandChargeSavingsEur, language, 0)} €/a`} />
                  <Mini label={tx("Vollzyklen", "Full cycles")} value={`${formatQuantity(plan.fullCycles, language, 0)} /a`} />
                  <Mini label={tx("Überschreitung", "Exceedance")} value={`${formatQuantity(plan.exceedanceHoursBefore, language, 0)} h → ${formatQuantity(plan.exceedanceHoursAfter, language, 0)} h`} />
                </div>
              </article>

              <article className="rounded-md border border-border bg-card p-4 md:p-6">
                <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Arbitrage · Day-Ahead", "Arbitrage · day-ahead")}</p>
                {draft.dynamic ? (
                  <>
                    <h2 className="mt-1.5 text-lg font-semibold">{tx("Arbitrage auf dem Rest der Kapazität", "Arbitrage on the capacity left after peak shaving")}</h2>
                    <p className="num mt-3 text-[20px]">{formatQuantity(plan.arbitrageEur, language, 0)} €/a</p>
                <p className="mt-1 text-sm text-muted-foreground">{tx("15-Minuten-Preise. Kein separates Intraday-Orderbuch.", "15-minute prices. Not a separate intraday order book.")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.assumptions.syntheticPrices
                        ? tx("Synthetisches Day-Ahead-Profil, kein Börsenfeed. Arbitrage nur mit dynamischem Tarif oder Direktvermarktung.", "Synthetic day-ahead shape, not an exchange feed. Arbitrage only applies with a dynamic tariff or direct marketing.")
                        : tx("Preise aus der übergebenen Reihe.", "Prices from the supplied series.")}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {tx("Dynamischen Tarif einschalten, sonst entfällt die Arbitrage.", "Turn on the dynamic tariff, otherwise arbitrage is left out.")}
                    <button type="button" className="ml-2 text-primary underline underline-offset-[3px]" onClick={() => setDraft({ ...draft, dynamic: true })}>{tx("Einschalten", "Turn on")}</button>
                  </p>
                )}
              </article>

              <article className="rounded-md border border-border bg-card p-4 md:p-6">
                <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Amortisation", "Payback")}</p>
                <h2 className="mt-1.5 text-lg font-semibold">
                  {plan.paybackYears
                    ? tx(`Investition nach ${formatYears(plan.paybackYears, language)} Jahren zurück`, `Investment back after ${formatYears(plan.paybackYears, language)} years`)
                    : tx("Innerhalb der Lebensdauer nicht zurück", "Not recovered inside the lifetime")}
                </h2>
                <PaybackChart plan={plan} narrow={narrow} />
                <p className="num mt-2 text-[12px] text-muted-foreground">
                  CAPEX {formatQuantity(plan.capexEur, language, 0)} € · OPEX {formatQuantity(plan.assumptions.opexFractionOfCapex * 100, language, 1)} % · {tx("Diskont", "Discount")} {formatQuantity(draft.discountPct, language, 1)} % · NPV {formatQuantity(plan.npvEur, language, 0)} €
                </p>
                <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border pt-3 text-sm">
                  <span>{tx("Erlösstapelung (Regelenergie, Kapazität)", "Revenue stacking (balancing, capacity)")}</span>
                  <span className="num text-muted-foreground">{tx("nicht gerechnet", "not calculated")}</span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[280px] text-sm">
                    <caption className="sr-only">{tx("Sensitivität CAPEX und Nutzen", "CAPEX and benefit sensitivity")}</caption>
                    <thead className="bg-secondary text-left">
                      <tr className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                        <th className="px-2 py-2">CAPEX \\ {tx("Nutzen", "Benefit")}</th>
                        <th className="px-2 py-2">−20 %</th>
                        <th className="px-2 py-2">{tx("Basis", "Base")}</th>
                        <th className="px-2 py-2">+20 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0.8, 1, 1.2].map((capexFactor) => (
                        <tr key={capexFactor} className="border-t border-border">
                          <th className="num px-2 py-2 text-left font-normal">{capexFactor === 1 ? tx("Basis", "Base") : `${capexFactor > 1 ? "+" : "−"}20 %`}</th>
                          {[0.8, 1, 1.2].map((priceFactor) => {
                            const cell = plan.sensitivity.find((item) => item.capexFactor === capexFactor && item.priceFactor === priceFactor);
                            return (
                              <td key={priceFactor} className={`num px-2 py-2 ${cell?.base ? "border border-primary" : ""}`}>
                                {formatYears(cell?.paybackYears ?? null, language)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-md border border-border bg-card p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Netzanschluss", "Connection")}</p>
                  <span className="num text-[12px]">{statusLabel[plan.connection]}</span>
                </div>
                <h2 className="mt-1.5 text-lg font-semibold">
                  {plan.connection === "over"
                    ? tx(
                        `${formatQuantity(draft.limitKw, language, 0)} kW reichen nicht: ${formatQuantity(Math.max(0, plan.peakImportAfterKw - draft.limitKw), language, 0)} kW fehlen`,
                        `${formatQuantity(draft.limitKw, language, 0)} kW is not enough: ${formatQuantity(Math.max(0, plan.peakImportAfterKw - draft.limitKw), language, 0)} kW short`
                      )
                    : tx(
                        `${formatQuantity(draft.limitKw, language, 0)} kW reichen mit Speicher, ${formatQuantity(plan.reserveFraction * 100, language, 0)} % Reserve`,
                        `${formatQuantity(draft.limitKw, language, 0)} kW holds with storage, ${formatQuantity(plan.reserveFraction * 100, language, 0)}% reserve`
                      )}
                </h2>
                <Gauge limitKw={draft.limitKw} beforeKw={plan.peakImportBeforeKw} afterKw={plan.peakImportAfterKw} />
                <ul className="num mt-4 grid gap-1 text-[13px] md:grid-cols-2">
                  <Check ok={plan.checks.importWithinLimit} label={tx("Bezugsspitze ≤ Limit", "Import peak ≤ limit")} />
                  <Check ok={plan.checks.exportWithinLimit} label={tx("Rückspeisung ≤ Limit", "Export ≤ limit")} />
                  <Check ok={plan.checks.exceedanceHoursZero} label={tx("Überschreitungsstunden = 0", "Hours above the limit = 0")} />
                  <Check ok={plan.checks.reserveAtLeast10Pct} label={tx(`Reserve ${formatQuantity(plan.reserveFraction * 100, language, 0)} % ≥ 10 %`, `Reserve ${formatQuantity(plan.reserveFraction * 100, language, 0)}% ≥ 10%`)} />
                </ul>
              </article>
              </>
              ) : marketPlan && servingPlan ? (
                <DsoView
                  draft={draft}
                  setDraft={setDraft}
                  plan={plan}
                  market={marketPlan}
                  serving={servingPlan}
                  flexible={flexiblePlan}
                  points={dsoPoints}
                  language={language}
                  tx={tx}
                />
              ) : null}

              <details className="rounded-md border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">{tx("Annahmen", "Assumptions")}</summary>
                <dl className="num mt-3 grid gap-2 text-[13px]">
                  <div className="flex justify-between gap-4"><dt>{tx("Dimensionierung", "Sizing")}</dt><dd className="text-right">{plan.assumptions.sizingRule}</dd></div>
                  <div className="flex justify-between gap-4"><dt>{tx("Preise", "Prices")}</dt><dd className="text-right">{plan.assumptions.priceNote}</dd></div>
                  <div className="flex justify-between gap-4"><dt>RTE</dt><dd>{formatQuantity(plan.assumptions.roundTripEfficiency * 100, language, 0)} %</dd></div>
                  <div className="flex justify-between gap-4"><dt>{tx("Nicht enthalten", "Excluded")}</dt><dd className="text-right">{plan.assumptions.excluded.join(", ")}</dd></div>
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">{tx("Illustratives Modell, keine Beschaffungs- oder Anlagenberatung.", "Illustrative model, not procurement or plant advice.")}</p>
              </details>
              <div className="no-print flex flex-wrap gap-2">
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => void exportPng()}>PNG</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={exportCsv}>CSV</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => void shareLink()}>{tx("Link teilen", "Share link")}</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => window.print()}>{tx("Drucken", "Print")}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {plan && profile ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between border-t border-border bg-background px-4 lg:hidden">
          <p className="num text-sm">
            {formatQuantity(plan.energyKwh, language, 0)} kWh · {formatYears(plan.paybackYears, language)} a
          </p>
          <a href="#inhalt" className="text-sm text-primary underline underline-offset-[3px]">{tx("Ergebnis", "Result")}</a>
        </div>
      ) : null}

      {plan && profile ? (
        <div ref={posterRef} inert aria-hidden className="pointer-events-none fixed top-0 -left-[2000px] h-[900px] w-[1600px] bg-[#0B0D0F] text-[#ECEDEE]">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative px-20 pt-16">
            <p className="num text-[22px] tracking-[0.08em] text-[#9CA2A8] uppercase">SpeicherPilot · BESS-Dispatch · 24 h · ¼h</p>
            <p className="mt-4 max-w-[1400px] text-[56px] leading-none font-medium">
              {tx("Speicher kappt die Spitze", "Storage cuts the peak")}
            </p>
            <p className="mt-4 text-[30px] text-[#9CA2A8]">
              {formatQuantity(plan.energyKwh, "de", 0)} kWh / {formatQuantity(plan.powerKw, "de", 0)} kW · {formatQuantity(plan.peakImportBeforeKw, "de", 0)} → {formatQuantity(plan.peakImportAfterKw, "de", 0)} kW
            </p>
            <div className="mt-8">
              <DispatchChart points={points.slice(0, 96)} limitKw={draft.limitKw} language="de" height={430} />
            </div>
            <div className="num mt-6 flex justify-between text-[20px] text-[#9CA2A8]">
              <span>speicherpilot.app</span>
              <span className="text-[#FF6A5C]">{profile.synthetic ? "BEISPIELDATEN · synthetisches Profil, nicht gemessen" : tx("Hochgeladenes Profil · modelliert", "Uploaded profile · modelled")}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function impactSentence(impact: GridImpact, tx: (de: string, en: string) => string) {
  if (impact === "reduces") {
    return tx("Der Betrieb senkt die Spitze am Netzanschlusspunkt.", "This operation lowers the peak at the connection point.");
  }
  if (impact === "increases") {
    return tx("Der Betrieb hebt die Spitze am Netzanschlusspunkt.", "This operation raises the peak at the connection point.");
  }
  return tx("Der Betrieb lässt die Spitze am Netzanschlusspunkt unverändert.", "This operation leaves the peak at the connection point unchanged.");
}

function impactWord(impact: GridImpact, tx: (de: string, en: string) => string) {
  if (impact === "reduces") {
    return tx("senkt", "lowers");
  }
  if (impact === "increases") {
    return tx("hebt", "raises");
  }
  return tx("unverändert", "unchanged");
}

function DsoView({
  draft,
  setDraft,
  plan,
  market,
  serving,
  flexible,
  points,
  language,
  tx,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  plan: SitePlan;
  market: SitePlan;
  serving: SitePlan;
  flexible: SitePlan | null;
  points: DispatchPoint[];
  language: "de" | "en";
  tx: (de: string, en: string) => string;
}) {
  const caps = flexibleCaps(draft);
  return (
    <>
      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Netzbetreiber", "Grid operator")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{tx("Anschluss prüfen, Speicher nicht betreiben", "Assess the connection, do not operate the storage")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "Verteilnetzbetreiber besitzen und betreiben diesen Speicher in der Regel nicht. Sie prüfen und schließen Speicher Dritter an. Die Regeln unten sind Verweise, keine Rechtsberatung und keine Anschlusszusage.",
            "Distribution operators usually do not own or operate this storage. They assess and connect third-party storage. The rules below are references, not legal advice and not a connection offer."
          )}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Mini label={tx("Angefragt, ohne Speicher", "Requested, without storage")} value={`${formatQuantity(plan.requestedConnectionKw, language, 0)} kW`} />
          <Mini label={tx("Verfügbar, eingegeben", "Available, as entered")} value={`${formatQuantity(plan.availableConnectionKw, language, 0)} kW`} />
        </div>
        <p className="mt-4 text-sm">
          {tx("Planungshinweis", "Planning hint")}: <span className="num">{plan.voltageSuggestion.level}</span> · {plan.voltageSuggestion.rule}
          {" · "}
          {tx("gewählt", "entered")} <span className="num">{draft.voltage}</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "Bis 135 kW NS, darüber bis 20 MW MS, darüber HS. Schwellen sind Planungshinweise, nicht der Wortlaut der TAR.",
            "Up to 135 kW LV, above that up to 20 MW MV, above that HV. The thresholds are planning hints, not the wording of the connection rules."
          )}
        </p>
        <a className="mt-2 inline-block text-sm text-primary underline underline-offset-[3px]" href={plan.voltageSuggestion.href} target="_blank" rel="noreferrer">
          {plan.voltageSuggestion.rule} · VDE FNN
        </a>
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Betrieb", "Operation")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{tx("Marktgetrieben neben netzdienlich", "Market-driven beside grid-serving")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm">
            <caption className="sr-only">{tx("Vergleich der beiden Betriebsarten", "Comparison of the two operating modes")}</caption>
            <thead className="bg-secondary text-left">
              <tr className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                <th className="px-2 py-2">{tx("Größe", "Quantity")}</th>
                <th className={`px-2 py-2 ${plan.operation === "market" ? "border border-primary" : ""}`}>{tx("Markt", "Market")}</th>
                <th className={`px-2 py-2 ${plan.operation === "grid-serving" ? "border border-primary" : ""}`}>{tx("Netzdienlich", "Grid-serving")}</th>
              </tr>
            </thead>
            <tbody className="num">
              <tr className="border-t border-border">
                <th className="px-2 py-2 text-left font-normal">{tx("Bezugsspitze", "Import peak")}</th>
                <td className="px-2 py-2">{formatQuantity(market.peakImportAfterKw, language, 0)} kW</td>
                <td className="px-2 py-2">{formatQuantity(serving.peakImportAfterKw, language, 0)} kW</td>
              </tr>
              <tr className="border-t border-border">
                <th className="px-2 py-2 text-left font-normal">{tx("Rückspeisespitze", "Export peak")}</th>
                <td className="px-2 py-2">{formatQuantity(market.peakExportAfterKw, language, 0)} kW</td>
                <td className="px-2 py-2">{formatQuantity(serving.peakExportAfterKw, language, 0)} kW</td>
              </tr>
              <tr className="border-t border-border">
                <th className="px-2 py-2 text-left font-normal">{tx("Spitze am NAP", "Peak at the GCP")}</th>
                <td className="px-2 py-2">{formatQuantity(market.gcpPeakBeforeKw, language, 0)} → {formatQuantity(market.gcpPeakAfterKw, language, 0)}</td>
                <td className="px-2 py-2">{formatQuantity(serving.gcpPeakBeforeKw, language, 0)} → {formatQuantity(serving.gcpPeakAfterKw, language, 0)}</td>
              </tr>
              <tr className="border-t border-border">
                <th className="px-2 py-2 text-left font-normal">{tx("Wirkung", "Effect")}</th>
                <td className="px-2 py-2">{impactWord(market.gridImpact, tx)}</td>
                <td className="px-2 py-2">{impactWord(serving.gridImpact, tx)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Netzrückwirkung", "Grid impact")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{impactSentence(plan.gridImpact, tx)}</h2>
        <ChartLegend items={[
          { label: tx("Last ohne BESS", "Load without BESS"), swatch: "line" },
          { label: tx("Netz ohne Speicher", "Grid without storage"), swatch: "line" },
          { label: tx("Netz mit Speicher", "Grid with storage"), swatch: "line-bold" },
          { label: tx("Anschluss", "Connection"), swatch: "dashed" },
        ]} />
        <DispatchChart points={points} limitKw={draft.limitKw} language={language} />
        <p className="num mt-2 text-[12px] text-muted-foreground">
          {tx("Rote Linie: eingegebene Anschlussleistung. Kein Messwert vom Transformator.", "Red line: the connection capacity you entered. Not a measurement from the transformer.")}
        </p>
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Trafo / Anschluss", "Transformer / connection")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">
          {formatQuantity(plan.transformerLoadBeforePct * 100, language, 0)} % → {formatQuantity(plan.transformerLoadAfterPct * 100, language, 0)} % {tx("von", "of")} {formatQuantity(plan.transformerRatingKw, language, 0)} kW
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx(
            "Die Bezugsgröße ist die Anschlussleistung, solange oben kein eigener Planungswert steht. Kein gemessener Transformator.",
            "The rating is the connection capacity unless you enter a planning value above. Not a measured transformer."
          )}
        </p>
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Szenario", "Scenario")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{tx("Flexibles Anschlussverhältnis", "Flexible connection agreement")}</h2>
        <label className="mt-3 flex items-center justify-between gap-3 text-sm">
          {tx("Kappen für Bezug und Einspeisung rechnen", "Run caps on import and export")}
          <input type="checkbox" checked={draft.flexible} onChange={(event) => setDraft({ ...draft, flexible: event.target.checked })} />
        </label>
        {draft.flexible ? (
          <div className="mt-3">
            <Field label={tx("Bezugskappe", "Import cap")} unit="%" value={draft.importCapPct} onChange={(importCapPct) => setDraft({ ...draft, importCapPct })} />
            <Field label={tx("Einspeisekappe", "Export cap")} unit="%" value={draft.exportCapPct} onChange={(exportCapPct) => setDraft({ ...draft, exportCapPct })} />
            <p className="num mt-3 text-sm">
              {formatQuantity(caps.importCapKw, language, 0)} kW {tx("Bezug", "import")} · {formatQuantity(caps.exportCapKw, language, 0)} kW {tx("Einspeisung", "export")}
            </p>
            {flexible ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Mini label={tx("Bezug nach Kappe", "Import after the cap")} value={`${formatQuantity(flexible.peakImportAfterKw, language, 0)} kW`} />
                <Mini label={tx("Einspeisung nach Kappe", "Export after the cap")} value={`${formatQuantity(flexible.peakExportAfterKw, language, 0)} kW`} />
                <Mini label={tx("Abregelung, Szenario", "Curtailment, scenario")} value={`${formatQuantity(flexible.curtailmentKwh, language, 0)} kWh`} />
              </div>
            ) : null}
            <p className="mt-3 text-sm text-muted-foreground">
              {tx(
                "Szenario auf demselben Rechenkern, netzdienlich. Die Abregelung ist keine Messung und kein SCADA.",
                "A scenario on the same calculation core, grid-serving. The curtailment is not a measurement and not SCADA."
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {tx("Ausgeschaltet bleibt die feste Anschlussleistung die einzige Grenze.", "While this is off, the firm connection capacity is the only limit.")}
          </p>
        )}
      </article>
    </>
  );
}

function draftFromParams(params: { get: (key: string) => string | null }): Draft {
  const base = defaultDraft();
  const mode = params.get("profile");
  if (!mode) {
    return base;
  }
  return {
    ...base,
    mode: mode === "kuehlhaus" || mode === "ladepark" || mode === "manual" || mode === "csv" ? mode : "gewerbe",
    pvKwp: numberOr(params.get("pv"), base.pvKwp),
    limitKw: numberOr(params.get("limit"), base.limitKw),
    demand: numberOr(params.get("demand"), base.demand),
    energyCt: numberOr(params.get("energy"), base.energyCt),
    dynamic: params.get("dynamic") !== "0",
    autoSize: params.get("auto") !== "0",
  };
}

function numberOr(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mt-3 block">
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1.5 flex h-10 items-center rounded-md border border-input bg-card px-3 dark:bg-secondary">
        <input inputMode="decimal" className="num w-full bg-transparent text-right outline-none" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} />
        <span className="num ml-2 shrink-0 text-[13px] text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
}

function Tile({ label, value, unit, hint, tone, hero, className }: { label: string; value: string; unit: string; hint?: string; tone?: "bess" | "limit"; hero?: boolean; className?: string }) {
  const border = tone === "bess" ? "border-bess" : tone === "limit" ? "border-limit" : "border-border";
  return (
    <div className={`border border-border border-l-[3px] ${border} bg-card px-4 py-4 ${className ?? ""}`}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className={`num mt-2 leading-none ${hero ? "text-[32px] md:text-[40px]" : "text-[28px] md:text-[32px]"}`}>
        {value} <span className="text-base text-muted-foreground">{unit}</span>
      </p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className="num text-lg">{value}</p>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-success" : "text-warning"}>
      {ok ? "✓" : "!"} <span className="text-foreground">{label}</span>
    </li>
  );
}

function Gauge({ limitKw, beforeKw, afterKw }: { limitKw: number; beforeKw: number; afterKw: number }) {
  const span = Math.max(limitKw, beforeKw, afterKw, 1) * 1.08;
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / span) * 100))}%`;
  return (
    <div className="relative mt-8 h-14">
      <div className="absolute top-4 right-0 left-0 h-2 rounded-sm bg-secondary" />
      <div className="absolute top-4 left-0 h-2 rounded-sm bg-foreground" style={{ width: pct(Math.max(0, afterKw)) }} />
      <Mark left={pct(limitKw * 0.9)} label="90 %" color="var(--color-warning)" />
      <Mark left={pct(limitKw)} label={`${Math.round(limitKw)}`} color="var(--color-limit)" />
      <Mark left={pct(beforeKw)} label={`${Math.round(beforeKw)}`} color="var(--color-muted-foreground)" />
    </div>
  );
}

function Mark({ left, label, color }: { left: string; label: string; color: string }) {
  return (
    <span className="absolute top-2 h-6 border-l" style={{ left, borderColor: color }}>
      <span className="num absolute top-7 -translate-x-1/2 text-[12px] whitespace-nowrap" style={{ color }}>{label}</span>
    </span>
  );
}

function DurationChart({ before, after, limitKw, narrow }: { before: number[]; after: number[]; limitKw: number; narrow: boolean }) {
  const data = before.map((value, index) => ({ hour: index, before: value, after: after[index] ?? 0 }));
  return (
    <div className="mt-3 h-[240px] w-full md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="hour" {...axis} hide={narrow} />
          <YAxis {...axis} width={56} />
          <Tooltip {...tooltip} />
          <Line dataKey="before" type="monotone" {...common.line} stroke={cssVar("subtle")} strokeWidth={1.5} name="ohne BESS" />
          <Line dataKey="after" type="monotone" {...common.line} {...series.netLoad} name="mit BESS" />
          <ReferenceLine y={limitKw} stroke={cssVar("c-limit")} strokeDasharray="6 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaybackChart({ plan, narrow }: { plan: SitePlan; narrow: boolean }) {
  const data = (narrow ? plan.cashflow.filter((row) => row.year <= 10) : plan.cashflow).map((row) => ({
    year: row.year,
    annual: row.year === 0 ? row.annualEur : Math.max(row.annualEur, 0),
    capex: row.year === 0 ? row.annualEur : 0,
    cumulative: row.cumulativeEur,
  }));
  return (
    <div className="mt-3 h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="year" {...axis} />
          <YAxis {...axis} width={64} />
          <Tooltip {...tooltip} />
          <Bar dataKey="capex" fill={cssVar("muted-foreground", 0.5)} {...common.bar} />
          <Bar dataKey="annual" fill={series.discharge.fill} {...common.bar} />
          <Line dataKey="cumulative" {...common.line} stroke={cssVar("foreground")} strokeWidth={2} dot={false} />
          {plan.paybackYears ? <ReferenceLine x={Math.round(plan.paybackYears)} stroke={cssVar("foreground")} strokeDasharray="3 3" /> : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
