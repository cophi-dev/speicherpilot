import { GlossaryTip } from "@/components/GlossaryTip";
import type { AppLanguage } from "@/components/language-context";
import { COLOR_STOPS } from "@/lib/dayRingScale";

export function EnergyScaleLegend({
  language,
  residualLabel,
}: {
  language: AppLanguage;
  residualLabel: string;
}) {
  const bar = `linear-gradient(90deg, ${COLOR_STOPS.map((stop) => stop.color).join(", ")})`;
  return (
    <div className="day-legend">
      <p className="day-legend-title">
        <span>{residualLabel}</span>
        <GlossaryTip id="residuallast" language={language} />
      </p>
      <div className="day-legend-bar">
        <span>{language === "de" ? "Überschuss" : "Surplus"}</span>
        <span className="day-legend-swatch" style={{ background: bar }} />
        <span>{language === "de" ? "Spitze" : "Peak"}</span>
      </div>
    </div>
  );
}
