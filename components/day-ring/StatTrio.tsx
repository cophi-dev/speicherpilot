export function StatTrio({
  items,
}: {
  items: Array<{ value: string; unit?: string; label: string; compact?: boolean }>;
}) {
  return (
    <dl className="day-stats">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd className={item.compact ? "day-stats-compact" : undefined}>
            <span className="num">{item.value}</span>
            {item.unit ? <span className="day-stats-unit"> {item.unit}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
