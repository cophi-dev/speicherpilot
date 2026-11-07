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
        Für diesen Monat liegt noch keine vorberechnete Modellrechnung vor (nur Beobachtung unten). Vergleichbare
        Monatsläufe gibt es derzeit für{" "}
        <Link href={fleetMonatHref(NATIONAL_FLEET_MONTH_KEY, 1, "ueberschuss")} className="v4-text-link">
          {formatBerlinMonthLabel(NATIONAL_FLEET_MONTH_KEY)}
        </Link>
        .
      </p>
    </section>
  );
}
