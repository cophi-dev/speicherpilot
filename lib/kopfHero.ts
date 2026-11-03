import { formatQuantity } from "@/lib/formatQuantity";
import type { MetricKey, ScoredMetric, TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { displayGw } from "@/lib/auffaelligkeit";

export type KopfHero = {
  value: string;
  unit: string;
  kernLabel: string;
  rankLabel: string | null;
};

function deNum(x: number, digits = 1): string {
  return formatQuantity(x, "de", digits);
}

export function barValue(record: TagesKennzahlRecord, key: MetricKey): number | null {
  switch (key) {
    case "evening_peak_gw":
      return record.eveningPeakGw;
    case "spread":
      return record.spread;
    case "pmin":
      return record.pmin;
    case "ws_share":
      return record.wsShare;
    case "surplus_gwh":
      return record.surplusGwh;
    case "full_min":
      return record.fullMin;
    default:
      return null;
  }
}

export function kopfHero(
  record: TagesKennzahlRecord,
  winner: ScoredMetric
): KopfHero | null {
  const rankLabel = `Platz ${winner.rank} von 31 Tagen`;

  switch (winner.key) {
    case "evening_peak_gw":
      if (record.eveningPeakGw === null) {
        return null;
      }
      return {
        value: displayGw(record.eveningPeakGw).replace(" GW", ""),
        unit: "GW",
        kernLabel: `Abendspitze der Residuallast · ${record.eveningPeakAt ?? "—"} Uhr`,
        rankLabel,
      };
    case "surplus_gwh":
      return {
        value: deNum(record.surplusGwh),
        unit: "GWh",
        kernLabel: "Überschuss aus Wind und Sonne",
        rankLabel,
      };
    case "spread":
      if (record.spread === null) {
        return null;
      }
      return {
        value: deNum(record.spread, 1),
        unit: "€/MWh",
        kernLabel: "Preisspanne Day-Ahead",
        rankLabel,
      };
    case "pmin":
      if (record.pmin === null) {
        return null;
      }
      return {
        value: deNum(record.pmin, 2),
        unit: "€/MWh",
        kernLabel: `Niedrigster Preis · ${record.pminAt ?? "—"} Uhr`,
        rankLabel,
      };
    case "ws_share":
      return {
        value: deNum(record.wsShare, 1),
        unit: "%",
        kernLabel: "Anteil Wind und Sonne an der Last",
        rankLabel,
      };
    case "full_min":
      if (!record.fullAt) {
        return null;
      }
      return {
        value: record.fullAt,
        unit: "Uhr",
        kernLabel: "Flotte im Modell voll",
        rankLabel,
      };
    default:
      return null;
  }
}
