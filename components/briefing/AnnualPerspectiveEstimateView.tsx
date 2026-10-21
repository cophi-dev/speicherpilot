import type { AnnualPerspectiveCopy } from "@/lib/annualPerspectiveEstimate";

type AnnualPerspectiveEstimateViewProps = {
  copy: AnnualPerspectiveCopy;
};

/**
 * Presentational shell for the annual model estimate.
 * All figures are computed in `lib/annualPerspectiveEstimate.ts`.
 */
export function AnnualPerspectiveEstimateView({ copy }: AnnualPerspectiveEstimateViewProps) {
  const rows = [
    { label: copy.sizeLabel, value: copy.sizeValue, detail: copy.sizeDetail },
    { label: copy.coverageLabel, value: copy.coverageValue, detail: null },
    { label: copy.economicsLabel, value: copy.economicsValue, detail: null },
  ];

  return (
    <section
      className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 dark:border-slate-600/45 dark:bg-slate-950/25"
      aria-labelledby="twelve-month-perspective-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          id="twelve-month-perspective-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
        >
          {copy.title}
        </p>
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{copy.badge}</p>
      </div>
      <dl className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {row.value}
            </dd>
            {row.detail ? (
              <dd className="mt-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{row.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-border/50 pt-3 dark:border-slate-600/35">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          {copy.assumptionsTitle}
        </p>
        <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
          {copy.assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
