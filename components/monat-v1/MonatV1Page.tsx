import { MonatV1Charts } from "@/components/monat-v1/MonatV1Charts.client";
import styles from "@/components/monat-v1/monat-v1.module.css";
import type { MonatV1Model } from "@/lib/monatV1Model";
import { formatBerlinMonthShort } from "@/lib/monatCalendar";

export function MonatV1Page({ model, monthKey }: { model: MonatV1Model; monthKey: string }) {
  return (
    <div className={`${styles.root} v4-content`} data-testid="monat-v1-root">
      <p className={styles.eyebrow}>MONATSHORIZONT · {formatBerlinMonthShort(monthKey).toUpperCase()}</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <MonatV1Charts model={model} />
      <footer className={styles.pageFooter}>
        <p>{model.pageFootnote}</p>
        <p>
          Quellen und Annahmen:{" "}
          <a href="/methodik#monat-konzept-ac" className="v4-text-link">
            Methodik → Monatsmodell
          </a>
        </p>
      </footer>
    </div>
  );
}
