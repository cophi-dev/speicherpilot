"use client";

import Link from "next/link";

import { GlossaryTip } from "@/components/GlossaryTip";
import { useLanguage } from "@/components/language-context";
import { DayClock, PeakChart, PriceBarcode, StorageChart, ZoneMirror } from "@/components/notizen/charts";
import { formatQuantity } from "@/lib/formatQuantity";
import { hourClock, type NetzbriefIssue } from "@/lib/netzbrief";

export function NotizenIssue({ issue }: { issue: NetzbriefIssue }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const statement = language === "de" ? issue.statement.de : issue.statement.en;
  const lastHour = issue.clock?.slots[issue.clock.slots.length - 1]?.hour;

  return (
    <article className="mx-auto w-full max-w-[980px] px-5 py-10 md:px-8">
      <p className="num text-[12px] tracking-[0.12em] text-muted-foreground uppercase">{issue.frame}</p>
      <h1 className="mt-4 text-[32px] font-medium leading-[1.15] md:text-[44px]">{statement}</h1>
      <p className="num mt-4 text-[13px] text-muted-foreground">
        {tx("Datenstand", "Data as of")} {language === "de" ? issue.dateLabel.de : issue.dateLabel.en}
        {issue.clock?.partial && lastHour !== undefined ? ` · ${tx("Reihe bis", "series through")} ${hourClock(lastHour)}` : ""}
      </p>
      {issue.estimate ? (
        <p className="mt-4 inline-flex rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-sm text-foreground">
          {language === "de" ? issue.estimate.de : issue.estimate.en}
        </p>
      ) : null}

      {issue.clock ? (
        <div className="mt-8">
          <DayClock clock={issue.clock} language={language} label={statement} />
          <p className="mt-2 text-center text-sm text-muted-foreground">{tx("Wind und Sonne, flächentreu. Der Ring ist 20 und 40 GW.", "Wind and solar, area-true. The rings are 20 and 40 GW.")}</p>
        </div>
      ) : null}

      {issue.prices ? (
        <section className="mt-10 border-t border-border pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium">{tx("Preis-Herzschlag", "Price pulse")}</h2>
            <GlossaryTip id="day-ahead-price" language={language} />
            <GlossaryTip id="gebotszone" language={language} />
          </div>
          <p className="mt-2 max-w-[62ch] text-muted-foreground">
            {tx(
              `Die günstigsten Stunden liegen um ${hourClock(issue.prices.minHour)} Uhr, die höchsten Preise um ${hourClock(issue.prices.maxHour)} Uhr.`,
              `The lowest-priced hours are at ${hourClock(issue.prices.minHour)}, the highest prices at ${hourClock(issue.prices.maxHour)}.`
            )}
          </p>
          <div className="mt-4">
            <PriceBarcode prices={issue.prices} language={language} />
          </div>
        </section>
      ) : null}

      {issue.storage ? (
        <section className="mt-8">
          <p className="flex flex-wrap items-center gap-2 text-[15px]">
            {tx("Residuallast = was Kraftwerke und Import liefern müssen.", "Residual load = what power plants and imports have to supply.")}
            <GlossaryTip id="residuallast" language={language} />
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-md border border-border p-4">
              <span className="num text-[28px]">{formatQuantity(Math.round(issue.storage.storedShare * 100), language, 0)} %</span>
              <span className="mt-1 block text-sm text-muted-foreground">{tx("vom Überschuss gespeichert", "of the surplus stored")}</span>
            </p>
            <p className="rounded-md border border-border p-4">
              <span className="num text-[28px]">
                {issue.storage.peakReductionGw === null ? "—" : `−${formatQuantity(issue.storage.peakReductionGw, language, 1)} GW`}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{tx("Abendspitze", "Evening peak")}</span>
            </p>
          </div>
          <div className="mt-4">
            <StorageChart storage={issue.storage} language={language} label={statement} />
          </div>
          <p className="num mt-3 text-[12px] text-muted-foreground">{language === "de" ? issue.storage.model.de : issue.storage.model.en}</p>
        </section>
      ) : null}

      {issue.zones ? (
        <div className="mt-8">
          <ZoneMirror zones={issue.zones} language={language} label={statement} />
        </div>
      ) : null}

      {issue.peak ? (
        <div className="mt-8">
          <PeakChart peak={issue.peak} language={language} label={statement} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a className="underline underline-offset-[3px]" href={`/notizen/${issue.nr}/csv`}>
          {tx("CSV", "CSV")}
        </a>
        <a className="underline underline-offset-[3px]" href={`/notizen/${issue.nr}/bild/quer`}>
          {tx("Querformat", "Landscape")}
        </a>
        <a className="underline underline-offset-[3px]" href={`/notizen/${issue.nr}/bild/hoch`}>
          {tx("Hochformat", "Portrait")}
        </a>
        <Link className="underline underline-offset-[3px]" href="/methodik#netzbrief">
          {tx("Methodik", "Method")}
        </Link>
        <Link className="underline underline-offset-[3px]" href="/notizen">
          {tx("Archiv", "Archive")}
        </Link>
      </div>
      <footer className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
        <p>{language === "de" ? issue.source.de : issue.source.en}</p>
        <p className="num mt-1 text-[12px]">
          <a className="underline underline-offset-[3px]" href={issue.sourceHref} {...(issue.sourceHref.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
            {issue.licence}
          </a>
        </p>
      </footer>
    </article>
  );
}
