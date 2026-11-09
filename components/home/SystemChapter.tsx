"use client";

import { useMemo, useState } from "react";

import { FnRef, START_NOTE } from "@/components/home/StartAnmerkungen";
import { SystemSurplusChart } from "@/components/home/SystemSurplusChart";
import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";

const FACTORS = [1, 2, 5, 10] as const;

export function SystemChapter({
  model,
  fleetPowerGw,
  fleetEnergyGwh,
}: {
  model: OverviewEvaluation;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
}) {
  const [factor, setFactor] = useState<(typeof FACTORS)[number]>(1);
  const f = model.factors[factor];
  const sharePct = Math.round((f.absorbedShare ?? 0) * 100);
  const x5Pct = Math.round((model.factors[5].absorbedShare ?? 0) * 100);
  const x10Pct = Math.round((model.factors[10].absorbedShare ?? 0) * 100);

  const dayRows = useMemo(
    () => [...f.dayRows].sort((a, b) => a.dateBerlin.localeCompare(b.dateBerlin)),
    [f.dayRows]
  );
  const totalSurplus = model.observed.surplusGwh ?? 0;
  const loaded = f.absorbedGwh;

  return (
    <section className="v4-chapter" aria-labelledby="kapitel-system">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">02 · Das System</p>
        <h2 id="kapitel-system" className="v4-chapter-h2">
          Was Speicher in den letzten 30 Tagen geschafft hätten
        </h2>
        <div className="v4-system-kern">
          <p className="v4-system-pct num" aria-live="polite">
            {formatQuantity(sharePct, "de", 0)}&nbsp;%
          </p>
          <div className="v4-system-side">
            <p>
              des Tages-Überschusses hätte die Referenzflotte ({formatQuantity(fleetPowerGw, "de", 2)} GW,{" "}
              {formatQuantity(fleetEnergyGwh, "de", 2)} GWh) in diesem Modell aufgenommen.{" "}
              <span className="v4-chip num">Modellschätzung · Überschuss-Laden</span>
              <FnRef n={START_NOTE.system} />
            </p>
            <p className="v4-system-multi num">
              ×5: {formatQuantity(x5Pct, "de", 0)}&nbsp;% · ×10: {formatQuantity(x10Pct, "de", 0)}&nbsp;%
            </p>
          </div>
        </div>
        <div className="v4-factor-bar" role="group" aria-label="Speicher-Multiplikator">
          {FACTORS.map((n) => (
            <button
              key={n}
              type="button"
              className={`v4-factor-btn num ${factor === n ? "is-active" : ""}`}
              aria-pressed={factor === n}
              onClick={() => setFactor(n)}
            >
              ×{n}
            </button>
          ))}
        </div>
      </div>
      <div className="v4-content v4-system-chart-wrap">
        <p className="v4-strip-caption num">Überschuss je Tag, GWh</p>
        <SystemSurplusChart
          rows={dayRows}
          factor={factor}
          caption={`Zusammengeschoben: ${formatQuantity(loaded, "de", 1)} von ${formatQuantity(totalSurplus, "de", 1)} GWh geladen (Modell)`}
        />
      </div>
    </section>
  );
}
