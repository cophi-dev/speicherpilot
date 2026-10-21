"use client";

import { GlossaryTip } from "@/components/GlossaryTip";
import { StoragePoster } from "@/components/live/StorageMultiples";
import type { MoreStorageReport } from "@/lib/moreStorage";

export function MoreStorageModule({ storage, language }: { storage: MoreStorageReport; language: "de" | "en" }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);

  if (!storage.available) {
    return (
      <article className="rounded-md border border-border bg-card p-4 md:p-5" aria-labelledby="more-storage-title">
        <h2 id="more-storage-title" className="text-xl font-medium">
          {tx("Was wäre mit mehr Speicher?", "What if there were more storage?")}
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
          {storage.reason === "no-fleet"
            ? tx(
                "Die Reihe der großen Batteriespeicher ist gerade nicht erreichbar. Ohne den Bestand steht hier keine Schätzung.",
                "The large-battery series is not reachable just now. Without the fleet there is no estimate here."
              )
            : tx(
                "In den letzten Wochen liegt kein Tag vor, an dem Wind plus Sonne über der Last lag. Ohne Überschuss steht hier keine Grafik.",
                "The last few weeks have no day when wind plus solar exceeded load. Without surplus there is no chart here."
              )}
        </p>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-md border border-border" aria-labelledby="more-storage-title">
      <div className="bg-card px-4 pt-4 md:px-6 md:pt-5">
        <p id="more-storage-residual" className="max-w-[68ch] text-sm">
          {language === "de" ? (
            <>
              Die Kurve ist die Residuallast <GlossaryTip id="residuallast" language={language} />: was andere Kraftwerke
              und Import liefern müssen, wenn Wind und Sonne von der Last abgezogen sind.
            </>
          ) : (
            <>
              The curve is residual load <GlossaryTip id="residuallast" language={language} />: what other plants and
              imports have to supply once wind and solar are taken off the load.
            </>
          )}
        </p>
      </div>
      <StoragePoster storage={storage} language={language} variant="page" />
      <div className="bg-card p-4 md:px-6 md:pb-5">
        <p id="more-storage-sentence" className="max-w-[68ch] text-sm text-muted-foreground">
          {language === "de" ? storage.sentence.de : storage.sentence.en}{" "}
          <GlossaryTip id="modellschaetzung" language={language} />
        </p>
        {storage.footnote ? (
          <p className="mt-3 max-w-[68ch] text-sm text-muted-foreground">
            {language === "de" ? storage.footnote.de : storage.footnote.en}{" "}
            {storage.fleet ? (
              <a className="underline underline-offset-[3px]" href={storage.fleet.chartUrl}>
                {storage.fleet.source === "battery-charts" ? "Battery Charts" : "Energy-Charts"}
              </a>
            ) : null}
            {" · "}
            <a className="underline underline-offset-[3px]" href="https://api.energy-charts.info/total_power?country=de">
              Energy-Charts
            </a>
            {" · "}
            <a className="underline underline-offset-[3px]" href="/methodik#live">
              {tx("Annahmen", "Assumptions")}
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}
