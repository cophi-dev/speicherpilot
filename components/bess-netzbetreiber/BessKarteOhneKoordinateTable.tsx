import { formatIbnDateDe, mastrNameNbsp } from "@/lib/bessKarte3d/logic";
import type { OhneKoordinateEintrag } from "@/lib/bessKarte3d/types";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantityUnit } from "@/lib/formatQuantity";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

export function BessKarteOhneKoordinateTable({
  rows,
  sumNettoMw,
  sumBruttoMw,
}: {
  rows: readonly OhneKoordinateEintrag[];
  sumNettoMw: number;
  sumBruttoMw: number;
}) {
  if (rows.length === 0) return null;

  return (
    <div className={styles.unmappedWrap}>
      <div className={styles.unmappedHead}>
        <h3 className={styles.unmappedTitle}>
          {rows.length} Einheiten ohne Koordinate im MaStR (nicht auf der Karte)
        </h3>
        <p className={`${styles.unmappedSub} num`}>
          Zusammen{" "}
          {insertDisplayUnitNbsp(formatQuantityUnit(sumNettoMw, "de", 1, "MW"))}{" "}
          netto /{" "}
          {insertDisplayUnitNbsp(formatQuantityUnit(sumBruttoMw, "de", 1, "MW"))}{" "}
          brutto — in den Gesamt- und Länderzahlen enthalten, ohne Schein- oder
          Mittelpunkt auf der Karte (MaStRV §&nbsp;15).
        </p>
      </div>

      <table className={styles.unmappedTable}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Landkreis</th>
            <th scope="col">Bundesland</th>
            <th scope="col" className={styles.numCol}>
              MW netto
            </th>
            <th scope="col" className={styles.numCol}>
              MW brutto
            </th>
            <th scope="col" className={styles.numCol}>
              IBN
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.name}-${r.ibn}`}>
              <td data-label="Name">{mastrNameNbsp(r.name)}</td>
              <td data-label="Landkreis">{r.landkreis}</td>
              <td data-label="Bundesland">{r.bundesland}</td>
              <td data-label="MW netto" className={`${styles.numCol} num`}>
                {insertDisplayUnitNbsp(formatQuantityUnit(r.nettoMw, "de", 1, "MW"))}
              </td>
              <td data-label="MW brutto" className={`${styles.numCol} num`}>
                {insertDisplayUnitNbsp(formatQuantityUnit(r.bruttoMw, "de", 1, "MW"))}
              </td>
              <td data-label="IBN" className={`${styles.numCol} num`}>
                {formatIbnDateDe(r.ibn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
