"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-context";
import { IssueThumb } from "@/components/notizen/charts";
import { NETZBRIEF_FORMATS, type NetzbriefFormat, type NetzbriefIssue } from "@/lib/netzbrief";

const FILTERS: Array<{ id: "alle" | NetzbriefFormat; de: string; en: string }> = [
  { id: "alle", de: "Alle", en: "All" },
  ...NETZBRIEF_FORMATS,
];

export function NotizenArchive({ issues, format }: { issues: NetzbriefIssue[]; format: string }) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const active = FILTERS.some((item) => item.id === format) ? format : "alle";
  const visible = active === "alle" ? issues : issues.filter((issue) => issue.format === active);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8">
      <p className="num text-[12px] tracking-[0.14em] text-muted-foreground uppercase">SpeicherPilot · Netzbrief</p>
      <h1 className="mt-3 max-w-[18ch] text-[40px] font-medium leading-none md:text-[64px]">{tx("Notizen", "Notes")}</h1>
      <p className="mt-4 max-w-[46ch] text-lg text-muted-foreground">
        {tx(
          "Jede Ausgabe hat eine Nummer, ein Datum und einen Satz. Die Rechnung, die Quelle und die CSV stehen auf der Ausgabenseite.",
          "Each issue has a number, a date and one sentence. The calculation, the source and the CSV are on the issue page."
        )}
      </p>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label={tx("Format", "Format")}>
        {FILTERS.map((item) => {
          const selected = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.id === "alle" ? "/notizen" : `/notizen?format=${item.id}`}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex h-10 items-center rounded-md border px-3 text-sm ${selected ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-border-strong"}`}
            >
              {language === "de" ? item.de : item.en}
            </Link>
          );
        })}
      </nav>
      {visible.length === 0 ? (
        <p className="mt-10 text-muted-foreground">{tx("In diesem Format liegt noch keine Ausgabe.", "There is no issue in this format yet.")}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((issue) => (
            <li key={issue.nr}>
              <Link
                href={`/notizen/${issue.nr}`}
                className="block overflow-hidden rounded-md border border-border bg-card hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-video overflow-hidden border-b border-border">
                  <IssueThumb issue={issue} />
                </div>
                <div className="p-4">
                  <p className="num text-[22px] leading-none">#{String(issue.nr).padStart(3, "0")}</p>
                  <p className="num mt-2 text-[12px] tracking-[0.08em] text-muted-foreground uppercase">
                    {issue.shortDate} · {language === "de" ? issue.formatLabel.de : issue.formatLabel.en}
                  </p>
                  <p className="mt-3 line-clamp-3 text-[15px] leading-snug">{language === "de" ? issue.statement.de : issue.statement.en}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
