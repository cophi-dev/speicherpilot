"use client";

import Link from "next/link";

import { GlossaryTip } from "@/components/GlossaryTip";
import { LiveLineChart } from "@/components/live/LiveCharts";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { LiveBoard, PriceLight } from "@/lib/liveBoard";

function lightTone(light: PriceLight) {
  if (light === "green") return "text-success";
  if (light === "yellow") return "text-warning";
  return "text-destructive";
}

function lightMark(light: PriceLight) {
  if (light === "green") return "●";
  if (light === "yellow") return "◕";
  return "▲";
}

export function HomeLiveBlock({ board }: { board: LiveBoard }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const text = (copy: { de: string; en: string }) => (language === "de" ? copy.de : copy.en);
  const shown = ["hertz", "price", "germany"] as const;

  return (
    <section className="border-b border-border py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">02 — Live</p>
        <h2 className="mt-3 text-[32px] leading-tight font-medium">{tx("Was heute los ist", "What is happening today")}</h2>
        <p className="mt-4 max-w-[68ch] text-lg">{text(board.lead)}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {shown.map((id) => {
            const item = board.modules.find((entry) => entry.id === id);
            if (!item) return null;
            const figure = item.figure === null ? item.value : formatQuantity(item.figure, language, item.digits);
            const figureName = item.figureLabel ? text(item.figureLabel) : null;
            return (
              <article key={id} className="min-h-28 border-l-[3px] border-border bg-card px-4 py-4">
                <div className="num inline-flex items-center gap-2 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                  {text(item.level)}
                  {id === "hertz" ? <GlossaryTip id="regelzone" language={language} /> : null}
                  {id === "price" ? <GlossaryTip id="gebotszone" language={language} /> : null}
                  {id === "germany" ? <GlossaryTip id="deutschland-live" language={language} /> : null}
                </div>
                {figure ? (
                  <div className="mt-2">
                    {figureName ? <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{figureName}</p> : null}
                    <p className="num mt-1 text-[28px] leading-none">
                      {figure} {item.unit ? <span className="text-base text-muted-foreground">{item.unit}</span> : null}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm">{figureName ?? tx("Keine Zahl", "No figure")}</p>
                )}
                {id === "price" && board.priceLight && board.priceLightLabel ? (
                  <p className={`num mt-2 text-[12px] tracking-[0.08em] uppercase ${lightTone(board.priceLight)}`}>
                    <span aria-hidden="true">{lightMark(board.priceLight)} </span>
                    {text(board.priceLightLabel)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">{text(item.sentence)}</p>
              </article>
            );
          })}
        </div>
        {board.priceChart.length > 0 ? (
          <div className="mt-6 rounded-md border border-border bg-card p-4">
            <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{text(board.modules.find((item) => item.id === "price")?.level ?? { de: "Gebotszone DE-LU", en: "DE-LU bidding zone" })}</p>
            <LiveLineChart
              points={board.priceChart}
              primaryLabel={tx("Day-Ahead-Preis", "Day-ahead price")}
              unit="€/MWh"
              describedBy="home-live-lead"
              language={language}
              label={tx("Gebotszone DE-LU, Day-Ahead-Preis in Euro pro Megawattstunde", "DE-LU bidding zone, day-ahead price in euro per megawatt-hour")}
            />
          </div>
        ) : null}
        <p id="home-live-lead" className="sr-only">{text(board.lead)}</p>
        <Link href="/live" className="mt-4 inline-block text-primary underline underline-offset-[3px]">
          {tx("Zur Live-Ansicht →", "Open the live view →")}
        </Link>
      </div>
    </section>
  );
}
