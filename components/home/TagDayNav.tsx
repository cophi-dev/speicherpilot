"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { addBerlinCalendarDays, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";

export function TagDayNav({
  dayKey,
  lastCompleteDayKey,
}: {
  dayKey: string;
  lastCompleteDayKey: string;
}) {
  const router = useRouter();
  const minTag = addBerlinCalendarDays(lastCompleteDayKey, -30);
  const prev = prevBerlinDateKey(dayKey);
  const next = addBerlinCalendarDays(dayKey, 1);
  const canPrev = dayKey > minTag;
  const canNext = dayKey < lastCompleteDayKey;

  return (
    <nav className="v4-tag-nav v4-content" aria-label="Tag wählen">
      {canPrev ? (
        <Link href={`/tag/${prev}`} prefetch={false} className="v4-tag-nav-btn">
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
          onChange={(event) => {
            const value = event.target.value;
            if (value) {
              router.push(`/tag/${value}`);
            }
          }}
        />
        <span className="v4-tag-nav-date-label num" aria-hidden="true">
          {formatBerlinDayLabel(dayKey)}
        </span>
      </label>
      {canNext ? (
        <Link href={`/tag/${next}`} prefetch={false} className="v4-tag-nav-btn">
          Folgetag →
        </Link>
      ) : (
        <span className="v4-tag-nav-btn is-disabled" aria-disabled="true">
          Folgetag →
        </span>
      )}
    </nav>
  );
}
