"use client";

import { useLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import type { StripReading } from "@/lib/liveStrip";

const COPY: Record<StripReading["id"], { de: string; en: string; noteDe: string; noteEn: string }> = {
  load: { de: "Last", en: "Load", noteDe: "etwa 70 Minuten", noteEn: "about 70 minutes" },
  wind: { de: "Wind", en: "Wind", noteDe: "etwa 85 Minuten", noteEn: "about 85 minutes" },
  solar: { de: "Sonne", en: "Solar", noteDe: "etwa 85 Minuten", noteEn: "about 85 minutes" },
  residual: { de: "Residuallast", en: "Residual load", noteDe: "Last minus Wind minus Sonne", noteEn: "load minus wind minus solar" },
  renewableShare: { de: "Anteil Erneuerbare", en: "Renewable share", noteDe: "veröffentlichter Anteil", noteEn: "published share" },
  price: { de: "Day-Ahead-Preis", en: "Day-ahead price", noteDe: "diese Viertelstunde, Marktpreis", noteEn: "this quarter-hour, market price" },
  frequency: { de: "Netzfrequenz", en: "Grid frequency", noteDe: "Messung Freiburg, etwa 30 Minuten", noteEn: "Freiburg measurement, about 30 minutes" },
};

function shown(reading: StripReading, language: "de" | "en"): string {
  if (reading.value === null || !Number.isFinite(reading.value)) {
    return language === "de" ? "nicht veröffentlicht" : "not published";
  }
  if (reading.unit === "GW") {
    return `${formatQuantity(reading.value, language, 1)} GW`;
  }
  if (reading.unit === "%") {
    return `${formatQuantity(reading.value, language, 1)} %`;
  }
  if (reading.unit === "Hz") {
    return `${formatQuantity(reading.value, language, 3)} Hz`;
  }
  return `${formatQuantity(reading.value, language, 1)} €/MWh`;
}

export function LiveStrip({ stand, readings }: { stand: string; readings: StripReading[] }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <section className="live-strip" aria-label={tx(`Stand ${stand}`, `As of ${stand}`)}>
      <p className="live-strip-stand">
        {tx("Stand", "As of")} <time>{stand}</time>
      </p>
      <dl>
        {readings.map((reading) => {
          const copy = COPY[reading.id];
          const note = language === "de" ? copy.noteDe : copy.noteEn;
          return (
            <div key={reading.id}>
              <dt>{language === "de" ? copy.de : copy.en}</dt>
              <dd className="live-strip-value">{shown(reading, language)}</dd>
              <dd className="live-strip-meta">
                {reading.time ? <time>{reading.time}</time> : null}
                {reading.time ? " · " : null}
                {note}
                {reading.id === "frequency" ? tx(". Kein Wert eines Netzbetreibers.", ". Not a grid-operator value.") : null}
                {reading.provisional ? <span className="live-stale">{tx(" vorläufig, Erzeugung fehlt", " provisional, generation missing")}</span> : null}
                {reading.stale ? <span className="live-stale">{tx(" zuletzt gültig", " last valid")}</span> : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
