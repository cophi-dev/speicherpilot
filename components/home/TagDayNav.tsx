"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { addBerlinCalendarDays, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { berlinMonthKeyFromDateKey } from "@/lib/monatCalendar";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import {
  fleetMonatHref,
  fleetTagHref,
  nationalFleetMonthAvailable,
  type NationalFleetFactor,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

function tagHref(
  dayKey: string,
  fleetFactor?: NationalFleetFactor,
  fleetStrategy?: NationalFleetStrategyUi,
): string {
  if (fleetFactor && fleetStrategy && nationalFleetMonthAvailable(dayKey.slice(0, 7))) {
    return fleetTagHref(dayKey, fleetFactor, fleetStrategy);
  }
  return `/tag/${dayKey}`;
}

export function TagDayNav({
  dayKey,
  lastCompleteDayKey,
  fleetFactor,
  fleetStrategy,
}: {
  dayKey: string;
  lastCompleteDayKey: string;
  fleetFactor?: NationalFleetFactor;
  fleetStrategy?: NationalFleetStrategyUi;
}) {
  const router = useRouter();
  const minTag = addBerlinCalendarDays(lastCompleteDayKey, -30);
  const prev = prevBerlinDateKey(dayKey);
  const next = addBerlinCalendarDays(dayKey, 1);
  const canPrev = dayKey > minTag;
  const canNext = dayKey < lastCompleteDayKey;
  const monthKey = berlinMonthKeyFromDateKey(dayKey);
  const monatHref =
    fleetFactor && fleetStrategy && nationalFleetMonthAvailable(monthKey)
      ? fleetMonatHref(monthKey, fleetFactor, fleetStrategy)
      : `/monat/${monthKey}`;

  const pushTag = (value: string) => {
    if (value) {
      router.push(tagHref(value, fleetFactor, fleetStrategy));
    }
  };

  return (
    <nav className="v4-tag-nav v4-content" aria-label="Tag wählen">
      {canPrev ? (
        <Link href={tagHref(prev, fleetFactor, fleetStrategy)} prefetch={false} className="v4-tag-nav-btn">
          ← Vortag
        </Link>
      ) : (
        <span className="v4-tag-nav-btn is-disabled" aria-disabled="true">
          ← Vortag
        </span>
      )}
      <label className="v4-tag-nav-date">
        <span className="sr-only">Datum</span>
        <input
          type="date"
          className="num"
          min={minTag}
          max={lastCompleteDayKey}
          value={dayKey}
          onChange={(event) => pushTag(event.target.value)}
        />
        <span className="v4-tag-nav-date-label num" aria-hidden="true">
          {formatBerlinDayLabel(dayKey)}
        </span>
      </label>
      {canNext ? (
        <Link href={tagHref(next, fleetFactor, fleetStrategy)} prefetch={false} className="v4-tag-nav-btn">
          Folgetag →
        </Link>
      ) : (
        <span className="v4-tag-nav-btn is-disabled" aria-disabled="true">
          Folgetag →
        </span>
      )}
      <Link href={monatHref} prefetch={false} className="v4-tag-nav-btn v4-tag-nav-monat">
        Monat
      </Link>
    </nav>
  );
}
