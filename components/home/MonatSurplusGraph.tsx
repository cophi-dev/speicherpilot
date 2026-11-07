"use client";

import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import type { MonatSurplusBar } from "@/lib/monatSurplusBars";

function mobileTicks(dayCount: number): number[] {
  const picks = [1, 8, 15, 22, 29].filter((d) => d <= dayCount);
  if (picks[picks.length - 1] !== dayCount) {
    picks.push(dayCount);
  }
  return picks;
}

export function MonatSurplusGraph({
  monthKey,
  bars,
}: {
  monthKey: string;
  bars: MonatSurplusBar[];
}) {
  const withData = bars.filter((b) => b.surplusGwh !== null && !b.future);
  const surplusDays = withData.filter((b) => (b.surplusGwh ?? 0) >= 0.05);
  const maxGwh = Math.max(...withData.map((b) => Math.max(0, b.surplusGwh ?? 0)), 0.05);
  const ticks = mobileTicks(bars.length);
  const emptyMonth = withData.length > 0 && surplusDays.length === 0;

  return (
    <figure className="v4-monat-graph-wrap v4-content">
      <div className="v4-monat-chart" role="img" aria-label={`Überschuss pro Kalendertag im Monat ${monthKey}`}>
        <p className="v4-monat-chart-y-label">GWh</p>
        {emptyMonth ? (
          <p className="v4-monat-chart-empty">
            In diesem Monat hat kein geladener Tag Überschuss (Schwelle 0,05 GWh). Das ist Modellnull — nicht
            fehlende Daten.
          </p>
        ) : null}
        <div className="v4-monat-chart-plot">
          {bars.map((bar) => {
            const hasValue = bar.surplusGwh !== null && !bar.future && !bar.missing;
            const surplus = hasValue ? Math.max(0, bar.surplusGwh ?? 0) : 0;
            const tall = hasValue && surplus >= 0.05;
            const heightPct = tall ? Math.max(6, (surplus / maxGwh) * 100) : hasValue ? 4 : 0;
            const className = [
              "v4-monat-chart-bar",
              tall ? "is-surplus" : hasValue ? "is-dry" : bar.future ? "is-future" : "is-missing",
              bar.clickable ? "is-link" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const inner = (
              <span
                className={className}
                style={{ height: `${heightPct}%` }}
                title={
                  bar.future
                    ? "noch nicht"
                    : bar.missing
                      ? "fehlend"
                      : surplus < 0.05
                        ? "0 GWh Überschuss"
                        : `${formatQuantity(surplus, "de", 2)} GWh`
                }
              />
            );
            return (
              <div key={bar.dateKey} className="v4-monat-chart-slot">
                {bar.clickable ? (
                  <Link href={`/tag/${bar.dateKey}`} className="v4-monat-chart-link" aria-label={formatBerlinDayLabel(bar.dateKey)}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
        <div className="v4-monat-chart-x num" aria-hidden="true">
          {ticks.map((day) => (
            <span key={day} style={{ left: `${((day - 1) / Math.max(1, bars.length - 1)) * 100}%` }}>
              {day}
            </span>
          ))}
        </div>
        <p className="v4-monat-chart-x-title">Kalendertag</p>
      </div>
      <figcaption className="v4-monat-graph-note">
        Balken = Tagesüberschuss in der geladenen Reihe. Grau = 0 GWh, kein Balken = fehlend oder Zukunft. Tab auf
        farbige Tage springt zum Tag.
      </figcaption>
      <div className="v4-monat-graph-table-wrap">
        <table className="v4-monat-graph-table num day-sr">
          <caption>Tageswerte Monat {monthKey}</caption>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Überschuss GWh</th>
              <th scope="col">Tag</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.dateKey}>
                <td>{formatBerlinDayLabel(bar.dateKey)}</td>
                <td>
                  {bar.future
                    ? "noch nicht"
                    : bar.missing
                      ? "fehlend"
                      : bar.surplusGwh === null
                        ? "—"
                        : bar.surplusGwh < 0.05
                          ? "0"
                          : formatQuantity(bar.surplusGwh, "de", 2)}
                </td>
                <td>
                  {bar.clickable ? (
                    <Link href={`/tag/${bar.dateKey}`}>ansehen</Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
