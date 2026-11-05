"use client";

import Link from "next/link";

import { tagSurplusLine } from "@/lib/kopfTagCopy";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";

export function StartGesternTeaser({
  kopfDayKey,
  record,
}: {
  kopfDayKey: string;
  record: TagesKennzahlRecord | undefined;
}) {
  const label = formatBerlinDayLabel(kopfDayKey);
  const surplus = tagSurplusLine(record?.surplusGwh ?? 0);

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-gestern">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">01 · Gestern</p>
        <h2 id="kapitel-gestern" className="v4-chapter-h2">
          Was am {label} auffiel
        </h2>
        <p className="v4-tag-kern">{surplus}</p>
        <p className="v4-tag-side">
          Den Tagesverlauf mit Lücke und Abendspitze gibt es auf der Tag-Seite — nicht noch einmal hier.
        </p>
      </div>
      <p className="v4-chapter-foot v4-content num">
        <Link href={`/tag/${kopfDayKey}`} className="v4-text-link">
          Tag {label} vertiefen →
        </Link>
      </p>
    </section>
  );
}
