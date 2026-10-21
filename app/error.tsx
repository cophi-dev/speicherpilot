"use client";

import { useEffect } from "react";

import { EmptyRing } from "@/components/day-ring/EmptyRing";
import { useLanguage } from "@/components/language-context";
import { createLogger } from "@/lib/debug";

const log = createLogger("app-error");

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useLanguage();
  const de = language === "de";
  useEffect(() => {
    log("route error %o", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <section className="day-hero day-missing" aria-labelledby="error-title">
      <div className="day-missing-inner">
        <EmptyRing label={de ? "Leerer Ring" : "Empty ring"} />
        <h1 id="error-title">{de ? "Energy-Charts antwortet gerade nicht." : "Energy-Charts is not answering right now."}</h1>
        <p>{de ? "Der letzte Stand wird nicht als heute ausgegeben." : "The last reading is not presented as today."}</p>
        <button type="button" className="day-cta" onClick={reset}>
          {de ? "Erneut versuchen" : "Try again"}
        </button>
      </div>
    </section>
  );
}
