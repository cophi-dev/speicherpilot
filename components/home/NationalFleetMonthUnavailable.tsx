import Link from "next/link";

import { formatBerlinMonthLabel } from "@/lib/monatCalendar";
import { NATIONAL_FLEET_MONTH_KEY, fleetMonatHref } from "@/lib/nationalMonthFleetModel";

export function NationalFleetMonthUnavailable({ monthKey }: { monthKey: string }) {
  if (monthKey === NATIONAL_FLEET_MONTH_KEY) {
    return null;
  }
  return (
    <section className="v4-fleet-notice v4-content" aria-labelledby="fleet-notice-title">
      <h2 id="fleet-notice-title" className="v4-fleet-notice-h2">
        Modellflotte für {formatBerlinMonthLabel(monthKey)}
      </h2>
      <p>
        Für {formatBerlinMonthLabel(monthKey)} liegt nur die beobachtete Restlast-Dauerlinie vor (kein
        vorberechneter Flotten-Regler) — das ist kein Urteil „null Speichernutzen“. Vollständige interaktive
        Flottenläufe gibt es für{" "}
        <Link href={fleetMonatHref(NATIONAL_FLEET_MONTH_KEY, 10, "spitze")} className="v4-text-link">
          {formatBerlinMonthLabel(NATIONAL_FLEET_MONTH_KEY)}
        </Link>{" "}
        und{" "}
        <Link href={fleetMonatHref("2026-11", 10, "spitze")} className="v4-text-link">
          November 2026
        </Link>
        ; alle 12{"\u00A0"}Monate im Saisonvergleich stehen unter{" "}
        <Link href="/jahr#saison-12m" className="v4-text-link">
          Jahr
        </Link>
        .
      </p>
    </section>
  );
}
