"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AppLanguage } from "@/components/language-context";
import { DispatchDayChart, niceChartScale, type ChartSample } from "@/components/sim/DispatchDayChart";
import { utilisationColor } from "@/lib/dayRingScale";
import type { Perspective } from "@/lib/perspective";
import type { SiteConnectionStory } from "@/lib/siteConnectionDay";

export function SiteSimulator({
  view,
  story,
  language,
}: {
  view: Perspective;
  story: SiteConnectionStory;
  language: AppLanguage;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hour, setHour] = useState(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (!playing || reduced) {
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = ((now - started) / 8000) % 1;
      setHour(progress * 24);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reduced]);

  const samples: ChartSample[] = useMemo(
    () => story.points.map((point) => ({
      hour: point.hour,
      ohne: point.ohneKw,
      mit: point.mitKw,
      charge: point.chargeKw,
      discharge: point.dischargeKw,
      soc: point.soc,
    })),
    [story]
  );
  const scale = useMemo(() => {
    const values = [0, story.limitKw];
    for (const point of story.points) {
      values.push(point.ohneKw, point.mitKw);
    }
    return niceChartScale(values);
  }, [story]);

  return (
    <section className="day-paper" aria-labelledby="site-sim-title">
      <div className="day-hero-inner">
        <p className="day-kicker">{view === "netz" ? tx("Simulator · derselbe Tag als Linie", "Simulator · the same day as a line") : tx("Simulator · Speichersicht", "Simulator · storage view")}</p>
        <h2 id="site-sim-title">
          {view === "netz"
            ? tx("Fünf Viertelstunden lang gibt der Speicher ab, genau so viel, wie über der Linie liegt.", "For five quarter-hours the battery gives back exactly what sits above the line.")
            : tx("Der Speicher wartet den Tag über und arbeitet an der Spitze.", "The battery waits through the day and works at the peak.")}
        </h2>
        <div className="site-play">
          <button type="button" className="day-cta" aria-pressed={playing} onClick={() => setPlaying((value) => !value)} disabled={reduced}>
            {playing ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
            {playing ? tx("Pause", "Pause") : tx("Abspielen", "Play")}
          </button>
          <div className="day-slider-block">
            <label className="day-slider-label" htmlFor="site-hour">{tx("Uhrzeit", "Time")}</label>
            <div className="day-slider">
              <div className="day-slider-track" aria-hidden="true" style={{ ["--fill" as string]: `${(hour / 24) * 100}%`, ["--hatch" as string]: "100%" }} />
              <input
                id="site-hour"
                type="range"
                min={0}
                max={24}
                step={0.25}
                value={hour}
                aria-valuetext={clock(hour)}
                onChange={(event) => {
                  setPlaying(false);
                  setHour(Number(event.target.value));
                }}
              />
            </div>
          </div>
          <span className="num">{clock(hour)}</span>
        </div>
        <DispatchDayChart
          samples={samples}
          unit="kW"
          y0={scale.y0}
          y1={scale.y1}
          yTicks={scale.yTicks}
          hatch={view === "netz" ? "limit" : "graphite"}
          limit={story.limitKw}
          limitLabel={view === "netz" ? tx(`Grenze ${formatLimit(story.limitKw, language)} kW`, `Limit ${formatLimit(story.limitKw, language)} kW`) : tx("Kappziel", "Shave target")}
          tipLoad={tx("Last", "Load")}
          ariaLabel={tx("Tag am Anschluss in kW", "Day at the connection in kW")}
          tag={tx("Beispieldaten", "Example data")}
          annotations={view === "projekt" ? [{ hour: 17.5, value: story.peakBeforeKw, text: tx("vom Speicher gedeckt", "covered by storage"), dy: -12 }] : []}
          chargedNote=""
          intro={false}
          language={language}
          fitLabels
          segmentColor={(value) => utilisationColor(value / story.limitKw)}
          markerHour={hour}
        />
      </div>
    </section>
  );
}

function formatLimit(value: number, language: AppLanguage) {
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 0 }).format(value);
}

function clock(hour: number): string {
  const total = Math.round(hour * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}
