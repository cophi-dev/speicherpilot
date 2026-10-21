"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { ChartLegend, DispatchChart, type DispatchPoint } from "@/components/charts/DispatchChart";
import { HomeLiveBlock } from "@/components/live/HomeLiveBlock";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { LiveBoard } from "@/lib/liveBoard";
import { illustrativeCommercialDay } from "@/lib/sitePlanner";

export function MarketingHome({ board }: { board: LiveBoard }) {
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

  return (
    <div>
      <section className="paper-grid border-b border-border py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
              {tx("Für Betriebe mit Lastspitzen", "For sites with load peaks")}
            </p>
            <h1 className="mt-5 text-[36px] leading-[1.05] font-medium tracking-[-0.02em] md:text-[56px]">
              {tx("Batteriespeicher & Netzanschluss planen.", "Plan battery storage and the grid connection.")}
            </h1>
            <p className="num mt-3.5 text-[15px] text-muted-foreground">battery storage & grid connection planner</p>
            <p className="mt-6 max-w-[52ch] text-lg leading-[1.55]">
              {tx(
                "Für Gewerbe und für alle, die einen Stromanschluss prüfen: das Werkzeug zeigt, ob ein Batteriespeicher die teure Lastspitze kappt und ob der bestehende Anschluss dann reicht.",
                "For businesses and for anyone checking a power connection: the tool shows whether a battery cuts the expensive load peak and whether the connection you already have is then enough."
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
                "Kein Login · Standortrechnung bleibt im Browser · Quellen: SMARD, Energy-Charts, Netztransparenz",
                "No login · the site calculation stays in the browser · sources: SMARD, Energy-Charts, Netztransparenz"
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
                { label: tx("Last ohne Speicher", "Load without storage"), swatch: "line" },
                { label: tx("Netzbezug mit Speicher", "Grid with storage"), swatch: "line-bold" },
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

      <section className="border-b border-border py-16 md:py-20">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("In drei Schritten", "In three steps")}</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <StoryStep
              n="01"
              title={tx("Dein Betrieb hat Lastspitzen", "Your site has load peaks")}
              body={tx("An manchen Stunden zieht der Betrieb viel mehr Strom als sonst.", "In some hours the site draws much more power than usual.")}
              drawing="peak"
            />
            <StoryStep
              n="02"
              title={tx("Der Speicher schneidet sie ab", "The battery cuts them off")}
              body={tx("Er gibt in diesen Stunden Strom ab, damit die Spitze flacher wird.", "It supplies power in those hours so the peak gets flatter.")}
              drawing="cut"
            />
            <StoryStep
              n="03"
              title={tx("Du sparst Leistungspreis – oder brauchst keinen größeren Netzanschluss", "You save the demand charge — or you do not need a larger connection")}
              body={tx("Die teuerste Stunde wird kleiner. Oft reicht dann der Anschluss, den du schon hast.", "The most expensive hour gets smaller. Often the connection you already have is then enough.")}
              drawing="save"
            />
          </ol>
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">01 — {tx("Für wen", "Who for")}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="rounded-md border border-border bg-card p-6">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Stromanschluss", "Power connection")}</p>
              <h2 className="mt-2 text-[22px] leading-snug font-medium">{tx("Vermeidet ein Speicher einen größeren Anschluss?", "Does a battery avoid a larger connection?")}</h2>
              <p className="mt-2.5 text-muted-foreground">{tx("Du siehst die höchste Last, wie viele Stunden sie über der Grenze liegt, und ob der vorhandene Anschluss reicht.", "You see the highest load, how many hours it sits above the limit, and whether the connection you have is enough.")}</p>
              <div className="num mt-4 flex flex-wrap gap-2 text-[12px]">
                <Chip>{tx("Höchste Last", "Highest load")}</Chip>
                <Chip>{tx("Stunden über der Grenze", "Hours above the limit")}</Chip>
                <Chip>{tx("Anschluss", "Connection")}</Chip>
              </div>
            </article>
            <article className="rounded-md border border-border bg-card p-6">
              <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Speicher planen", "Plan storage")}</p>
              <h2 className="mt-2 text-[22px] leading-snug font-medium">{tx("Welche Größe rechnet sich?", "Which size pays back?")}</h2>
              <p className="mt-2.5 text-muted-foreground">{tx("Du siehst, wie viel Strom der Speicher halten muss, was er kostet und nach wie vielen Jahren die Ausgabe wieder drin ist.", "You see how much energy the battery must hold, what it costs, and after how many years the outlay is back.")}</p>
              <div className="num mt-4 flex flex-wrap gap-2 text-[12px]">
                <Chip>{tx("Größe", "Size")}</Chip>
                <Chip>{tx("Kosten", "Cost")}</Chip>
                <Chip>{tx("Jahre bis zur Rückzahlung", "Years to payback")}</Chip>
              </div>
            </article>
          </div>
        </div>
      </section>

      <HomeLiveBlock board={board} />

      <section className="border-b border-border py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">03 — {tx("Methodik", "Method")}</p>
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

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-[4px] border border-border px-1.5 py-0.5">{children}</span>;
}

function StoryStep({ n, title, body, drawing }: { n: string; title: string; body: string; drawing: "peak" | "cut" | "save" }) {
  return (
    <li className="rounded-md border border-border bg-card p-5">
      <StoryDrawing kind={drawing} />
      <p className="num mt-4 text-[13px] text-primary">{n}</p>
      <h2 className="mt-1 text-lg leading-snug font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </li>
  );
}

function StoryDrawing({ kind }: { kind: "peak" | "cut" | "save" }) {
  const peak = "M4 46 C 28 46, 40 44, 58 30 C 78 14, 92 8, 108 18 C 124 28, 140 46, 176 46";
  const flat = "M4 46 C 28 46, 40 44, 58 34 C 78 26, 92 26, 108 30 C 124 34, 140 46, 176 46";
  return (
    <svg viewBox="0 0 180 64" className="h-16 w-full" aria-hidden="true">
      <line x1="4" y1="40" x2="176" y2="40" stroke="currentColor" className="text-destructive" strokeDasharray="4 3" />
      {kind === "save" ? (
        <>
          <rect x="18" y="28" width="28" height="18" className="fill-primary" />
          <rect x="54" y="18" width="28" height="28" className="fill-primary opacity-80" />
          <rect x="90" y="34" width="28" height="12" className="fill-foreground opacity-80" />
        </>
      ) : (
        <path d={kind === "cut" ? flat : peak} fill="none" stroke="currentColor" className="text-foreground" strokeWidth="2" />
      )}
    </svg>
  );
}
