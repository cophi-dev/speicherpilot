"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { ChartLegend, DispatchChart, type DispatchPoint } from "@/components/charts/DispatchChart";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { HomeBriefingInitialData } from "@/lib/homeBriefingData";
import { illustrativeCommercialDay } from "@/lib/sitePlanner";
import { liveNetPositionMw } from "@/lib/realtimeSystemSnapshot";
import { computeSlotSurplusFraction, estimateFleetSocAtMoment } from "@/lib/socEstimator";

export function MarketingHome({ initial }: { initial: HomeBriefingInitialData }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const example = useMemo(() => illustrativeCommercialDay(), []);
  const points: DispatchPoint[] = example.plan.peakDay.loadKw.map((load, index) => ({
    label: index % 4 === 0 ? String(index / 4).padStart(2, "0") : "",
    load,
    grid: example.plan.peakDay.gridKw[index] ?? load,
    bess: (example.plan.peakDay.dischargeKw[index] ?? 0) - (example.plan.peakDay.chargeKw[index] ?? 0),
    pv: 0,
  }));
  const market = initial.market;
  const generationMw = market?.realtimeSystem.domesticGenerationMw ?? null;
  const loadMw = market?.realtimeSystem.loadMw ?? null;
  const netMw = generationMw === null || loadMw === null ? null : liveNetPositionMw(generationMw, loadMw);
  const fleet = market
    ? estimateFleetSocAtMoment({
        renewableShareOfLoadPct: market.realtimeSystem.renewableShareOfLoadPct ?? null,
        solarRichDays: market.recentRenewablePatterns?.solarRichDays ?? null,
        at: new Date(market.realtimeSystem.timestampIso),
        batteryStorageMw: market.realtimeSystem.batteryStorageMw ?? null,
        installedFleetPowerMw: market.bess.installedPowerGw * 1000,
        slotSurplusFraction: computeSlotSurplusFraction(market.dayEnergyFlow?.slots ?? null),
        currentNetPositionMw: netMw,
      })
    : null;
  const livePoints: DispatchPoint[] =
    initial.initialEnergyFlow?.slots.map((slot) => ({
      label: slot.hourBerlin % 3 === 0 ? String(slot.hourBerlin).padStart(2, "0") : "",
      load: slot.loadMw * 1000,
      grid: (slot.totalGenerationMw - slot.loadMw) * 1000,
      bess: 0,
      pv: 0,
    })) ?? [];

  return (
    <div>
      <section className="paper-grid border-b border-border py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              BESS · {tx("Netzanschluss", "Grid connection")} · ¼h-{tx("Profile", "profiles")}
            </p>
            <h1 className="mt-5 text-[36px] leading-[1.05] font-medium tracking-[-0.02em] md:text-[56px]">
              {tx("Batteriespeicher & Netzanschluss planen.", "Plan battery storage and the grid connection.")}
            </h1>
            <p className="num mt-3.5 text-[15px] text-muted-foreground">battery storage & grid connection planner</p>
            <p className="mt-6 max-w-[52ch] text-lg leading-[1.55]">
              {tx(
                "Lastprofil hochladen, Anschlussgrenze setzen und in Sekunden sehen, welcher Speicher die Spitze kappt, was er verdient und ob der Anschluss reicht.",
                "Upload a load profile, set the connection limit, and see which battery cuts the peak, what it earns, and whether the connection holds."
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/site" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {tx("Standort rechnen →", "Size a site →")}
              </Link>
              <Link href="/methodik" className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                {tx("Methodik lesen", "Read the method")}
              </Link>
            </div>
            <p className="num mt-7 text-[12px] text-muted-foreground">
              {tx(
                "Kein Login · Daten bleiben im Browser · Quellen: Energy-Charts, Netztransparenz",
                "No login · data stays in the browser · sources: Energy-Charts, Netztransparenz"
              )}
            </p>
          </div>
          <div className="min-w-0 rounded-md border border-border bg-card p-4 md:p-5 lg:col-span-7">
            <div className="flex items-center justify-between gap-3">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                {tx("Beispielstandort · Gewerbe · 24 h", "Example site · commercial · 24 h")}
              </p>
              <span className="num rounded-[4px] border border-border px-2 py-0.5 text-[12px] text-muted-foreground">BEISPIELDATEN</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">
              {tx("Speicher kappt die Abendspitze unter 1.000 kW", "Storage cuts the evening peak under 1,000 kW")}
            </h2>
            <ChartLegend
              items={[
                { label: tx("Last ohne BESS", "Load without BESS"), swatch: "line" },
                { label: tx("Netzbezug mit BESS", "Grid with BESS"), swatch: "line-bold" },
                { label: tx("Entladen", "Discharge"), swatch: "teal" },
                { label: tx("Laden", "Charge"), swatch: "teal-dim" },
                { label: tx("Netzanschluss", "Connection"), swatch: "dashed" },
              ]}
            />
            <DispatchChart points={points} limitKw={1000} language={language} height={280} />
            <p className="num mt-2 text-[12px] text-muted-foreground">{example.profile.sourceNote}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
              <Mini label={tx("Spitze", "Peak")} value={`${formatQuantity(example.plan.peakImportBeforeKw, language, 0)} → ${formatQuantity(example.plan.peakImportAfterKw, language, 0)}`} unit="kW" />
              <Mini label={tx("Speicher", "Storage")} value="620 / 310" unit="kWh / kW" />
              <Mini label={tx("Überschreitung", "Exceedance")} value={`${formatQuantity(example.plan.exceedanceHoursBefore, language, 1)} → ${formatQuantity(example.plan.exceedanceHoursAfter, language, 1)}`} unit="h" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">01 — {tx("Für wen", "Who for")}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="rounded-md border border-border bg-card p-6">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Netzplanung", "Grid planning")}</p>
              <h2 className="mt-2 text-[22px] leading-snug font-medium">{tx("Vermeidet ein Speicher die Anschlusserweiterung?", "Does storage avoid a connection upgrade?")}</h2>
              <p className="mt-2.5 text-muted-foreground">{tx("Spitzenlast, Überschreitungsstunden und Jahresdauerlinie gegen die Anschlussleistung, in ¼h-Auflösung.", "Peak load, hours above the limit, and the annual duration curve against connection capacity, at 15-minute resolution.")}</p>
              <div className="num mt-4 flex flex-wrap gap-2 text-[12px]">
                <Chip>¼h-{tx("Auflösung", "resolution")}</Chip>
                <Chip>{tx("Jahresdauerlinie", "Duration curve")}</Chip>
                <Chip>{tx("Anschluss-Check", "Connection check")}</Chip>
              </div>
            </article>
            <article className="rounded-md border border-border bg-card p-6">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("BESS-Projektierung", "BESS development")}</p>
              <h2 className="mt-2 text-[22px] leading-snug font-medium">{tx("Welche Größe rechnet sich?", "Which size pays back?")}</h2>
              <p className="mt-2.5 text-muted-foreground">{tx("Leistung, Kapazität, Zyklen und Erlös aus Peak Shaving und Day-Ahead-Arbitrage.", "Power, energy, cycles, and revenue from peak shaving and day-ahead arbitrage.")}</p>
              <div className="num mt-4 flex flex-wrap gap-2 text-[12px]">
                <Chip>{tx("P95-Dimensionierung", "P95 sizing")}</Chip>
                <Chip>{tx("Arbitrage", "Arbitrage")}</Chip>
                <Chip>{tx("Amortisation", "Payback")}</Chip>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">02 — {tx("Ablauf", "Steps")}</p>
          <ol className="mt-8 grid gap-6 border-t border-border-strong pt-5 md:grid-cols-3">
            {[
              ["01", tx("Profil laden", "Load a profile"), tx("CSV (15 oder 60 min) oder Beispielprofil.", "CSV (15 or 60 min) or an example profile.")],
              ["02", tx("Grenzen setzen", "Set the limits"), tx("Anschluss kW, PV kWp, Tarif.", "Connection kW, PV kWp, tariff.")],
              ["03", tx("Ergebnis lesen", "Read the result"), tx("Größe, Peak Shaving, Arbitrage, Amortisation, Anschluss-Check.", "Size, peak shaving, arbitrage, payback, connection check.")],
            ].map(([num, title, body]) => (
              <li key={num}>
                <p className="num text-[13px] text-primary">{num}</p>
                <h3 className="mt-1.5 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">03 — Live</p>
            {market ? (
              <span className="num rounded-[4px] border border-border px-2 py-0.5 text-[12px]">
                {tx("BEOBACHTET", "OBSERVED")} · {new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(market.realtimeSystem.timestampIso))}
              </span>
            ) : null}
          </div>
          {market && generationMw !== null && loadMw !== null && netMw !== null ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Kpi label={tx("Erzeugung", "Generation")} value={formatQuantity(generationMw / 1000, language, 2)} unit="GW" />
                <Kpi label={tx("Last", "Load")} value={formatQuantity(loadMw / 1000, language, 2)} unit="GW" />
                <Kpi label={tx("Netto-Position", "Net position")} value={formatQuantity(netMw / 1000, language, 2)} unit="GW" hint={netMw >= 0 ? tx("Überschuss", "Surplus") : tx("Defizit", "Deficit")} />
                <Kpi label={tx("BESS-Flotte SoC", "BESS fleet SoC")} value={fleet ? formatQuantity(fleet.midpointPct, language, 0) : "—"} unit="%" hint={tx("Schätzung, keine Telemetrie", "Estimate, not telemetry")} />
              </div>
              {livePoints.length > 0 ? (
                <div className="mt-4 rounded-md border border-border bg-card p-4">
                  <DispatchChart points={livePoints} limitKw={0} language={language} height={240} />
                  <p className="num mt-2 text-[12px] text-muted-foreground">
                    {tx("Quelle: Energy-Charts · beobachtet", "Source: Energy-Charts · observed")} · {initial.defaultBerlinDateKey}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-4 border-l-[3px] border-limit bg-card p-4">
              <h2 className="text-lg font-semibold">{tx("Daten nicht verfügbar", "Data unavailable")}</h2>
              <p className="text-sm text-muted-foreground">{tx("Energy-Charts API antwortet nicht.", "The Energy-Charts API did not respond.")}</p>
              <Link href="/live" className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-3 text-sm">{tx("Erneut laden", "Reload")}</Link>
            </div>
          )}
          <Link href="/live" className="mt-4 inline-block text-primary underline underline-offset-[3px]">
            {tx("Zur Live-Ansicht →", "Open the live view →")}
          </Link>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">04 — {tx("Methodik", "Method")}</p>
            <h2 className="mt-4 text-[32px] leading-tight font-medium">{tx("Nachvollziehbar statt Blackbox.", "Traceable, not a black box.")}</h2>
            <p className="mt-3 max-w-[44ch] text-muted-foreground">
              {tx(
                "Jede Formel, Annahme und Datenquelle ist offen dokumentiert, inklusive der Grenzen des Modells.",
                "Every formula, assumption, and source is documented, including what the model leaves out."
              )}
            </p>
            <Link href="/methodik" className="mt-5 inline-block text-primary underline underline-offset-[3px]">
              {tx("Methodik lesen →", "Read the method →")}
            </Link>
          </div>
          <div className="overflow-hidden rounded-md border border-border bg-card lg:col-span-7">
            {[
              [tx("Auflösung", "Resolution"), "15 min"],
              ["Dispatch", tx("Peak Shaving → Day-Ahead-Arbitrage", "Peak shaving → day-ahead arbitrage")],
              [tx("Wirkungsgrad", "Efficiency"), tx("90 % RT (einstellbar)", "90% round trip (adjustable)")],
              [tx("Preise", "Prices"), tx("Synthetisches Day-Ahead, wenn kein Feed", "Synthetic day-ahead when no feed is passed")],
              [tx("Nicht enthalten", "Not included"), tx("Regelenergie, §19 StromNEV, SCADA", "Balancing energy, §19 StromNEV, SCADA")],
            ].map(([key, value], index) => (
              <div key={key} className={`grid gap-2 px-5 py-3 text-sm md:grid-cols-[180px_1fr] ${index > 0 ? "border-t border-border" : ""}`}>
                <span className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{key}</span>
                <span className="num">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="num border-b border-border py-6 text-[12px] text-muted-foreground">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 md:flex-row md:justify-between md:px-8">
          <span>
            {tx("Gebaut von Phillipp Zarindast, offen auf", "Built by Phillipp Zarindast, in public on")}{" "}
            <a className="text-primary underline underline-offset-[3px]" href="https://x.com/pphhiillliipppp">X · @pphhiillliipppp</a>
          </span>
          <a className="text-primary underline underline-offset-[3px]" href="https://github.com/cophi-dev/speicherpilot">
            {tx("Repository", "Repository")}
          </a>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="min-w-0">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className="num mt-1 text-[18px] leading-tight md:text-[20px]">
        {value}
        <span className="text-[13px] text-muted-foreground"> {unit}</span>
      </p>
    </div>
  );
}

function Kpi({ label, value, unit, hint }: { label: string; value: string; unit: string; hint?: string }) {
  return (
    <div className="min-h-28 border-l-[3px] border-border bg-card px-4 py-4">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <p className="num mt-2 text-[28px] leading-none md:text-[32px]">
        {value}
        <span className="ml-1 text-base text-muted-foreground">{unit}</span>
      </p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-[4px] border border-border px-1.5 py-0.5">{children}</span>;
}
