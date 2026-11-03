"use client";

import { DayRing } from "@/components/day-ring/DayRing";
import type { AppLanguage } from "@/components/language-context";
import type { LiveDispatchPoint } from "@/lib/liveFleetDispatch";

const PHASE_POINTS: LiveDispatchPoint[] = Array.from({ length: 96 }, (_, index) => {
  const hour = index / 4;
  const wave = Math.sin((hour / 24) * Math.PI * 2);
  const base = 52000 + wave * 8000;
  return {
    hour,
    ohneMw: base,
    mitMw: base * 0.92,
    chargeMw: 0,
    dischargeMw: 0,
    soc: 0.5,
  };
});

const KW_MINI: LiveDispatchPoint[] = PHASE_POINTS.map((point) => ({
  ...point,
  ohneMw: (point.ohneMw / 1000) * 0.9,
  mitMw: (point.mitMw / 1000) * 0.9,
}));

export function MethodikHeroRings({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="methodik-scales">
      <figure>
        <DayRing
          points={PHASE_POINTS}
          label={tx("Netz Deutschland", "Germany grid")}
          description={tx("Form der nationalen Uhr.", "Shape of the national clock.")}
          showShift={false}
          showHourTicks={false}
          showSoc={false}
          chargedGwh={0}
        />
        <figcaption>
          <span className="methodik-scale-long">{tx("Netz Deutschland · GW", "Germany grid · GW")}</span>
          <span className="methodik-scale-short">{tx("Netz · GW", "Grid · GW")}</span>
        </figcaption>
      </figure>
      <figure>
        <DayRing
          points={KW_MINI}
          unit="kW"
          scale="utilisation"
          limit={90}
          label={tx("Standort", "Site")}
          description={tx("Form der Standort-Uhr.", "Shape of the site clock.")}
          showShift={false}
          showHourTicks={false}
          showSoc={false}
          chargedGwh={0}
        />
        <figcaption>
          <span className="methodik-scale-long">{tx("Standort · kW", "Site · kW")}</span>
          <span className="methodik-scale-short">{tx("Standort · kW", "Site · kW")}</span>
        </figcaption>
      </figure>
    </div>
  );
}
