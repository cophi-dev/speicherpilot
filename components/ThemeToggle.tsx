"use client";

import { useId } from "react";

export type ThemeToggleProps = {
  isDark: boolean;
  mounted: boolean;
  onToggle: (btn: HTMLButtonElement) => void;
};

export function ThemeToggle({ isDark, mounted, onToggle }: ThemeToggleProps) {
  const clipId = `moonclip-${useId().replace(/:/g, "")}`;
  const ariaLabel = mounted
    ? isDark
      ? "Dunkle Darstellung aktiv – zu hell wechseln"
      : "Helle Darstellung aktiv – zu dunkel wechseln"
    : "Darstellung";

  return (
    <button
      type="button"
      className={`theme-btn inline-flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring${isDark ? " is-dark" : ""}`}
      aria-pressed={mounted ? isDark : undefined}
      aria-label={ariaLabel}
      title="Helle oder dunkle Darstellung"
      onClick={(event) => onToggle(event.currentTarget)}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="24" height="14.4" />
          </clipPath>
        </defs>
        <line className="bus" x1="2.0" y1="14.4" x2="22.0" y2="14.4" strokeWidth="1.9" />
        <circle className="term" cx="2.0" cy="14.4" r="1.25" fill="currentColor" stroke="none" />
        <circle className="term" cx="22.0" cy="14.4" r="1.25" fill="currentColor" stroke="none" />
        <g className="state-sun">
          <path
            className="core"
            d="M4.85 14.4 A 7.15 7.15 0 0 1 19.15 14.4 Z"
            fill="currentColor"
            stroke="none"
          />
          <g className="rays">
            <line x1="4.60" y1="10.12" x2="1.95" y2="8.60" />
            <line x1="7.73" y1="7.00" x2="6.20" y2="4.35" />
            <line x1="12.00" y1="5.85" x2="12.00" y2="2.80" />
            <line x1="16.28" y1="7.00" x2="17.80" y2="4.35" />
            <line x1="19.40" y1="10.12" x2="22.05" y2="8.60" />
          </g>
        </g>
        <g className="state-moon" clipPath={`url(#${clipId})`}>
          <path
            className="moon"
            d="M18.203,12.184 A6.95,6.95 0 1 1 12.979,2.169 A5.65,5.65 0 1 0 18.203,12.184 Z"
            fill="currentColor"
            stroke="none"
          />
        </g>
      </svg>
    </button>
  );
}
