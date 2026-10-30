import Link from "next/link";

import { sitePath, type Perspective } from "@/lib/perspective";

type Language = "de" | "en";

const CHOICES: { view: Perspective; titleDe: string; titleEn: string; bodyDe: string; bodyEn: string }[] = [
  {
    view: "projekt",
    titleDe: "Ich plane einen Speicher",
    titleEn: "I plan storage",
    bodyDe: "Du siehst die Größe, die Kosten und ob sich der Speicher an einem Lastprofil bezahlt macht.",
    bodyEn: "You see the size, the cost, and whether the battery pays for itself on a load profile.",
  },
  {
    view: "netz",
    titleDe: "Ich betreibe ein Netz",
    titleEn: "I operate a grid",
    bodyDe: "Du siehst zulässige Anschlussleistung, Badge netzdienlich und flexible Anschlussvereinbarung.",
    bodyEn: "You see permitted connection capacity, the grid-support badge and flexible connection agreements.",
  },
];

export function PerspectiveChoice({ language, columns = true }: { language: Language; columns?: boolean }) {
  return (
    <div className={`grid gap-3 ${columns ? "sm:grid-cols-2" : ""}`}>
      {CHOICES.map((choice) => (
        <Link
          key={choice.view}
          href={sitePath(choice.view, "supermarkt")}
          className="flex min-h-32 flex-col justify-between rounded-md border border-border-strong bg-card p-5 text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="text-lg leading-snug font-medium">{language === "de" ? choice.titleDe : choice.titleEn}</span>
          <span className="mt-2 text-sm leading-snug text-muted-foreground">{language === "de" ? choice.bodyDe : choice.bodyEn}</span>
        </Link>
      ))}
    </div>
  );
}
