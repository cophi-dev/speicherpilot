/** Reserviert Layout-Höhe für den clientseitigen Monats-Chart (CLS). */
export function NationalFleetTimeSeriesChartSkeleton({
  prominentMonth = false,
  withCompareLegend = false,
}: {
  prominentMonth?: boolean;
  withCompareLegend?: boolean;
}) {
  const panels = ["Restlast", "Speicherleistung", "Speicherinhalt (Beginn Viertelstunde)"];
  return (
    <figure
      className={`v4-fleet-ts-wrap v4-fleet-ts-skeleton v4-content${prominentMonth ? " is-month-prominent" : ""}${withCompareLegend ? " has-compare-legend" : ""}`}
      aria-busy="true"
    >
      <div className="v4-fleet-ts-skel-caption" aria-hidden="true" />
      <div className="v4-fleet-ts-legend num v4-fleet-ts-skel-legend" aria-hidden="true">
        <span className="v4-fleet-ts-legend-r">Restlast beobachtet (GW)</span>
        <span className="v4-fleet-ts-legend-rp">Restlast mit Speicher (GW)</span>
        <span className="v4-fleet-ts-legend-c">Laden (GW)</span>
        <span className="v4-fleet-ts-legend-d">Entladen (GW)</span>
        <span className="v4-fleet-ts-legend-e">SoC Beginn Viertelstunde (GWh)</span>
      </div>
      <p className="v4-fleet-ts-tooltip num muted" role="status">
        Zeitreihen-Chart wird geladen …
      </p>
      <div className="v4-fleet-ts-interactive v4-fleet-ts-skel-interactive" aria-hidden="true">
        {panels.map((title, index) => (
          <div key={title} className="v4-fleet-ts-panel v4-fleet-ts-skel-panel">
            <div className="v4-fleet-ts-panel-head">
              <span className="v4-fleet-ts-panel-title">{title}</span>
              <span className="v4-fleet-ts-panel-unit num">—</span>
            </div>
            <div className={`v4-fleet-ts-skel-plot${index === 0 ? "" : " is-aux"}`}>
              <span className="v4-fleet-ts-skel-line" />
            </div>
          </div>
        ))}
        <div className="v4-fleet-ts-x num v4-fleet-ts-skel-x">
          <span>1.</span>
          <span>8.</span>
          <span>15.</span>
          <span>22.</span>
          <span>29.</span>
        </div>
      </div>
    </figure>
  );
}
