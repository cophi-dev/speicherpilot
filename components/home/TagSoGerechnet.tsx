import Link from "next/link";

import { SoGerechnetBlock } from "@/components/home/SoGerechnetBlock";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import { tagLastSurplusLine, tagSurplusDefinitionLine } from "@/lib/kopfTagCopy";
import {
  fleetMonatHref,
  NATIONAL_FLEET_MONTH_KEY,
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetDaySlice,
  type NationalFleetFactor,
  type NationalFleetMonthStats,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";
import { formatPeakKpi } from "@/lib/nationalFleetCharts";
import { tagMiddayStoryBody } from "@/lib/tagDayStory";
import type { ResidualDay } from "@/lib/windSolarResidual";
export type TagFleetSoGerechnetExtra = {
  dayKey: string;
  factor: NationalFleetFactor;
  strategy: NationalFleetStrategyUi;
  run: NationalFleetRunSeries;
  slice: NationalFleetDaySlice;
  monthStats: NationalFleetMonthStats;
  showPeakWithoutSurplus: boolean;
};

export type TagSoGerechnetProps = {
  day: ResidualDay;
  lastSurplusKey: string | null;
  surplusLine: string;
  peakGw: number | null;
  peakAt: string | null;
  showFleetMonthBelow?: boolean;
  fleetStrategyBelow?: NationalFleetStrategyUi | null;
  priceLine: string | null;
  fleetExtra?: TagFleetSoGerechnetExtra | null;
};

const STEPS = [
  { title: "Nacht", body: "Wind liefert einen Teil der Last, Sonne fehlt. Der Rest kommt aus anderen Quellen." },
  { title: "Mittag", body: (day: ResidualDay) => tagMiddayStoryBody(day) },
  {
    title: "Abend",
    body: (peakAt: string | null, peakGw: number | null, loadGw: number, wsGw: number) =>
      peakAt && peakGw !== null
        ? `${peakAt} Uhr: ${formatQuantity(loadGw, "de", 1)} GW Verbrauch, ${formatQuantity(wsGw, "de", 1)} GW Wind und Sonne, keine Sonne in der Dämmerung. Die Lücke: ${formatQuantity(peakGw, "de", 1)} GW.`
        : "Abends fehlt die Sonne, der Verbrauch steigt. Die Lücke ist am größten.",
  },
] as const;

function eveningSlot(day: ResidualDay) {
  const evening = day.slots.filter((s) => s.hourBerlin >= 16);
  if (evening.length === 0) {
    return day.slots[0];
  }
  let best = evening[0];
  let bestGap = -1;
  for (const s of evening) {
    const gap = s.loadMw - s.windMw - s.solarMw;
    if (gap > bestGap) {
      bestGap = gap;
      best = s;
    }
  }
  return best;
}

export function TagSoGerechnet({
  day,
  lastSurplusKey,
  surplusLine,
  peakGw,
  peakAt,
  showFleetMonthBelow,
  fleetStrategyBelow,
  priceLine,
  fleetExtra,
}: TagSoGerechnetProps) {
  const peakSlot = eveningSlot(day);
  const loadGw = peakSlot.loadMw / 1000;
  const wsGw = (peakSlot.windMw + peakSlot.solarMw) / 1000;
  const lastLine = tagLastSurplusLine(lastSurplusKey);

  const rows =
    fleetExtra?.slice.indices.map((i) => ({
      ts: fleetExtra.run.timestamp_berlin[i]!,
      r: fleetExtra.run.r_mw[i]!,
      rp: fleetExtra.run.r_prime_mw[i]!,
      c: fleetExtra.run.c_mw[i]!,
      d: fleetExtra.run.d_mw[i]!,
      e0: fleetExtra.run.e_start_mwh[i]!,
    })) ?? [];

  return (
    <SoGerechnetBlock>
      <div className="v4-so-gerechnet-section">
        <p className="v4-so-gerechnet-kicker num">01 · Der Tag</p>
        <p>{surplusLine}</p>
        <p>{tagSurplusDefinitionLine()}</p>
        {lastLine ? <p>{lastLine}</p> : null}
        <ol className="v4-st-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="v4-st-num num">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="v4-st-title">{step.title}</p>
                <p className="v4-st-body">
                  {typeof step.body === "function"
                    ? step.title === "Mittag"
                      ? step.body(day)
                      : step.body(peakAt, peakGw, loadGw, wsGw)
                    : step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="v4-so-gerechnet-section">
        <p className="v4-so-gerechnet-kicker num">02 · Das System</p>
        <p>
          Nennenergie bezeichnet die Größenordnung der Referenzflotte in der ×1-Skala — keine verfügbare
          Ladeenergie an diesem Tag.
        </p>
        {priceLine ? <p>Börsenpreis Day-Ahead: {priceLine}</p> : null}
        {showFleetMonthBelow && fleetStrategyBelow && fleetStrategyBelow !== "ueberschuss" ? (
          <p>
            Monatslauf unten (
            {fleetStrategyBelow === "spitze" ? "Spitze senken" : "Marktorientiert"}, Price Taker nur Marktfahrweise)
            rechnet Netzladung getrennt vom Überschuss-Modell.
          </p>
        ) : null}
        <p>
          Annahmen und Quellen:{" "}
          <Link href="/methodik#auffaelligkeit" className="v4-text-link">
            Methodik
          </Link>
          .
        </p>
      </div>

      {fleetExtra ? (
        <div className="v4-so-gerechnet-section">
          <p className="v4-so-gerechnet-kicker num">Monatslauf · {formatBerlinDayLabel(fleetExtra.dayKey)}</p>
          <p>
            Monatslauf-Ausschnitt — hypothetisch, ohne Tages-Reset. Aus Überschuss ist an diesem Tag nichts zu
            laden, wenn max(0, Wind+Sonne−Last) durchgehend null ist.{" "}
            <Link href={fleetMonatHref(NATIONAL_FLEET_MONTH_KEY, fleetExtra.factor, fleetExtra.strategy)} className="v4-text-link">
              Zum Monatsmodell
            </Link>
            .
          </p>
          {fleetExtra.showPeakWithoutSurplus ? (
            <p>
              <strong>Ohne Wind-Solar-Überschuss:</strong> „{NATIONAL_FLEET_STRATEGY_UI[fleetExtra.strategy].shortDe}“ nutzt
              Netzladung und senkt die Tages-Spitze im Modell.
            </p>
          ) : null}
          <dl className="v4-fleet-kpis num">
            <div>
              <dt>Wind-Solar-Überschuss (Tag, integriert)</dt>
              <dd>
                {fleetExtra.slice.positiveSurplusQuarterHours === 0
                  ? "0 GWh (keine positive Viertelstunde)"
                  : `${formatQuantity(fleetExtra.slice.windSolarSurplusMwh / 1000, "de", 2)} GWh in ${fleetExtra.slice.positiveSurplusQuarterHours} Viertelstunden`}
              </dd>
            </div>
            <div>
              <dt>Netz-Ladung / -Abgabe (Tag)</dt>
              <dd>
                {formatQuantity(fleetExtra.slice.chargeMwh / 1000, "de", 2)} /{" "}
                {formatQuantity(fleetExtra.slice.dischargeMwh / 1000, "de", 2)} GWh
              </dd>
            </div>
            <div>
              <dt>Monatskontext Spitze</dt>
              <dd>
                {formatPeakKpi(
                  fleetExtra.monthStats.peakAfterGw,
                  fleetExtra.monthStats.peakReductionGw,
                  fleetExtra.monthStats.peakReductionPct,
                )}
              </dd>
            </div>
          </dl>
          <div className="v4-fleet-day-table-scroll">
            <table className="v4-fleet-day-table num">
              <caption>Viertelstunden am {formatBerlinDayLabel(fleetExtra.dayKey)}</caption>
              <thead>
                <tr>
                  <th scope="col">Zeit</th>
                  <th scope="col">Restlast GW</th>
                  <th scope="col">mit Speicher GW</th>
                  <th scope="col">Laden MW</th>
                  <th scope="col">Entladen MW</th>
                  <th scope="col">SoC Start MWh</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.ts}>
                    <td>{row.ts.slice(11, 16)}</td>
                    <td>{formatQuantity(row.r / 1000, "de", 2)}</td>
                    <td>{formatQuantity(row.rp / 1000, "de", 2)}</td>
                    <td>{row.c > 0.0005 ? formatQuantity(row.c, "de", 1) : "—"}</td>
                    <td>{row.d > 0.0005 ? formatQuantity(row.d, "de", 1) : "—"}</td>
                    <td>{formatQuantity(row.e0, "de", 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </SoGerechnetBlock>
  );
}
