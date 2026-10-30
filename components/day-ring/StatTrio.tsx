import { MonoNumber } from "@/components/day-ring/MonoNumber";

export function StatTrio({
  items,
}: {
  items: Array<{ value: string; unit?: string; label: string; note?: string; title?: string; compact?: boolean }>;
}) {
  return (
    <dl className="day-stats">
      {items.map((item) => (
        <div key={item.label}>
          <dt title={item.title}>{item.label}</dt>
          <dd className={item.compact ? "day-stats-compact" : undefined}>
            <MonoNumber value={item.value} />
            {item.unit ? <span className="day-stats-unit"> {item.unit}</span> : null}
            {item.note ? <span className="day-stats-note">{item.note}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
