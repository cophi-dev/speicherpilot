"use client";

import type { ConnectionLight as ConnectionLightModel, ConnectionLightStatus } from "@/lib/connectionLight";

const SEGMENTS: Array<{ status: Exclude<ConnectionLightStatus, "missing">; de: string; en: string; fill: string }> = [
  { status: "ok", de: "PASST", en: "FITS", fill: "#1E7A5F" },
  { status: "tight", de: "KNAPP", en: "TIGHT", fill: "#A84E0A" },
  { status: "over", de: "PASST NICHT", en: "DOES NOT FIT", fill: "#B3261E" },
];

export function ConnectionLight({
  light,
  language,
  neutral = false,
}: {
  light: ConnectionLightModel;
  language: "de" | "en";
  /** Step 1 of the teaching story: every segment is an outline, with no verdict yet. */
  neutral?: boolean;
}) {
  const sentence = language === "de" ? light.sentence.de : light.sentence.en;
  const pending = language === "de" ? "Anschluss-Ampel, noch ohne Bewertung." : "Connection light, not assessed yet.";

  if (neutral) {
    return (
      <div role="meter" aria-label={pending} aria-valuemin={0} aria-valuemax={1} aria-valuenow={0} aria-valuetext={pending}>
        <div className="grid grid-cols-3 gap-1">
          {SEGMENTS.map((segment) => (
            <p
              key={segment.status}
              className="connection-light-seg num flex h-11 items-center justify-center border bg-transparent uppercase"
              style={{ color: segment.fill, borderColor: segment.fill }}
            >
              {language === "de" ? segment.de : segment.en}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (light.status === "missing") {
    return (
      <div
        role="meter"
        aria-label={sentence}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={0}
        aria-valuetext={sentence}
        className="flex h-11 items-center justify-center border border-border bg-secondary px-3"
      >
        <p className="num text-[12px] tracking-[0.14em] text-foreground uppercase">{sentence.replace(/\.$/, "")}</p>
      </div>
    );
  }

  return (
    <div
      role="meter"
      aria-label={sentence}
      aria-valuemin={0}
      aria-valuemax={light.limitKw ?? undefined}
      aria-valuenow={light.peakKw ?? undefined}
      aria-valuetext={sentence}
    >
      <div className="grid grid-cols-3 gap-1">
        {SEGMENTS.map((segment) => {
          const active = light.status === segment.status;
          const label = language === "de" ? segment.de : segment.en;
          return (
            <p
              key={segment.status}
              data-status={segment.status}
              data-active={active ? "true" : "false"}
              className="connection-light-seg num flex h-11 items-center justify-center border uppercase"
              style={
                active
                  ? { background: segment.fill, color: "#fff", borderColor: segment.fill }
                  : { background: "transparent", color: segment.fill, borderColor: segment.fill }
              }
            >
              {label}
            </p>
          );
        })}
      </div>
      <p className="mt-2 text-[15px] leading-snug text-foreground">{sentence}</p>
    </div>
  );
}
