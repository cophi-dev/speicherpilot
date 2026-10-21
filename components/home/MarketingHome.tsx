"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HeuteHero } from "@/components/home/HeuteHero";
import { useLanguage } from "@/components/language-context";
import type { HeuteImNetz } from "@/lib/heuteImNetz";

export function MarketingHome({ heute }: { heute: HeuteImNetz }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);

  return (
    <div>
      <HeuteHero heute={heute} />

      <ConnectionStory />

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
              <Link href="/site?view=netz" className="mt-4 inline-block text-sm underline underline-offset-[3px]">
                {tx("Anschluss ansehen", "See the connection")}
              </Link>
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
              <Link href="/site?view=projekt" className="mt-4 inline-block text-sm underline underline-offset-[3px]">
                {tx("Speicher rechnen", "Size the battery")}
              </Link>
            </article>
          </div>
        </div>
      </section>

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
            {tx("Gebaut von Phillipp Zarindast.", "Built by Phillipp Zarindast.")}
          </span>
          <a className="text-primary underline underline-offset-[3px]" href="https://github.com/cophi-dev/speicherpilot">
            {tx("Repository", "Repository")}
          </a>
        </div>
      </div>
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

