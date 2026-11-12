"use client";

type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
  /** Set after mount so aria-label matches resolved theme. */
  mounted: boolean;
};

const LIGHT_LABEL = "Helle Darstellung aktiv – zu dunkel wechseln";
const DARK_LABEL = "Dunkle Darstellung aktiv – zu hell wechseln";

export function ThemeToggle({ isDark, onToggle, mounted }: ThemeToggleProps) {
  const ariaLabel = mounted ? (isDark ? DARK_LABEL : LIGHT_LABEL) : "Darstellung";

  return (
    <button
      type="button"
      className="theme-btn"
      data-state={isDark ? "dark" : "light"}
      aria-pressed={mounted ? isDark : undefined}
      aria-label={ariaLabel}
      title="Helle oder dunkle Darstellung"
      onClick={onToggle}
    >
      <svg
        viewBox="0 0 42 24"
        width="34"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="1" y1="13" x2="4.8" y2="13" />
        <circle cx="7" cy="13" r="2.15" />
        <circle cx="21" cy="13" r="2.15" />
        <line x1="23.2" y1="13" x2="26.4" y2="13" />
        <g transform="translate(7,13)">
          <g className="blade">
            <line x1="2.15" y1="0" x2="11.85" y2="0" strokeWidth="1.95" />
          </g>
        </g>
        <g className="lamp" transform="translate(33.6,12)">
          <circle cx="0" cy="-1.3" r="4.45" />
          <path className="filament" d="M-1.95,-1.5 L0,0.85 L1.95,-1.5" />
          <line x1="-1.75" y1="3.05" x2="1.75" y2="3.05" />
          <line x1="-1.15" y1="4.95" x2="1.15" y2="4.95" />
        </g>
      </svg>
    </button>
  );
}
