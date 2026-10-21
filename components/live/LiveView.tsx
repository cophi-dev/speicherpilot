"use client";

import { GlossaryTip } from "@/components/GlossaryTip";
import { DayClock } from "@/components/live/DayClock";
import { LiveLineChart } from "@/components/live/LiveCharts";
import { NorthSouthChart } from "@/components/live/NorthSouthChart";
import { useLanguage } from "@/components/language-context";
import { LiveStorageWhatIf } from "@/components/sim/LiveStorageWhatIf";
import { NewsList } from "@/components/sim/NewsList";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { formatQuantity } from "@/lib/formatQuantity";
import type { DayClockView } from "@/lib/dayClock";
import { LIVE_SOURCE_TABLE, type LiveBoard, type LiveModule, type PriceLight } from "@/lib/liveBoard";

const KPI_ORDER = ["hertz", "price", "germany", "signal", "offshore"] as const;

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

export function LiveView({ board, clock, dispatch }: { board: LiveBoard; clock: DayClockView | null; dispatch: LiveDispatchInput }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const lead = copy(language, board.lead);
  const kpis = KPI_ORDER.map((id) => board.modules.find((entry) => entry.id === id && entry.figure !== null)).filter(
    (entry): entry is LiveModule => entry !== undefined
  ).slice(0, 4);
  const kpiIds = new Set(kpis.map((entry) => entry.id));
  const cards = board.modules.filter((entry) => !kpiIds.has(entry.id) || entry.id === "hertz" || entry.id === "price" || entry.id === "zones");

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">
      <LiveStorageWhatIf dispatch={dispatch} />
      <section className="mt-16" aria-labelledby="live-today">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Live", "Live")}</p>
      <h2 id="live-today" className="mt-2 max-w-[18ch] text-[32px] leading-tight font-medium md:text-[44px]">{tx("Was heute los ist", "What is happening today")}</h2>
      <p className="mt-4 max-w-[68ch] text-lg">{lead}</p>
      {clock ? <DayClock clock={clock} /> : null}
      {board.lead.de === board.modules.find((entry) => entry.id === "price")?.takeaway.de && board.priceLight && board.priceLightLabel ? (
        <p className={`num mt-3 text-[12px] tracking-[0.08em] uppercase ${lightTone(board.priceLight)}`}>
          <span aria-hidden="true">{lightMark(board.priceLight)} </span>
          {copy(language, board.priceLightLabel)}
          <span className="text-muted-foreground"> · {tx("Keine Handelsempfehlung", "Not trading advice")}</span>
        </p>
      ) : null}

      {kpis.length > 0 ? (
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((item) => {
            const figure = item.figure === null ? item.value : formatQuantity(item.figure, language, item.digits);
            return (
              <li key={item.id} className="rounded-md border border-border bg-card px-3 py-3 md:px-4">
                <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{copy(language, item.level)}</p>
                <p className="num mt-2 text-[28px] leading-none">
                  {figure}
                  {item.unit ? <span className="text-sm text-muted-foreground"> {item.unit}</span> : null}
                </p>
                {item.figureLabel ? <p className="mt-2 text-sm leading-snug">{copy(language, item.figureLabel)}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((item) => (
          <ModuleCard key={item.id} item={item} board={board} language={language} hideFigure={kpiIds.has(item.id)} wide={item.id === "zones"} />
        ))}
      </div>
      </section>

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

      <NewsList />
    </div>
  );
}

function ModuleCard({
  item,
  board,
  language,
  hideFigure,
  wide,
}: {
  item: LiveModule;
  board: LiveBoard;
  language: "de" | "en";
  hideFigure: boolean;
  wide: boolean;
}) {
  const sentenceId = `live-${item.id}-sentence`;
  const figure = item.figure === null ? item.value : formatQuantity(item.figure, language, item.digits);
  const figureName = item.figureLabel ? copy(language, item.figureLabel) : null;
  return (
    <article className={`rounded-md border border-border bg-card p-4 md:p-5 ${wide ? "md:col-span-2" : ""}`}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{copy(language, item.level)}</p>
      <h2 id={sentenceId} className="mt-1 flex flex-wrap items-center gap-2 text-lg leading-snug font-medium">
        <span>{copy(language, item.sentence)}</span>
        {item.id === "hertz" || item.id === "zones" ? <GlossaryTip id="regelzone" language={language} /> : null}
        {item.id === "offshore" ? <GlossaryTip id="wind-auf-see" language={language} /> : null}
        {item.id === "price" ? <GlossaryTip id="day-ahead-price" language={language} /> : null}
        {item.id === "price" ? <GlossaryTip id="gebotszone" language={language} /> : null}
        {item.id === "curtailment" ? <GlossaryTip id="abregelung" language={language} /> : null}
        {item.id === "germany" || item.id === "signal" ? <GlossaryTip id="deutschland-live" language={language} /> : null}
      </h2>
      {!hideFigure && figure ? (
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
      {item.id === "hertz" && board.hertzChart.length > 0 ? (
        <div className="mt-4">
          <LiveLineChart
            points={board.hertzChart}
            primaryLabel={language === "de" ? "Last" : "Load"}
            secondaryLabel={language === "de" ? "Wind und Photovoltaik" : "Wind and solar"}
            unit="MW"
            describedBy={sentenceId}
            language={language}
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
            language={language}
            label={language === "de" ? "Gebotszone DE-LU, Day-Ahead-Preis in Euro pro Megawattstunde" : "DE-LU bidding zone, day-ahead price in euro per megawatt-hour"}
          />
        </div>
      ) : null}
      {item.id === "zones" && board.zoneChart.length > 0 ? <NorthSouthChart points={board.zoneChart} language={language} /> : null}
    </article>
  );
}
