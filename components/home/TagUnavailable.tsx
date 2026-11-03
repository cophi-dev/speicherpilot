import Link from "next/link";

import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { weekdayShort } from "@/lib/dayRingStory";

export function TagUnavailable({
  requested,
  todayKey,
  status,
}: {
  requested: string;
  todayKey: string;
  status: "ausserhalb" | "unvollstaendig";
}) {
  const label = `${weekdayShort(requested, "de")}, ${formatBerlinDayLabel(requested)}`;
  const message =
    status === "ausserhalb"
      ? `Für ${label} liegen in SpeicherPilot keine Daten im wählbaren Fenster (etwa 30 Tage bis ${formatBerlinDayLabel(todayKey)}).`
      : `Für ${label} sind die Netzdaten noch unvollständig.`;

  return (
    <div className="v4-start v4-content py-16">
      <p className="v4-kicker num">Tag</p>
      <h1 className="v4-h1">Kein vollständiger Tag verfügbar</h1>
      <p className="v4-subline">{message}</p>
      <p className="mt-8">
        <Link href="/" className="v4-text-link">
          Zur Startseite
        </Link>
      </p>
    </div>
  );
}
