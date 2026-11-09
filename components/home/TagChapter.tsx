"use client";

import Link from "next/link";

import { LueckeChart } from "@/components/home/LueckeChart";
import { tagLastSurplusLine } from "@/lib/kopfTagCopy";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualDay } from "@/lib/windSolarResidual";
import { tagMiddayStoryBody } from "@/lib/tagDayStory";
import { tagSurplusDefinitionLine } from "@/lib/kopfTagCopy";

const STEPS = [
  {
    title: "Nacht",
    body: "Wind liefert einen Teil der Last, Sonne fehlt. Der Rest kommt aus anderen Quellen.",
  },
  {
    title: "Mittag",
    body: (day: ResidualDay) => tagMiddayStoryBody(day),
  },
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

export function TagChapter({
  day,
  lastSurplusKey,
  surplusLine,
  peakGw,
  peakAt,
  useTagDateHeading = false,
  showFooterLink = true,
}: {
  day: ResidualDay;
  lastSurplusKey: string | null;
  surplusLine: string;
  peakGw: number | null;
  peakAt: string | null;
  todayKey?: string;
  /** On /tag for days before „gestern“, use „Was am … passiert ist“. */
  useTagDateHeading?: boolean;
  showFooterLink?: boolean;
}) {
  const peakSlot = eveningSlot(day);
  const loadGw = peakSlot.loadMw / 1000;
  const wsGw = (peakSlot.windMw + peakSlot.solarMw) / 1000;
  const lastLine = tagLastSurplusLine(lastSurplusKey);
  const dayLabel = formatBerlinDayLabel(day.dateBerlin);
  const chapterTitle = useTagDateHeading
    ? `Was am ${dayLabel} im Stromnetz passiert ist`
    : "Was gestern im Stromnetz passiert ist";

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-tag">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">01 · Der Tag</p>
        <h2 id="kapitel-tag" className="v4-chapter-h2">
          {chapterTitle}
        </h2>
      </div>
      <div className="v4-content v4-luecke-wrap">
        <LueckeChart slots={day.slots} peakGw={peakGw} peakAt={peakAt} />
      </div>
      <footer className="v4-content v4-footnote" data-testid="tag-day-footnotes">
        <p>{surplusLine}</p>
        <p>{tagSurplusDefinitionLine()}</p>
        {lastLine ? <p>{lastLine}</p> : null}
      </footer>
      <ol className="v4-st-steps v4-content v4-tag-steps-desktop">
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
      <details className="v4-content v4-tag-steps-disclosure">
        <summary>Tag in drei Phasen (Nacht · Mittag · Abend)</summary>
        <ol className="v4-st-steps">
          {STEPS.map((step, index) => (
            <li key={`m-${step.title}`}>
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
      </details>
      {showFooterLink ? (
        <p className="v4-chapter-foot v4-content num">
          <Link href={`/tag/${day.dateBerlin}`} className="v4-text-link">
            Tag ansehen →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
