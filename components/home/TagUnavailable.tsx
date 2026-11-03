import Link from "next/link";

import { formatQuantity } from "@/lib/formatQuantity";
import { formatBerlinDayLabel, weekdayShort } from "@/lib/dayRingStory";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

export function TagUnavailable({
  requested,
  todayKey,
  status,
  record,
}: {
  requested: string;
  todayKey: string;
  status: "ausserhalb" | "unvollstaendig" | "vorlauf";
  record?: TagesKennzahlRecord | null;
}) {
  const label = `${weekdayShort(requested, "de")}, ${formatBerlinDayLabel(requested)}`;
  const message =
    status === "vorlauf" || status === "ausserhalb"
      ? "Für diesen Tag fehlt der Vergleich mit 30 Vortagen."
      : `Für ${label} sind die Netzdaten noch unvollständig.`;

  return (
    <div className="v4-start v4-content py-16">
      <p className="v4-kicker num">Tag</p>
      <h1 className="v4-h1">{message}</h1>
      {record ? (
        <dl className="v4-tag-measured num">
          <div>
            <dt>Überschuss</dt>
            <dd>{formatQuantity(record.surplusGwh, "de", 1)} GWh</dd>
          </div>
          <div>
            <dt>Abendspitze</dt>
            <dd>
              {formatQuantity(record.eveningPeakGw ?? 0, "de", 1)} GW
              {record.eveningPeakAt ? ` · ${record.eveningPeakAt} Uhr` : ""}
            </dd>
          </div>
          {record.pmin != null && record.pmax != null ? (
            <div>
              <dt>Börsenpreis</dt>
              <dd>
                {formatQuantity(record.pmin, "de", 0)}–{formatQuantity(record.pmax, "de", 0)} €/MWh
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="v4-subline mt-6">
        {status === "ausserhalb"
          ? `${label} liegt außerhalb des wählbaren Fensters (etwa 30 Tage bis ${formatBerlinDayLabel(todayKey)}).`
          : null}
      </p>
      <p className="mt-8">
        <Link href="/" className="v4-text-link">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}
