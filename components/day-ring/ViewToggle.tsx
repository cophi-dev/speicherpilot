import type { RingView } from "@/lib/dayRingStory";

export function ViewToggle({
  view,
  onChange,
  uhrLabel,
  linieLabel,
  groupLabel,
}: {
  view: RingView;
  onChange: (view: RingView) => void;
  uhrLabel: string;
  linieLabel: string;
  groupLabel: string;
}) {
  return (
    <div className="day-toggle" role="group" aria-label={groupLabel}>
      {(
        [
          ["uhr", uhrLabel],
          ["linie", linieLabel],
        ] as const
      ).map(([key, label]) => (
        <button key={key} type="button" aria-pressed={view === key} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}
