export function EmptyRing({
  label,
  sweep = false,
  ticks = false,
  center = null,
}: {
  label: string;
  sweep?: boolean;
  ticks?: boolean;
  center?: string | null;
}) {
  const marks = ticks ? [0, 6, 12, 18] : [];
  return (
    <svg className={sweep ? "empty-ring is-sweep" : "empty-ring"} viewBox="-140 -140 280 280" role="img" aria-label={label}>
      <title>{label}</title>
      <circle cx="0" cy="0" r="108" fill="none" stroke="#C5CED6" strokeWidth="2" />
      {marks.map((hour) => {
        const rad = (hour / 24) * Math.PI * 2;
        const x1 = Math.sin(rad) * 96;
        const y1 = -Math.cos(rad) * 96;
        const x2 = Math.sin(rad) * 108;
        const y2 = -Math.cos(rad) * 108;
        const labelText = String(hour).padStart(2, "0");
        return (
          <g key={hour}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C5CED6" strokeWidth="2" />
            <text x={Math.sin(rad) * 124} y={-Math.cos(rad) * 124 + 4} textAnchor="middle" fill="#C5CED6" fontSize="12" fontFamily="var(--font-plex-mono), monospace">
              {labelText}
            </text>
          </g>
        );
      })}
      {center ? (
        <text x="0" y="6" textAnchor="middle" fill="#C5CED6" fontSize="28" fontFamily="var(--font-plex-mono), monospace">
          {center}
        </text>
      ) : null}
      {sweep ? <path className="empty-sweep" d="M0,-108 A108,108 0 0 1 76,-76" fill="none" stroke="#7DFCE6" strokeWidth="8" strokeLinecap="round" /> : null}
    </svg>
  );
}
