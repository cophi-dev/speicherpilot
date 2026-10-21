"use client";

import { toPng } from "html-to-image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ChartLegend, DispatchChart, type DispatchPoint, useNarrowScreen } from "@/components/charts/DispatchChart";
import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { ResultRating } from "@/components/site/ResultRating";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import { HAMBURG_SUPERMARKET, hamburgSupermarketProfile } from "@/lib/hamburgSupermarket";
import { rateConnection, rateGridSupport, ratePayback, rateStorage } from "@/lib/readability";
import { connectionSentence, paybackSentence, peakSentence, storageSentence, supportSentence } from "@/lib/resultCopy";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axis, common, cssVar, grid, limitLine, paybackDomainMax, paybackLabelX, series, tooltip } from "@/lib/chart-theme";
import {
  GRID_CONNECTION_CONFIG,
  connectionRequestKw,
  defaultPlannerEconomics,
  exampleProfile,
  exceedsFairGrid,
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

type ProfileMode = ExampleProfileId | "manual" | "csv" | "supermarkt";

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
  advanced: boolean;
};

const economics = defaultPlannerEconomics();

function defaultDraft(): Draft {
  const example = HAMBURG_SUPERMARKET;
  return {
    mode: "supermarkt",
    csv: null,
    csvError: null,
    annualKwh: 3_100_000,
    shape: "G0",
    pvEnabled: true,
    pvKwp: example.pvKwp,
    orientation: "south",
    limitKw: example.limitKw,
    voltage: example.voltage,
    demand: example.demandChargeEurPerKwYear,
    energyCt: example.energyPriceCtPerKwh,
    feedIn: example.feedInCtPerKwh,
    dynamic: example.dynamicTariff,
    autoSize: false,
    powerKw: example.powerKw,
    energyKwh: example.energyKwh,
    rtePct: example.roundTripEfficiency * 100,
    capex: example.capexEurPerKwh,
    cycles: example.maxCyclesPerYear,
    life: example.lifetimeYears,
    discountPct: 0,
    transformerKw: 0,
    flexible: false,
    advanced: false,
  };
}

function loadExample(setDraft: (next: Draft) => void, setOperation: (next: OperationMode) => void) {
  setDraft(defaultDraft());
  setOperation(HAMBURG_SUPERMARKET.operation);
}

function profileFromDraft(draft: Draft): LoadProfile | null {
  if (draft.mode === "csv") {
    return draft.csv;
  }
  if (draft.mode === "manual") {
    return manualAnnualProfile(draft.shape, draft.annualKwh);
  }
  if (draft.mode === "supermarkt") {
    return hamburgSupermarketProfile();
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
  const fraction = GRID_CONNECTION_CONFIG.flexibleCapFraction;
  return {
    importCapKw: draft.limitKw * fraction,
    exportCapKw: draft.limitKw * fraction,
  };
}

export function SitePlanner() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const view = searchParams.get("view") === "netz" ? "netz" : "projekt";
  const [seenNetz, setSeenNetz] = useState(() => searchParams.get("view") === "netz");
  const narrow = useNarrowScreen();

  function selectView(next: "projekt" | "netz") {
    if (next === "netz") {
      setSeenNetz(true);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    const scrollY = window.scrollY;
    router.replace(`/site?${params.toString()}`, { scroll: false });
    window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(searchParams));
  const [operation, setOperation] = useState<OperationMode>(() =>
    draftFromParams(searchParams).mode === "supermarkt" ? HAMBURG_SUPERMARKET.operation : "market"
  );
  const [netzTab, setNetzTab] = useState<"duration" | "peak">("duration");
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
    ok: tx("Passt", "Fits"),
    near: tx("An der Grenze", "On the limit"),
    over: tx("Darüber", "Above"),
  };
  const showingExample = draft.mode === "supermarkt";

  function enterOwnData() {
    setDraft({ ...draft, mode: "csv", csv: null, csvError: null });
    window.setTimeout(() => {
      document.getElementById("load-profile")?.scrollIntoView({ block: "start" });
      document.getElementById("csv-drop")?.focus();
    }, 50);
  }

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
    params.set("view", view);
    if (language === "en") {
      params.set("lang", "en");
    }
    const url = `${window.location.origin}/site?${params.toString()}`;
    await navigator.clipboard.writeText(url);
  }

  async function exportPdf(kind: "offer" | "connection" = view === "netz" ? "connection" : "offer") {
    if (!plan || !profile || pdfBusy) {
      return;
    }
    setPdfBusy(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { SiteProposalDocument } = await import("@/components/site/SiteProposalDocument");
      const blob = await pdf(
        <SiteProposalDocument plan={plan} profile={profile} language={language} enteredVoltage={draft.voltage} kind={kind} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = kind === "connection" ? "speicherpilot-anschlusspruefung.pdf" : "speicherpilot-angebot.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <div className="md:max-w-[calc(100%-300px)]">
        <p className="num text-[12px] text-muted-foreground">Start / {tx("Standort", "Site")}</p>
          <h1 className="mt-1.5 text-[28px] leading-tight font-medium tracking-[-0.015em] md:text-[36px]">{tx("Standort rechnen", "Size a site")}</h1>
          <p className="mt-1 max-w-[68ch] text-muted-foreground">
            {tx(
              "Für einen Betrieb oder einen Netzanschluss: wie groß der Speicher ist, ob die Lastspitze hineinpasst und wann sich die Ausgabe bezahlt macht.",
              "For a business or a grid connection: how big the battery is, whether the load peak fits, and when the outlay pays for itself."
            )}
          </p>
      </div>
      <ViewSwitch view={view} onSelect={selectView} tx={tx} />
      <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
        {view === "projekt"
          ? tx("Hier siehst du die Speichergröße, die Kosten und ob sich der Speicher bezahlt macht.", "Here you see the battery size, the cost, and whether the battery pays for itself.")
          : tx("Hier siehst du, ob die Lastspitze in den bestehenden Anschluss passt.", "Here you see whether the load peak fits the connection you already have.")}
      </p>
      <div className="no-print mt-4 flex flex-wrap items-center gap-2 md:absolute md:top-8 md:right-8 md:mt-0">
          {profile?.synthetic ? <span className="num rounded-[4px] border border-border px-2 py-0.5 text-[12px]">BEISPIELDATEN</span> : null}
          <button type="button" className="h-10 rounded-md px-3 text-sm" onClick={() => loadExample(setDraft, setOperation)}>
            {tx("Beispiel laden", "Load example")}
          </button>
          <button type="button" className="h-10 rounded-md border border-border-strong px-3 text-sm" onClick={enterOwnData}>
            {tx("Zurücksetzen", "Reset")}
          </button>
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form id="load-profile" className="rounded-md border border-border bg-card p-5 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-auto" onSubmit={(event) => event.preventDefault()}>
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">01 {tx("Lastprofil", "Load profile")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              "Ein CSV mit 15-Minuten- oder Stundenwerten deines Betriebs ergibt das echte Ergebnis. Das Beispiel bleibt als Beispiel gekennzeichnet.",
              "A CSV of 15-minute or hourly values from your site gives the real result. The example stays labelled as an example."
            )}
          </p>
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
          <span className="mt-3 flex items-center gap-2 text-sm font-medium">
            <label htmlFor="shape">{tx("Profiltyp", "Shape")}</label>
            <GlossaryTip id="g0" language={language} />
            <GlossaryTip id="g1" language={language} />
            <GlossaryTip id="l0" language={language} />
          </span>
          <select id="shape" className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-2 dark:bg-secondary" value={draft.shape} onChange={(event) => setDraft({ ...draft, mode: "manual", shape: event.target.value as ManualShapeId })}>
            <option value="G0">G0 · {tx("Gewerbe, tagsüber gleichmäßig", "commercial, flat through the day")}</option>
            <option value="G1">G1 · {tx("Gewerbe mit Abendspitze", "commercial with an evening peak")}</option>
            <option value="L0">L0 · {tx("Morgen- und Abendspitze", "morning and evening peak")}</option>
          </select>
          <button id="csv-drop" type="button" className="mt-3 flex h-[120px] w-full items-center justify-center rounded-md border border-dashed border-border-strong px-3 text-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => fileRef.current?.click()}>
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
            {view === "netz" ? <VoltageField draft={draft} setDraft={setDraft} tx={tx} language={language} required /> : null}
            <Field id="limit" label={tx("Anschlussleistung", "Connection capacity")} unit="kW" value={draft.limitKw} onChange={(limitKw) => setDraft({ ...draft, limitKw })} required={view === "netz"} />
            <p className="mt-1 text-[12px] text-muted-foreground">
              {tx("Profilspitze", "Profile peak")}: {formatQuantity(peakKw, language, 0)} kW
              {peakKw > draft.limitKw ? <span className="text-warning"> · {tx("über Limit", "above the limit")}</span> : null}
            </p>
            {view === "projekt" ? <VoltageField draft={draft} setDraft={setDraft} tx={tx} language={language} /> : null}
          </Section>

          <Section label={`04 ${tx("Tarif", "Tariff")}`}>
            <Field label={tx("Leistungspreis", "Demand charge")} unit="€/kW·a" value={draft.demand} onChange={(demand) => setDraft({ ...draft, demand })} tip={<GlossaryTip id="eur-per-kw-year" language={language} />} />
            <Field label={tx("Arbeitspreis", "Energy price")} unit="ct/kWh" value={draft.energyCt} onChange={(energyCt) => setDraft({ ...draft, energyCt })} />
            <Field label={tx("Einspeisevergütung", "Feed-in")} unit="ct/kWh" value={draft.feedIn} onChange={(feedIn) => setDraft({ ...draft, feedIn })} />
            <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <label htmlFor="dynamic-tariff">{tx("Dynamischer Tarif (Day-Ahead)", "Dynamic tariff (day-ahead)")}</label>
                <GlossaryTip id="day-ahead" language={language} />
              </span>
              <input id="dynamic-tariff" type="checkbox" checked={draft.dynamic} onChange={(event) => setDraft({ ...draft, dynamic: event.target.checked })} />
            </div>
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
              <Field label="CAPEX" unit="€/kWh" value={draft.capex} onChange={(capex) => setDraft({ ...draft, capex })} tip={<GlossaryTip id="capex" language={language} />} />
              <Field label={tx("Zyklen/Jahr max", "Max cycles/year")} unit="/a" value={draft.cycles} onChange={(cycles) => setDraft({ ...draft, cycles })} />
              <p className="mt-3 text-sm font-medium">{tx("Betriebsart", "Operation")}</p>
              <div className="mt-1.5 flex gap-2">
                {(["market", "grid-serving"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={operation === mode}
                    className={`h-8 flex-1 rounded-md border px-2 text-sm ${operation === mode ? "border-foreground bg-foreground text-background" : "border-border"}`}
                    onClick={() => setOperation(mode)}
                  >
                    {mode === "market" ? tx("Markt", "Market") : tx("Netz", "Grid")}
                  </button>
                ))}
              </div>
              <Field label={tx("Lebensdauer", "Lifetime")} unit="a" value={draft.life} onChange={(life) => setDraft({ ...draft, life })} />
              <Field label={tx("Diskont", "Discount")} unit="%" value={draft.discountPct} onChange={(discountPct) => setDraft({ ...draft, discountPct })} />
              <Field label={tx("Trafo / Anschluss, Plan", "Transformer / connection, plan")} unit="kW" value={draft.transformerKw} onChange={(transformerKw) => setDraft({ ...draft, transformerKw })} />
              <p className="mt-2 text-[12px] text-muted-foreground">{tx("0 kW übernimmt die Anschlussleistung. Das ist kein gemessener Transformator.", "0 kW uses the connection capacity. That is not a measured transformer.")}</p>
            </div>
          ) : null}

          <button
            type="button"
            className={`no-print mt-5 hidden h-10 w-full items-center justify-center rounded-md text-sm font-medium disabled:opacity-60 lg:inline-flex ${showingExample ? "border border-border bg-card text-foreground" : "bg-primary text-primary-foreground"}`}
            disabled={!plan || pdfBusy}
            onClick={() => void exportPdf(view === "netz" ? "connection" : "offer")}
          >
            {pdfBusy ? tx("PDF wird gebaut", "Building PDF") : view === "netz" ? tx("Anschlussprüfung als PDF", "Connection check as PDF") : tx("Angebot als PDF", "Offer as PDF")}
          </button>
          <p className="mt-2 text-center text-[12px] text-muted-foreground">{tx("Daten bleiben im Browser", "Data stays in the browser")}</p>
        </form>

        <div className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-0">
          {!plan || !profile ? (
            <div className="rounded-md border border-dashed border-border-strong p-8" role="tabpanel" id="results-panel">
              <p>
                {view === "netz"
                  ? tx("Lastprofil und Anschlussleistung angeben, um die Netzlast zu prüfen.", "Add a load profile and a connection capacity to check the grid load.")
                  : tx("Lastprofil laden, um Größe und Amortisation zu sehen.", "Load a profile to see size and payback.")}
              </p>
              {view === "netz" && draft.limitKw <= 0 ? (
                <button type="button" className="num mt-3 rounded-[4px] border border-warning px-2 py-0.5 text-[12px] text-warning" onClick={() => document.getElementById("limit")?.focus()}>
                  {tx("ANSCHLUSSLEISTUNG FEHLT", "CONNECTION CAPACITY MISSING")}
                </button>
              ) : null}
              <button type="button" className="mt-4 h-10 rounded-md border border-border px-3 text-sm" onClick={() => loadExample(setDraft, setOperation)}>
                {tx("Beispiel laden", "Load example")}
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Ergebnis", "Result")}</p>
                {showingExample ? (
                  <div className="mt-3 rounded-md border border-border-strong bg-card p-4 md:p-5">
                    <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">BEISPIELDATEN</p>
                    <h2 className="mt-1 text-xl font-medium">{language === "de" ? HAMBURG_SUPERMARKET.labelDe : HAMBURG_SUPERMARKET.labelEn}</h2>
                    <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
                      {tx(
                        "Fiktiver Betrieb, keine Messung. Der Speicher kappt die Abendspitze auf die Anschlussgrenze. Ein CSV mit 15-Minuten- oder Stundenwerten deines eigenen Lastprofils ergibt das echte Ergebnis.",
                        "A fictional site, not a measurement. The battery cuts the evening peak to the connection limit. A CSV of 15-minute or hourly values from your own load profile gives the real result."
                      )}
                    </p>
                    <button
                      type="button"
                      className="mt-4 hidden h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:inline-flex"
                      onClick={enterOwnData}
                    >
                      {tx("Eigene Daten eingeben", "Enter your own data")}
                    </button>
                  </div>
                ) : profile.synthetic ? (
                  <p className="num mt-1 text-[12px] text-muted-foreground">BEISPIELDATEN</p>
                ) : null}
                <div className="mt-2.5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Tile
                    key="speicher"
                    tone="bess"
                    label={tx("Speicher", "Storage")}
                    value={formatQuantity(plan.energyKwh, language, 0)}
                    unit="kWh"
                    sentence={storageSentence(plan.energyKwh, plan.powerKw, language)}
                    light={rateStorage({ peakBeforeKw: plan.peakImportBeforeKw, peakAfterKw: plan.peakImportAfterKw, limitKw: draft.limitKw })}
                    language={language}
                  />
                  <Tile
                    key="spitze"
                    tone="limit"
                    label={tx("Spitze", "Peak")}
                    value={formatQuantity(plan.peakImportAfterKw, language, 0)}
                    unit="kW"
                    sentence={peakSentence(plan.peakImportBeforeKw, plan.peakImportAfterKw, language)}
                    light={rateConnection(plan.connection)}
                    language={language}
                  />
                  <Tile
                    key="anschluss"
                    label={tx("Anschluss", "Connection")}
                    value={statusLabel[plan.connection]}
                    unit=""
                    sentence={connectionSentence(plan.connection, plan.peakImportAfterKw - draft.limitKw, language)}
                    light={rateConnection(plan.connection)}
                    language={language}
                    chip={plan.connection}
                    words
                  />
                  <div className="relative min-w-0">
                    <div className={`${view === "projekt" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"} transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none`}>
                      <Tile
                        label={tx("Amortisation", "Payback")}
                        value={formatYears(plan.paybackYears, language)}
                        unit={plan.paybackYears ? "a" : ""}
                        sentence={paybackSentence(plan.paybackYears, language)}
                        light={ratePayback(plan.paybackYears)}
                        language={language}
                      />
                    </div>
                    <div className={`${view === "netz" ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"} transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none`}>
                      <SupportTile plan={plan} language={language} tx={tx} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative" role="tabpanel" id="results-panel">
              <div className={`${view === "projekt" ? "opacity-100" : "pointer-events-none absolute inset-x-0 opacity-0"} flex flex-col gap-6 transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none`} aria-hidden={view !== "projekt"} inert={view !== "projekt"}>
              <article className="rounded-md border border-border bg-card p-4 md:p-6">
                <p className="num flex items-center gap-2 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                  Peak Shaving · {profile.intervalMinutes} min
                  <GlossaryTip id="peak-shaving" language={language} />
                </p>
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
                  <span className="inline-flex items-center gap-2">
                    <button type="button" className={tab === "duration" ? "border-b-2 border-foreground py-2" : "py-2 text-muted-foreground"} onClick={() => setTab("duration")}>
                      {tx("Jahresdauerlinie", "Duration curve")}
                    </button>
                    <GlossaryTip id="jahresdauerlinie" language={language} />
                  </span>
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
                      { label: tx("Last ohne Speicher", "Load without storage"), swatch: "line" },
                      { label: tx("Netzbezug mit Speicher", "Grid with storage"), swatch: "line-bold" },
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
                  <Mini label={tx("Vollzyklen", "Full cycles")} value={`${formatQuantity(plan.fullCycles, language, 0)} /a`} tip={<GlossaryTip id="vollzyklen" language={language} />} />
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
                <PaybackChart plan={plan} narrow={narrow} language={language} />
                <p className="num mt-2 text-[12px] text-muted-foreground">
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1">CAPEX {formatQuantity(plan.capexEur, language, 0)} € <GlossaryTip id="capex" language={language} /></span>
                    <span className="inline-flex items-center gap-1">OPEX {formatQuantity(plan.assumptions.opexFractionOfCapex * 100, language, 1)} % <GlossaryTip id="opex" language={language} /></span>
                    <span>{tx("Diskont", "Discount")} {formatQuantity(draft.discountPct, language, 1)} %</span>
                    <span className="inline-flex items-center gap-1">NPV {formatQuantity(plan.npvEur, language, 0)} € <GlossaryTip id="npv" language={language} /></span>
                  </span>
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

              <article className="rounded-md border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">
                    {formatQuantity(draft.limitKw, language, 0)} kW · {draft.voltage}
                    {plan.connection === "over"
                      ? tx(` · ${formatQuantity(Math.max(0, plan.peakImportAfterKw - draft.limitKw), language, 0)} kW fehlen`, ` · ${formatQuantity(Math.max(0, plan.peakImportAfterKw - draft.limitKw), language, 0)} kW short`)
                      : tx(` · ${formatQuantity(plan.reserveFraction * 100, language, 0)} % Reserve`, ` · ${formatQuantity(plan.reserveFraction * 100, language, 0)}% reserve`)}
                  </p>
                  <span className="num text-[12px]">{statusLabel[plan.connection]}</span>
                </div>
                {exceedsFairGrid(connectionRequestKw(plan.requestedConnectionKw, draft.limitKw)) ? (
                  <p className="mt-2 text-sm text-warning">{tx("Über 1,5 MVA · Fair Grid. Hinweis im Netzbetreiber-Check, keine Zuteilung.", "Above 1.5 MVA · Fair Grid. See the grid-operator check. Not an allocation.")}</p>
                ) : null}
              </article>
              </div>
              {seenNetz && marketPlan && servingPlan ? (
                <div className={`${view === "netz" ? "opacity-100" : "pointer-events-none absolute inset-x-0 top-0 opacity-0"} flex flex-col gap-6 transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none`} aria-hidden={view !== "netz"} inert={view !== "netz"}>
                <DsoView
                  draft={draft}
                  setDraft={setDraft}
                  plan={plan}
                  market={marketPlan}
                  serving={servingPlan}
                  flexible={flexiblePlan}
                  points={dsoPoints}
                  narrow={narrow}
                  netzTab={netzTab}
                  setNetzTab={setNetzTab}
                  dayPick={dayPick}
                  setDayPick={setDayPick}
                  totalHours={(profile.samplesKw.length * profile.intervalMinutes) / 60}
                  language={language}
                  tx={tx}
                  statusLabel={statusLabel}
                />
                </div>
              ) : null}
              </div>

              <details className="rounded-md border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">{tx("Annahmen", "Assumptions")}</summary>
                <dl className="num mt-3 grid gap-2 text-[13px]">
                  <div className="flex justify-between gap-4"><dt className="inline-flex items-center gap-2">{tx("Dimensionierung", "Sizing")} <GlossaryTip id="p95" language={language} /></dt><dd className="text-right">{plan.assumptions.sizingRule}</dd></div>
                  <div className="flex justify-between gap-4"><dt>{tx("Preise", "Prices")}</dt><dd className="text-right">{plan.assumptions.priceNote}</dd></div>
                  <div className="flex justify-between gap-4"><dt>RTE</dt><dd>{formatQuantity(plan.assumptions.roundTripEfficiency * 100, language, 0)} %</dd></div>
                  <div className="flex justify-between gap-4"><dt>{tx("Nicht enthalten", "Excluded")}</dt><dd className="text-right">{plan.assumptions.excluded.join(", ")}</dd></div>
                  {view === "netz" ? <div className="flex justify-between gap-4"><dt>{tx("Amortisation", "Payback")}</dt><dd>{formatYears(plan.paybackYears, language)} · {formatQuantity(plan.annualBenefitEur, language, 0)} €/a</dd></div> : null}
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">{tx("Illustratives Modell, keine Beschaffungs- oder Anlagenberatung.", "Illustrative model, not procurement or plant advice.")}</p>
              </details>
              <div className="no-print flex flex-wrap gap-2">
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => void exportPng()}>PNG</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={exportCsv}>CSV</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => void shareLink()}>{tx("Link teilen", "Share link")}</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => window.print()}>{tx("Drucken", "Print")}</button>
                <button type="button" className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => void exportPdf(view === "netz" ? "offer" : "connection")}>
                  {view === "netz" ? tx("Angebot als PDF", "Offer as PDF") : tx("Anschlussprüfung als PDF", "Connection check as PDF")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {plan && profile ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between border-t border-border bg-background px-4 lg:hidden">
          <p className="num text-sm">
            {formatQuantity(plan.energyKwh, language, 0)} kWh
          </p>
          {showingExample ? (
            <button type="button" className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" onClick={enterOwnData}>
              {tx("Eigene Daten eingeben", "Enter your own data")}
            </button>
          ) : (
            <button type="button" className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60" disabled={pdfBusy} onClick={() => void exportPdf(view === "netz" ? "connection" : "offer")}>
              {view === "netz" ? tx("Anschlussprüfung als PDF", "Connection PDF") : tx("Angebot als PDF", "Offer as PDF")}
            </button>
          )}
        </div>
      ) : null}

      {plan && profile ? (
        <div ref={posterRef} inert aria-hidden className="pointer-events-none fixed top-0 -left-[2000px] h-[900px] w-[1600px] bg-[#0B0D0F] text-[#ECEDEE]">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative px-20 pt-16">
            <p className="num text-[22px] tracking-[0.08em] text-[#9CA2A8] uppercase">SpeicherPilot · Speicher-Fahrplan · 24 h · ¼h</p>
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

function voltageLong(level: VoltageLevel, language: "de" | "en") {
  if (level === "NS") {
    return language === "de" ? "Niederspannung" : "Low voltage";
  }
  if (level === "HS") {
    return language === "de" ? "Hochspannung" : "High voltage";
  }
  return language === "de" ? "Mittelspannung" : "Medium voltage";
}

function clockLabel(hour: number) {
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  return `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function ViewSwitch({ view, onSelect, tx }: { view: "projekt" | "netz"; onSelect: (next: "projekt" | "netz") => void; tx: (de: string, en: string) => string }) {
  const order = ["projekt", "netz"] as const;
  return (
    <div className="sticky top-14 z-30 -mx-5 mt-4 border-b border-border bg-background/90 px-5 py-2.5 backdrop-blur md:static md:z-auto md:mx-0 md:mt-5 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <div
        role="tablist"
        aria-label={tx("Perspektive", "Perspective")}
        className="flex min-h-9 w-full border border-border-strong min-[481px]:w-fit"
        onKeyDown={(event) => {
          const index = order.indexOf(view);
          let next: "projekt" | "netz" | null = null;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            const delta = event.key === "ArrowRight" ? 1 : -1;
            next = order[(index + delta + 2) % 2] ?? "projekt";
          }
          if (event.key === "Home") {
            event.preventDefault();
            next = "projekt";
          }
          if (event.key === "End") {
            event.preventDefault();
            next = "netz";
          }
          if (next) {
            onSelect(next);
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus();
          }
        }}
      >
        {order.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            data-view={key}
            aria-selected={view === key}
            aria-controls="results-panel"
            tabIndex={view === key ? 0 : -1}
            className={`flex min-h-9 flex-1 items-center justify-center px-3 py-1.5 text-center text-sm leading-tight font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-[481px]:flex-none min-[481px]:px-4 ${view === key ? "bg-foreground text-background" : "bg-card"}`}
            onClick={() => onSelect(key)}
          >
            {key === "projekt" ? tx("Ich plane einen Speicher", "I am planning storage") : tx("Ich prüfe einen Netzanschluss", "I am checking a connection")}
          </button>
        ))}
      </div>
    </div>
  );
}

function VoltageField({ draft, setDraft, tx, language, required }: { draft: Draft; setDraft: (next: Draft) => void; tx: (de: string, en: string) => string; language: "de" | "en"; required?: boolean }) {
  return (
    <>
      <span className="mt-3 flex items-center gap-2 text-sm font-medium">
        <label htmlFor="voltage">
          {tx("Spannungsebene", "Voltage")}
          {required ? <span className="num ml-2 text-[12px] tracking-[0.08em] text-muted-foreground">PFLICHT</span> : null}
        </label>
        <GlossaryTip id="ns" language={language} />
        <GlossaryTip id="ms" language={language} />
        <GlossaryTip id="hs" language={language} />
      </span>
      <select id="voltage" className="mt-1.5 h-10 w-full rounded-md border border-input bg-card px-2 dark:bg-secondary" value={draft.voltage} onChange={(event) => setDraft({ ...draft, voltage: event.target.value as VoltageLevel })}>
        <option value="NS">NS · {tx("Niederspannung", "Low voltage")}</option>
        <option value="MS">MS · {tx("Mittelspannung", "Medium voltage")}</option>
        <option value="HS">HS · {tx("Hochspannung", "High voltage")}</option>
      </select>
    </>
  );
}

function SupportTile({ plan, language, tx }: { plan: SitePlan; language: "de" | "en"; tx: (de: string, en: string) => string }) {
  const status = plan.gridSupport.status;
  const label =
    status === "supportive"
      ? tx("Einschätzung netzdienlich", "Estimate: grid-supportive")
      : status === "mixed"
        ? tx("Einschätzung gemischt", "Estimate: mixed")
        : status === "new-peak"
          ? tx("Einschätzung: neue Spitze", "Estimate: new peak")
          : tx("Einschätzung marktgetrieben", "Estimate: market-driven");
  const tone = status === "supportive" ? "text-success" : status === "mixed" ? "text-warning" : status === "new-peak" ? "text-destructive" : "text-muted-foreground";
  const share = Math.max(0, Math.min(1, plan.gridSupport.dischargeShareInPeaks));
  const tooltip = tx(
    "Einschätzung, kein Befund. Nach dem Beschluss des Bundesgerichtshofs vom 15. Juli 2025 (EnVR 1/24) kann nur der Netzbetreiber beurteilen, ob Speicher das örtliche Netz entlasten. Schwellen 90 %, 60 % und 30 % sind vorläufig.",
    "An estimate, not a finding. Under the Federal Court of Justice decision of 15 July 2025 (EnVR 1/24), only the grid operator can assess whether storage relieves the local grid. The 90%, 60% and 30% thresholds are provisional."
  );
  return (
    <div className="h-full min-w-0 border border-border bg-card p-3 md:px-4 md:py-4" title={tooltip}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Einschätzung", "Estimate")}</p>
      <p className={`mt-2 text-[18px] leading-tight font-medium md:text-[20px] ${tone}`}>{label}</p>
      <p className="num mt-2 text-[12px] text-muted-foreground">{formatQuantity(share * 100, language, 0)} % {tx("Entladung in Spitzenfenstern", "discharge in peak windows")}</p>
      <div className="relative mt-2 h-1.5 bg-secondary" aria-hidden>
        <div className="h-full bg-foreground" style={{ width: `${share * 100}%` }} />
        <i className="absolute top-0 h-1.5 border-l border-border-strong" style={{ left: "30%" }} />
        <i className="absolute top-0 h-1.5 border-l border-border-strong" style={{ left: "60%" }} />
      </div>
      <p className="mt-2 text-[12px] leading-snug text-foreground">{supportSentence(status, language)}</p>
      <ResultRating light={rateGridSupport(status)} language={language} />
      <p className="mt-2 text-[12px] text-muted-foreground">{tx("Kein Befund des Netzbetreibers.", "Not a grid-operator finding.")}</p>
      <a className="mt-1 inline-block text-[12px] underline underline-offset-[3px]" href="/methodik#netzdienlichkeit" title={tooltip}>
        {tx("Methodik", "Method")}
      </a>
    </div>
  );
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
  narrow,
  netzTab,
  setNetzTab,
  dayPick,
  setDayPick,
  totalHours,
  language,
  tx,
  statusLabel,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  plan: SitePlan;
  market: SitePlan;
  serving: SitePlan;
  flexible: SitePlan | null;
  points: DispatchPoint[];
  narrow: boolean;
  netzTab: "duration" | "peak";
  setNetzTab: (next: "duration" | "peak") => void;
  dayPick: "peak" | "median";
  setDayPick: (next: "peak" | "median") => void;
  totalHours: number;
  language: "de" | "en";
  tx: (de: string, en: string) => string;
  statusLabel: Record<ConnectionStatus, string>;
}) {
  const caps = flexibleCaps(draft);
  const voltage = voltageLong(draft.voltage, language);
  const limitText = `Netzanschluss ${formatQuantity(draft.limitKw, language, 0)} kW · ${draft.voltage}`;
  const bands = [
    { id: "below50", de: "<50 %", en: "<50%" },
    { id: "50to75", de: "50–75 %", en: "50–75%" },
    { id: "75to90", de: "75–90 %", en: "75–90%" },
    { id: "above90", de: "≥90 %", en: "≥90%" },
  ] as const;
  const bandData = bands.map((band) => {
    const row = plan.loadBands.find((item) => item.id === band.id);
    return {
      band: language === "de" ? band.de : band.en,
      discharge: row?.dischargeKwh ?? 0,
      charge: row?.chargeKwh ?? 0,
    };
  });
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {tx(
          "Verteilnetzbetreiber prüfen und schließen Speicher Dritter an. Sie besitzen ihn hier nicht. Keine Anschlusszusage, keine Rechtsberatung.",
          "Distribution operators assess and connect third-party storage. They do not own it here. Not a connection offer and not legal advice."
        )}
      </p>
      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
          {tx("Netzlast", "Grid load")} · {voltage} · {plan.peakDay.loadKw.length > 24 ? "15 MIN" : "60 MIN"}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold">
          {formatQuantity(plan.exceedanceHoursBefore, language, 0)} h {tx("über", "above")} {formatQuantity(draft.limitKw, language, 0)} kW {tx("ohne Speicher", "without storage")}, {formatQuantity(plan.exceedanceHoursAfter, language, 0)} h {tx("mit", "with")}
        </h2>
        <div className="mt-3 flex gap-6 overflow-x-auto border-b border-border text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <button type="button" className={netzTab === "duration" ? "border-b-2 border-foreground py-2" : "py-2 text-muted-foreground"} onClick={() => setNetzTab("duration")}>
              {tx("Jahresdauerlinie", "Duration curve")}
            </button>
            <GlossaryTip id="jahresdauerlinie" language={language} />
          </span>
          <button type="button" className={netzTab === "peak" ? "border-b-2 border-foreground py-2" : "py-2 text-muted-foreground"} onClick={() => setNetzTab("peak")}>{tx("Tagesprofil", "Day profile")}</button>
        </div>
        {netzTab === "duration" ? (
          <DurationChart
            before={plan.durationBeforeKw}
            after={plan.durationAfterKw}
            limitKw={draft.limitKw}
            narrow={narrow}
            totalHours={totalHours}
            exceedBefore={plan.exceedanceHoursBefore}
            exceedAfter={plan.exceedanceHoursAfter}
            limitText={limitText}
          />
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              {(["peak", "median"] as const).map((key) => (
                <button key={key} type="button" className={`h-8 rounded-md border px-3 text-sm ${dayPick === key ? "border-foreground bg-foreground text-background" : "border-border"}`} onClick={() => setDayPick(key)}>
                  {key === "peak" ? tx("Spitzentag", "Peak day") : tx("Median", "Median")}
                </button>
              ))}
            </div>
            <DispatchChart points={points} limitKw={draft.limitKw} language={language} bessOpacity={0.5} />
          </>
        )}
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Netzanschluss", "Connection")}</p>
          <span className="num text-[12px]">{statusLabel[plan.connection]}</span>
        </div>
        <h2 className="mt-1.5 text-lg font-semibold">
          {formatQuantity(draft.limitKw, language, 0)} kW · {draft.voltage} {tx("reichen", "holds")} {plan.connection === "over" ? tx("nicht", "not") : ""} {tx("mit Speicher", "with storage")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tx("Angefragt", "Requested")} {formatQuantity(plan.requestedConnectionKw, language, 0)} kW · {tx("Hinweis", "Hint")} {plan.voltageSuggestion.level} · {plan.voltageSuggestion.rule}
        </p>
        <a className="mt-1 inline-block text-sm underline underline-offset-[3px]" href={plan.voltageSuggestion.href} target="_blank" rel="noreferrer">{plan.voltageSuggestion.rule}</a>
        <Gauge limitKw={draft.limitKw} beforeKw={plan.peakImportBeforeKw} afterKw={plan.peakImportAfterKw} />
        <ul className="num mt-4 grid gap-1 text-[13px] md:grid-cols-2">
          <Check ok={plan.checks.importWithinLimit} label={tx("Bezugsspitze ≤ Limit", "Import peak ≤ limit")} />
          <Check ok={plan.checks.exportWithinLimit} label={tx("Rückspeisung ≤ Limit", "Export ≤ limit")} />
          <Check ok={plan.checks.exceedanceHoursZero} label={tx("Überschreitungsstunden = 0", "Hours above the limit = 0")} />
          <Check ok={plan.checks.reserveAtLeast10Pct} label={tx(`Reserve ${formatQuantity(plan.reserveFraction * 100, language, 0)} % ≥ 10 %`, `Reserve ${formatQuantity(plan.reserveFraction * 100, language, 0)}% ≥ 10%`)} />
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {tx("Trafo-Planungswert", "Transformer planning rating")} {formatQuantity(plan.transformerLoadBeforePct * 100, language, 0)} % → {formatQuantity(plan.transformerLoadAfterPct * 100, language, 0)} % {tx("von", "of")} {formatQuantity(plan.transformerRatingKw, language, 0)} kW. {tx("Kein gemessener Transformator.", "Not a measured transformer.")}
        </p>
        {exceedsFairGrid(connectionRequestKw(plan.requestedConnectionKw, draft.limitKw)) ? (
          <div className="mt-4 border border-warning p-3">
            <p className="num text-[12px] tracking-[0.08em] text-warning uppercase">{tx("Über 1,5 MVA · Fair Grid", "Above 1.5 MVA · Fair Grid")}</p>
            <p className="mt-1 text-sm">
              {tx(
                "Hamburger Energienetze vergeben neue Hoch- und Mittelspannungsanschlüsse über 1,5 MVA im Fair-Grid-Verfahren in Runden, angekündigt für das zweite Halbjahr 2026. Hinweis, keine Zuteilung. Vergleich in kW bei cos φ = 1, nicht als gemessene Scheinleistung.",
                "Hamburger Energienetze allocates new high- and medium-voltage connections above 1.5 MVA in Fair Grid rounds, announced for the second half of 2026. A hint, not an allocation. Compared in kW at cos φ = 1, not as measured apparent power."
              )}
            </p>
            <a className="mt-2 inline-block text-sm underline underline-offset-[3px]" href="/methodik#anschluss">{tx("Quellen", "Sources")}</a>
          </div>
        ) : null}
        <div className="mt-4 border border-border p-3">
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            {tx("Flexible Anschlussvereinbarung, Szenario", "Flexible connection agreement, scenario")}
            <input type="checkbox" checked={draft.flexible} onChange={(event) => setDraft({ ...draft, flexible: event.target.checked })} />
          </label>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              `§ 17 Abs. 2b EnWG: der Netzbetreiber kann eine Kappung von Bezug und Einspeisung anbieten. Dieses Szenario setzt beide Seiten auf ${formatQuantity(GRID_CONNECTION_CONFIG.flexibleCapFraction * 100, language, 0)} % der eingegebenen Anschlussleistung. Kein Anspruch, kein Vertrag, kein SCADA. Die Prozentzahl steht in GRID_CONNECTION_CONFIG und ist keine gesetzliche Höhe.`,
              `Section 17 (2b) EnWG: the grid operator may offer a cap on withdrawal and feed-in. This scenario sets both sides to ${formatQuantity(GRID_CONNECTION_CONFIG.flexibleCapFraction * 100, language, 0)}% of the entered connection capacity. No entitlement, no contract, no SCADA. The percentage lives in GRID_CONNECTION_CONFIG and is not a statutory level.`
            )}
          </p>
          {draft.flexible && flexible ? (
            <p className="num mt-2 text-sm">
              {formatQuantity(caps.importCapKw, language, 0)} / {formatQuantity(caps.exportCapKw, language, 0)} kW · {tx("Abregelung", "Curtailment")} {formatQuantity(flexible.curtailmentKwh, language, 0)} kWh
            </p>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm">
            <caption className="sr-only">{tx("Markt und netzorientierter Betrieb", "Market and grid-oriented operation")}</caption>
            <thead className="bg-secondary text-left">
              <tr className="num text-[12px] uppercase text-muted-foreground">
                <th className="px-2 py-2">{tx("Betrieb", "Operation")}</th>
                <th className="px-2 py-2">{tx("Markt", "Market")}</th>
                <th className="px-2 py-2">{tx("Netz", "Grid")}</th>
              </tr>
            </thead>
            <tbody className="num">
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
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Lastbänder", "Load bands")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{tx("Laden und Entladen nach Auslastung", "Charge and discharge by connection load")}</h2>
        <div className="mt-3 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="band" {...axis} />
              <YAxis {...axis} width={56} />
              <Tooltip {...tooltip} />
              <Bar dataKey="discharge" stackId="band" fill={series.discharge.fill} name={tx("Entladen", "Discharge")} />
              <Bar dataKey="charge" stackId="band" fill={series.charge.fill} name={tx("Laden", "Charge")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{tx("Bänder der Standortlast gegen die Anschlussleistung. Dieselbe Farbe wie der Speicher, kein zweiter Akzent.", "Bands of site load against the connection capacity. The same storage colour, no second accent.")}</p>
      </article>

      <article className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Speicher-Fahrplan", "Storage schedule")}</p>
        <h2 className="mt-1.5 text-lg font-semibold">{tx("Zehn höchste Viertelstunden", "Ten highest quarter-hours")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <caption className="sr-only">{tx("Höchste Lastintervalle", "Highest load intervals")}</caption>
            <thead className="bg-secondary text-left">
              <tr className="num text-[12px] uppercase text-muted-foreground">
                <th className="px-2 py-2">{tx("Zeit", "Time")}</th>
                <th className="px-2 py-2">{tx("Last", "Load")}</th>
                <th className="px-2 py-2">{tx("Netz danach", "Grid after")}</th>
                <th className="px-2 py-2">{tx("Speicher", "Storage")}</th>
              </tr>
            </thead>
            <tbody className="num">
              {plan.topQuarterHours.map((slot) => (
                <tr key={slot.index} className="border-t border-border">
                  <td className="px-2 py-2">{tx("Tag", "Day")} {slot.dayIndex + 1} · {clockLabel(slot.hour)}</td>
                  <td className="px-2 py-2">{formatQuantity(slot.loadKw, language, 0)}</td>
                  <td className="px-2 py-2">{formatQuantity(slot.gridAfterKw, language, 0)}</td>
                  <td className="px-2 py-2">{formatQuantity(slot.bessKw, language, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}

function draftFromParams(params: { get: (key: string) => string | null }): Draft {
  const base = defaultDraft();
  const mode = params.get("profile");
  if (!mode || mode === "supermarkt") {
    return base;
  }
  const legacy: Draft = {
    ...base,
    mode: "gewerbe",
    pvKwp: economics.pvKwp,
    limitKw: economics.limitKw,
    voltage: economics.voltage,
    demand: economics.demandChargeEurPerKwYear,
    energyCt: economics.energyPriceCtPerKwh,
    dynamic: true,
    autoSize: true,
    powerKw: 310,
    energyKwh: 620,
  };
  return {
    ...legacy,
    mode: mode === "kuehlhaus" || mode === "ladepark" || mode === "manual" || mode === "csv" ? mode : "gewerbe",
    pvKwp: numberOr(params.get("pv"), legacy.pvKwp),
    limitKw: numberOr(params.get("limit"), legacy.limitKw),
    demand: numberOr(params.get("demand"), legacy.demand),
    energyCt: numberOr(params.get("energy"), legacy.energyCt),
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

function Field({ label, unit, value, onChange, id, required, tip }: { label: string; unit: string; value: number; onChange: (value: number) => void; id?: string; required?: boolean; tip?: React.ReactNode }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="mt-3 block">
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <label htmlFor={inputId}>{label}</label>
        {tip}
        {required ? <span className="num text-[12px] tracking-[0.08em] text-muted-foreground">PFLICHT</span> : null}
      </span>
      <span className="mt-1.5 flex h-10 items-center rounded-md border border-input bg-card px-3 dark:bg-secondary">
        <input id={inputId} inputMode="decimal" className="num w-full bg-transparent text-right outline-none" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} />
        <span className="num ml-2 shrink-0 text-[13px] text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  sentence,
  light,
  language,
  tone,
  chip,
  words,
}: {
  label: string;
  value: string;
  unit: string;
  sentence: string;
  light: "green" | "yellow" | "red";
  language: "de" | "en";
  tone?: "bess" | "limit";
  chip?: ConnectionStatus;
  words?: boolean;
}) {
  const border = tone === "bess" ? "border-bess" : tone === "limit" ? "border-limit" : "border-border";
  const chipClass = chip === "ok" ? "text-success" : chip === "near" ? "text-warning" : chip === "over" ? "text-destructive" : "";
  return (
    <div className={`min-w-0 border border-border border-l-[3px] ${border} bg-card p-3 md:px-4 md:py-4`}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className={`num mt-2 leading-tight ${words ? "text-[20px] md:text-[22px]" : "text-[24px] md:text-[32px]"} ${chipClass}`}>
        {value} {unit ? <span className="text-[12px] text-muted-foreground">{unit}</span> : null}
      </p>
      <p className="mt-2 text-sm text-foreground">{sentence}</p>
      <ResultRating light={light} language={language} />
    </div>
  );
}

function Mini({ label, value, tip }: { label: string; value: string; tip?: React.ReactNode }) {
  return (
    <div>
      <p className="num inline-flex items-center gap-2 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
        {tip}
      </p>
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

function DurationChart({
  before,
  after,
  limitKw,
  narrow,
  totalHours = 8760,
  exceedBefore = 0,
  exceedAfter = 0,
  limitText,
}: {
  before: number[];
  after: number[];
  limitKw: number;
  narrow: boolean;
  totalHours?: number;
  exceedBefore?: number;
  exceedAfter?: number;
  limitText?: string;
}) {
  const span = totalHours > 0 ? totalHours : 1;
  const data = before.map((value, index) => ({
    hour: before.length <= 1 ? 0 : (index / (before.length - 1)) * span,
    before: value,
    after: after[index] ?? 0,
  }));
  const ticks = [0, span * 0.25, span * 0.5, span * 0.75, span];
  return (
    <div className="mt-3 h-[240px] w-full md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis
            dataKey="hour"
            {...axis}
            type="number"
            domain={[0, span]}
            ticks={narrow ? [0, span / 2, span] : ticks}
            tickFormatter={(value: number) => `${formatQuantity(value, "de", 0)} h`}
          />
          <YAxis {...axis} width={56} />
          <Tooltip {...tooltip} />
          {exceedBefore > 0 ? <ReferenceArea x1={0} x2={Math.min(exceedBefore, span)} fill={cssVar("c-limit", 0.08)} /> : null}
          <Line dataKey="before" type="monotone" {...common.line} stroke={cssVar("subtle")} strokeWidth={1.5} name="ohne Speicher" />
          <Line dataKey="after" type="monotone" {...common.line} {...series.netLoad} name="mit Speicher" />
          {limitKw > 0 ? (
            <ReferenceLine
              y={limitKw * 0.9}
              stroke={cssVar("warning")}
              strokeDasharray="2 3"
              label={{ value: "90 %", position: "insideTopRight", fill: cssVar("warning"), fontSize: 12, fontFamily: "var(--font-plex-mono)" }}
            />
          ) : null}
          {limitKw > 0 ? (
            <ReferenceLine
              {...limitLine(limitKw, limitText ?? "Netzanschluss")}
              label={{
                value: limitText ?? "Netzanschluss",
                position: narrow ? "insideTopLeft" : "insideTopRight",
                fill: cssVar("c-limit"),
                fontFamily: "var(--font-plex-mono)",
                fontSize: 12,
              }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="num mt-1 text-[12px] text-muted-foreground">
        {formatQuantity(exceedBefore, "de", 0)} h → {formatQuantity(exceedAfter, "de", 0)} h
      </p>
    </div>
  );
}

function PaybackLabel({ viewBox, value, plotWidth }: { viewBox?: { x?: number; y?: number; height?: number }; value?: string; plotWidth: number }) {
  const lineX = viewBox?.x ?? 0;
  const plotLeft = 64;
  const labelWidth = (value?.length ?? 0) * 7.2 + 8;
  const plotRight = plotWidth > 0 ? plotWidth - 8 : undefined;
  const x = paybackLabelX(lineX, plotLeft, 8, plotRight, labelWidth);
  const y = (viewBox?.y ?? 0) + Math.max(16, (viewBox?.height ?? 0) * 0.42);
  return (
    <text x={x} y={y} fill={cssVar("foreground")} fontSize={12} fontFamily="var(--font-plex-mono)">
      {value}
    </text>
  );
}

function PaybackChart({ plan, narrow, language }: { plan: SitePlan; narrow: boolean; language: "de" | "en" }) {
  const horizon = narrow ? Math.max(10, Math.ceil(plan.paybackYears ?? 0)) : Number.POSITIVE_INFINITY;
  const data = plan.cashflow
    .filter((row) => row.year <= horizon)
    .map((row) => ({
      year: row.year,
      annual: row.year === 0 ? row.annualEur : Math.max(row.annualEur, 0),
      capex: row.year === 0 ? row.annualEur : 0,
      cumulative: row.cumulativeEur,
    }));
  const maxYear = data[data.length - 1]?.year ?? 0;
  const payback = plan.paybackYears;
  const label = `${language === "de" ? "Amortisation" : "Payback"} ${formatYears(payback, language)} a`;
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const labelWidthPx = label.length * 7.2 + 16;
  const domainMax = paybackDomainMax(maxYear, payback, Math.max(plotWidth - 64 - 8, 0), labelWidthPx);
  useEffect(() => {
    const node = plotRef.current;
    if (!node) {
      return;
    }
    const measure = () => setPlotWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={plotRef} className="mt-3 h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...grid} />
          <XAxis dataKey="year" type="number" domain={[0, domainMax]} allowDecimals={false} {...axis} />
          <YAxis {...axis} width={64} />
          <Tooltip {...tooltip} />
          <Bar dataKey="capex" fill={cssVar("muted-foreground", 0.5)} {...common.bar} />
          <Bar dataKey="annual" fill={series.discharge.fill} {...common.bar} />
          <Line dataKey="cumulative" {...common.line} stroke={cssVar("foreground")} strokeWidth={2} dot={false} />
          {payback != null && payback >= 0 && payback <= maxYear ? (
            <ReferenceLine
              x={payback}
              stroke={cssVar("foreground")}
              strokeDasharray="3 3"
              label={(props: { viewBox?: { x?: number; y?: number; height?: number } }) => <PaybackLabel viewBox={props.viewBox} value={label} plotWidth={plotWidth} />}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
