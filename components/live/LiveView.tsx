"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";

import { GlossaryTip } from "@/components/GlossaryTip";
import { DayClock } from "@/components/live/DayClock";
import { LiveLineChart } from "@/components/live/LiveCharts";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { DayClockView } from "@/lib/dayClock";
import { LIVE_SOURCE_TABLE, type LiveBoard, type LiveModule, type PriceLight } from "@/lib/liveBoard";

function copy(language: "de" | "en", text: { de: string; en: string }) {
  return language === "de" ? text.de : text.en;
}

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

export function LiveView({ board, clock }: { board: LiveBoard; clock: DayClockView | null }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const posterRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const lead = copy(language, board.lead);

  async function savePng() {
    const node = posterRef.current;
    if (!node || busy) return;
    setBusy(true);
    const previousLeft = node.style.left;
    const previousZ = node.style.zIndex;
    // Chrome does not paint a fixed node parked off the left edge, so the
    // share image comes out empty. Park it on the canvas, behind the page.
    node.style.left = "0px";
    node.style.zIndex = "-1";
    try {
      const url = await toPng(node, { cacheBust: true, pixelRatio: 1, backgroundColor: "#F4F1EA", width: 1600, height: 900 });
      const link = document.createElement("a");
      link.href = url;
      link.download = `speicherpilot-live-${board.berlinDateKey}.png`;
      link.click();
    } finally {
      node.style.left = previousLeft;
      node.style.zIndex = previousZ;
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Live", "Live")}</p>
      <h1 className="mt-2 max-w-[18ch] text-[32px] leading-tight font-medium md:text-[44px]">{tx("Was heute los ist", "What is happening today")}</h1>
      <p className="mt-4 max-w-[68ch] text-lg">{lead}</p>
      {clock ? <DayClock clock={clock} /> : null}
      {board.lead.de === board.modules.find((entry) => entry.id === "price")?.takeaway.de && board.priceLight && board.priceLightLabel ? (
        <p className={`num mt-3 text-[12px] tracking-[0.08em] uppercase ${lightTone(board.priceLight)}`}>
          <span aria-hidden="true">{lightMark(board.priceLight)} </span>
          {copy(language, board.priceLightLabel)}
          <span className="text-muted-foreground"> · {tx("Keine Handelsempfehlung", "Not trading advice")}</span>
        </p>
      ) : null}
      <button
        type="button"
        className="mt-5 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        onClick={() => void savePng()}
        disabled={busy}
      >
        {busy ? tx("Bild wird gebaut", "Building image") : tx("Bild für einen Post", "Image for a post")}
      </button>

      <div className="mt-8 flex flex-col gap-6">
        {board.modules.map((item) => (
          <ModuleCard key={item.id} item={item} board={board} language={language} />
        ))}
      </div>

      <section className="mt-10" aria-labelledby="live-sources">
        <h2 id="live-sources" className="text-xl font-medium">{tx("Quellen", "Sources")}</h2>
        <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
          {LIVE_SOURCE_TABLE.map((row) => (
            <li key={row.module.de} className="grid gap-1 py-3 md:grid-cols-4 md:gap-4">
              <p className="font-medium">{copy(language, row.module)}</p>
              <p><span className="text-muted-foreground">{tx("Ebene", "Level")}: </span>{copy(language, row.level)}</p>
              <p><span className="text-muted-foreground">{tx("Stand", "Latency")}: </span>{copy(language, row.latency)}</p>
              <p><span className="text-muted-foreground">{tx("Lizenz", "Licence")}: </span><a className="underline underline-offset-[3px]" href={row.href}>{row.licence}</a></p>
            </li>
          ))}
        </ul>
      </section>

      <div ref={posterRef} inert aria-hidden className="pointer-events-none fixed top-0 -left-[2200px] h-[900px] w-[1600px] bg-[#F4F1EA] text-[#1A1C1E]">
        <div className="px-16 pt-16">
          <p className="text-[22px] tracking-[0.08em] text-[#5C6166] uppercase">SpeicherPilot · {board.berlinDateKey}</p>
          <p className="mt-6 max-w-[1400px] text-[40px] leading-[1.2] font-medium">{copy("de", board.lead)}</p>
          <PosterBars board={board} />
          <p className="mt-8 text-[22px] text-[#5C6166]">speicherpilot.app/live · SMARD · energy-charts.info</p>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ item, board, language }: { item: LiveModule; board: LiveBoard; language: "de" | "en" }) {
  const sentenceId = `live-${item.id}-sentence`;
  const figure = item.figure === null ? item.value : formatQuantity(item.figure, language, item.digits);
  const figureName = item.figureLabel ? copy(language, item.figureLabel) : null;
  return (
    <article className="rounded-md border border-border bg-card p-4 md:p-5">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{copy(language, item.level)}</p>
      <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-medium">
        {copy(language, item.title)}
        {item.id === "hertz" || item.id === "zones" ? <GlossaryTip id="regelzone" language={language} /> : null}
        {item.id === "offshore" ? <GlossaryTip id="wind-auf-see" language={language} /> : null}
        {item.id === "price" ? <GlossaryTip id="day-ahead-price" language={language} /> : null}
        {item.id === "price" ? <GlossaryTip id="gebotszone" language={language} /> : null}
        {item.id === "curtailment" ? <GlossaryTip id="abregelung" language={language} /> : null}
        {item.id === "germany" || item.id === "signal" ? <GlossaryTip id="deutschland-live" language={language} /> : null}
      </h2>
      {figure ? (
        <div className="mt-3">
          {figureName ? <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{figureName}</p> : null}
          <p className="num mt-1 text-[32px] leading-none">
            {figure} {item.unit ? <span className="text-base text-muted-foreground">{item.unit}</span> : null}
          </p>
        </div>
      ) : null}
      {item.id === "price" && board.priceLight && board.priceLightLabel ? (
        <p className={`num mt-2 text-[12px] tracking-[0.08em] uppercase ${lightTone(board.priceLight)}`}>
          <span aria-hidden="true">{lightMark(board.priceLight)} </span>
          {copy(language, board.priceLightLabel)}
        </p>
      ) : null}
      <p id={sentenceId} className="mt-3 max-w-[68ch] text-sm text-muted-foreground">{copy(language, item.sentence)}</p>
      {item.id === "hertz" && board.hertzChart.length > 0 ? (
        <div className="mt-4">
          <LiveLineChart
            points={board.hertzChart}
            primaryLabel={language === "de" ? "Last" : "Load"}
            secondaryLabel={language === "de" ? "Wind und Photovoltaik" : "Wind and solar"}
            unit="MW"
            describedBy={sentenceId}
            label={language === "de" ? "Regelzone 50Hertz, Last sowie Wind und Photovoltaik in Megawatt" : "50Hertz control area, load and wind plus solar in megawatts"}
          />
        </div>
      ) : null}
      {item.id === "price" && board.priceChart.length > 0 ? (
        <div className="mt-4">
          <LiveLineChart
            points={board.priceChart}
            primaryLabel={language === "de" ? "Day-Ahead-Preis" : "Day-ahead price"}
            unit="€/MWh"
            describedBy={sentenceId}
            label={language === "de" ? "Gebotszone DE-LU, Day-Ahead-Preis in Euro pro Megawattstunde" : "DE-LU bidding zone, day-ahead price in euro per megawatt-hour"}
          />
        </div>
      ) : null}
    </article>
  );
}

function PosterBars({ board }: { board: LiveBoard }) {
  const price = board.priceChart.length > 0;
  const points = price ? board.priceChart : board.hertzChart;
  if (points.length === 0) return null;
  const values = points.map((point) => point.primary);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const byHour = new Map<string, (typeof points)[number]>();
  for (const point of points) {
    const hour = point.label.slice(0, 2);
    const prev = byHour.get(hour);
    const replace = price ? !prev || point.primary < prev.primary : point.label.endsWith(":00");
    if (replace) {
      byHour.set(hour, { ...point, label: `${hour}:00` });
    }
  }
  const hours = Array.from({ length: 24 }, (_, hour) => byHour.get(String(hour).padStart(2, "0")) ?? null);
  return (
    <div className="mt-10">
      <p className="text-[22px] text-[#5C6166]">
        {price ? "Gebotszone DE-LU · Day-Ahead · €/MWh · keine Handelsempfehlung" : "Regelzone 50Hertz · Last · MW"}
      </p>
      <div className="relative mt-4 h-[220px] w-[1470px]">
        {hours.map((point, hour) => {
          const height = point ? Math.max(8, ((point.primary - min) / span) * 176) : 0;
          return (
            <div key={hour} className="absolute bottom-0" style={{ left: hour * 61, width: 52 }}>
              <div className="bg-[#0F6E6E]" style={{ height }} />
              <p className="mt-2 text-center text-[14px] text-[#5C6166]">{String(hour).padStart(2, "0")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
