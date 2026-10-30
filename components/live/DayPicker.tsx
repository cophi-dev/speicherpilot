"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useLanguage } from "@/components/language-context";
import { addBerlinCalendarDays, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewsBundle } from "@/lib/germanyView";
import { SURPLUS_DAY_GWH } from "@/lib/powerMix";
import { weekdayShort } from "@/lib/dayRingStory";

function formatBerlinLong(dateKey: string, todayKey: string, language: "de" | "en") {
  if (dateKey === todayKey) {
    return language === "de" ? "Heute" : "Today";
  }
  const [year, month, day] = dateKey.split("-");
  if (language === "de") {
    const months = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    return `${weekdayShort(dateKey, language)}, ${Number(day)}. ${months[Number(month) - 1] ?? month} ${year}`;
  }
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function DayPicker({
  todayKey,
  selectedTag,
  overviews,
}: {
  todayKey: string;
  selectedTag: string | null;
  overviews: OverviewsBundle | null;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const activeTag = selectedTag ?? todayKey;
  const minTag = addBerlinCalendarDays(todayKey, -30);
  const prev = prevBerlinDateKey(activeTag);
  const next = addBerlinCalendarDays(activeTag, 1);
  const canPrev = activeTag > minTag;
  const canNext = activeTag < todayKey;

  const chips = useMemo(() => {
    const rows = overviews?.byBlick["30tage"].factors[1].dayRows ?? [];
    return rows
      .filter((row) => row.surplusGwh >= SURPLUS_DAY_GWH)
      .map((row) => ({
        tag: row.dateBerlin,
        label: `${weekdayShort(row.dateBerlin, language)} ${row.dateBerlin.slice(8, 10)}.${row.dateBerlin.slice(5, 7)}`,
        gwh: row.surplusGwh,
      }));
  }, [overviews, language]);

  return (
    <div className="day-picker mx-auto max-w-[1200px] px-4 pt-4">
      <div className="day-picker-nav">
        {canPrev ? (
          <Link href={`/live?tag=${prev}`} prefetch={false} className="day-picker-btn">
            {tx("← Vortag", "← Previous day")}
          </Link>
        ) : (
          <span className="day-picker-btn is-disabled">{tx("← Vortag", "← Previous day")}</span>
        )}
        <label className="day-picker-date">
          <span className="sr-only">{tx("Datum", "Date")}</span>
          <input
            type="date"
            min={minTag}
            max={todayKey}
            value={activeTag}
            onChange={(event) => {
              const value = event.target.value;
              if (value) {
                window.location.href = `/live?tag=${value}`;
              }
            }}
          />
        </label>
        {canNext ? (
          <Link href={`/live?tag=${next}`} prefetch={false} className="day-picker-btn">
            {tx("Folgetag →", "Next day →")}
          </Link>
        ) : (
          <span className="day-picker-btn is-disabled">{tx("Folgetag →", "Next day →")}</span>
        )}
      </div>
      {chips.length > 0 ? (
        <div className="day-picker-chips" aria-label={tx("Tage mit Überschuss", "Days with surplus")}>
          {chips.map((chip) => (
            <Link
              key={chip.tag}
              href={`/live?tag=${chip.tag}`}
              prefetch={false}
              className={chip.tag === activeTag ? "on" : undefined}
            >
              {chip.label} · {formatQuantity(chip.gwh, language, 0)} GWh
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function dayPageHeading(dateKey: string, todayKey: string, language: "de" | "en", until: string | null) {
  if (dateKey === todayKey) {
    return until
      ? language === "de"
        ? `Heute, ${formatHeadingDate(dateKey, language)} · bisher bis ${until} Uhr`
        : `Today, ${formatHeadingDate(dateKey, language)} · so far until ${until}`
      : language === "de"
        ? `Heute, ${formatHeadingDate(dateKey, language)}`
        : `Today, ${formatHeadingDate(dateKey, language)}`;
  }
  return formatBerlinLong(dateKey, todayKey, language);
}

function formatHeadingDate(dateKey: string, language: "de" | "en") {
  const [year, month, day] = dateKey.split("-");
  if (language === "de") {
    const months = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    return `${Number(day)}. ${months[Number(month) - 1] ?? month} ${year}`;
  }
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
