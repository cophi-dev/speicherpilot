"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";

import { GlossaryTip } from "@/components/GlossaryTip";
import { LiveLineChart } from "@/components/live/LiveCharts";
import { MoreStorageModule } from "@/components/live/MoreStorageModule";
import { StoragePoster } from "@/components/live/StorageMultiples";
import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import { LIVE_SOURCE_TABLE, type LiveBoard, type LiveModule, type PriceLight } from "@/lib/liveBoard";
import type { MoreStorageReport } from "@/lib/moreStorage";

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

export function LiveView({ board, storage }: { board: LiveBoard; storage: MoreStorageReport }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const landscapeRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const lead = copy(language, board.lead);

  async function savePng(node: HTMLDivElement | null, width: number, height: number, suffix: string) {
    if (!node || busy || !storage.available) return;
    setBusy(true);
    const previousLeft = node.style.left;
    const previousZ = node.style.zIndex;
    // Chrome does not paint a fixed node parked off the left edge, so the
    // share image comes out empty. Park it on the canvas, behind the page.
    node.style.left = "0px";
    node.style.zIndex = "-1";
    try {
      const url = await toPng(node, { cacheBust: true, pixelRatio: 1, backgroundColor: "#101418", width, height });
      const link = document.createElement("a");
      link.href = url;
      link.download = `speicherpilot-mehr-speicher-${storage.dateBerlin ?? board.berlinDateKey}${suffix}.png`;
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
      {board.lead.de === board.modules.find((entry) => entry.id === "price")?.takeaway.de && board.priceLight && board.priceLightLabel ? (
        <p className={`num mt-3 text-[12px] tracking-[0.08em] uppercase ${lightTone(board.priceLight)}`}>
          <span aria-hidden="true">{lightMark(board.priceLight)} </span>
          {copy(language, board.priceLightLabel)}
          <span className="text-muted-foreground"> · {tx("Keine Handelsempfehlung", "Not trading advice")}</span>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          onClick={() => void savePng(landscapeRef.current, 1600, 900, "")}
          disabled={busy || !storage.available}
        >
          {busy ? tx("Bild wird gebaut", "Building image") : tx("Bild für einen Post", "Image for a post")}
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          onClick={() => void savePng(portraitRef.current, 1080, 1350, "-hoch")}
          disabled={busy || !storage.available}
        >
          {tx("Hochformat", "Portrait")}
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <MoreStorageModule storage={storage} language={language} />
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

      {storage.available ? (
        <>
          <div ref={landscapeRef} inert aria-hidden className="pointer-events-none fixed top-0 -left-[2400px]">
            <StoragePoster storage={storage} language="de" variant="landscape" />
          </div>
          <div ref={portraitRef} inert aria-hidden className="pointer-events-none fixed top-0 -left-[2400px]">
            <StoragePoster storage={storage} language="de" variant="portrait" />
          </div>
        </>
      ) : null}
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

