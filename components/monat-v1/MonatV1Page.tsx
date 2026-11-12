import { MonatV1Charts } from "@/components/monat-v1/MonatV1Charts.client";
import { MonatSoGerechnet } from "@/components/monat-v1/MonatSoGerechnet";
import styles from "@/components/monat-v1/monat-v1.module.css";
import type { MonatV1Model } from "@/lib/monatV1Model";
import { formatBerlinMonthShort } from "@/lib/monatCalendar";

export function MonatV1Page({
  model,
  monthKey,
}: {
  model: MonatV1Model;
  monthKey: string;
}) {
  return (
    <div className={`${styles.root} v4-content`} data-testid="monat-v1-root">
      <p className={styles.eyebrow}>MONATSHORIZONT · {formatBerlinMonthShort(monthKey).toUpperCase()}</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <MonatV1Charts model={model} />
      <MonatSoGerechnet model={model} />
    </div>
  );
}
