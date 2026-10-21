"use client";

import Link from "next/link";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import { useLanguage } from "@/components/language-context";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";

export function MarketingHome({ dispatch, todayKey }: { dispatch: LiveDispatchInput; todayKey: string }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const fleet = dispatch.fleet;
  const stand = fleet ? (language === "de" ? fleet.updatedLabel.de : fleet.updatedLabel.en) : null;

  return (
    <div>
      <HomeRing dispatch={dispatch} todayKey={todayKey} />
      <ConnectionStory />
      <footer className="border-t border-border py-8 text-sm">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 md:px-8">
          <p>
            {tx(
              "Daten: Energy-Charts (Fraunhofer ISE), Last, Wind und Sonne, CC BY 4.0.",
              "Data: Energy-Charts (Fraunhofer ISE), load, wind and solar, CC BY 4.0."
            )}
            {fleet && stand
              ? tx(` Großspeicher (${fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts"}, Stand ${stand}).`, ` Large storage (${fleet.source === "battery-charts" ? "battery-charts.de" : "Energy-Charts"}, as of ${stand}).`)
              : null}
          </p>
          <p>
            <Link className="underline underline-offset-[3px]" href="/methodik">
              {tx("Methodik", "Method")}
            </Link>
            <span> · {tx("Modell, keine Messung und keine Euro-Zahl.", "A model, not a measurement and not a euro figure.")}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
