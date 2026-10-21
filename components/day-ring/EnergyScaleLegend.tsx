import { GlossaryTip } from "@/components/GlossaryTip";
import type { AppLanguage } from "@/components/language-context";
import { COLOR_STOPS } from "@/lib/dayRingScale";

export function EnergyScaleLegend({
  language,
  residualLabel,
  zeroLabel,
  chargedLabel,
  dischargedLabel,
}: {
  language: AppLanguage;
  residualLabel: string;
  zeroLabel: string;
  chargedLabel: string;
  dischargedLabel: string;
}) {
  return (
    <div className="day-legend">
      <p className="day-legend-title">
        <span>{residualLabel}</span>
        <GlossaryTip id="residuallast" language={language} />
      </p>
      <ul className="day-legend-scale" aria-hidden="true">
        {COLOR_STOPS.map((stop) => (
          <li key={stop.gw}>
            <span className="day-swatch" style={{ background: stop.color }} />
            <span className="num">{stop.gw}</span>
          </li>
        ))}
      </ul>
      <ul className="day-legend-keys">
        <li>
          <span className="day-swatch day-swatch-zero" aria-hidden="true" />
          {zeroLabel}
        </li>
        <li>
          <span className="day-swatch day-swatch-charge" aria-hidden="true" />
          {chargedLabel}
        </li>
        <li>
          <span className="day-swatch day-swatch-discharge" aria-hidden="true" />
          {dischargedLabel}
        </li>
      </ul>
    </div>
  );
}
