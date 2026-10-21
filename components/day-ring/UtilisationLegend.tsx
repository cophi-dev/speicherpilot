import { UTILISATION_STOPS } from "@/lib/dayRingScale";
import type { AppLanguage } from "@/components/language-context";

const LABELS = [-15, 0, 35, 60, 80, 90, 100, 130];

export function UtilisationLegend({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="day-legend">
      <p className="day-legend-title">{tx("Auslastung des Anschlusses", "Connection utilisation")}</p>
      <ul className="day-legend-scale" aria-hidden="true">
        {UTILISATION_STOPS.map((stop, index) => (
          <li key={stop.ratio}>
            <span className="day-swatch" style={{ background: stop.color }} />
            <span className="num">{LABELS[index]}%</span>
          </li>
        ))}
      </ul>
      <ul className="day-legend-keys">
        <li>
          <span className="day-limit-key" aria-hidden="true" />
          {tx("Anschlussgrenze", "Connection limit")}
        </li>
        <li>
          <span className="day-swatch day-swatch-charge" aria-hidden="true" />
          {tx("vom Speicher gedeckt", "covered by storage")}
        </li>
      </ul>
    </div>
  );
}
