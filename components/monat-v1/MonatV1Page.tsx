import { MonatV1Charts } from "@/components/monat-v1/MonatV1Charts.client";
import { MonatSoGerechnet } from "@/components/monat-v1/MonatSoGerechnet";
import styles from "@/components/monat-v1/monat-v1.module.css";
import type { MonatV1Model } from "@/lib/monatV1Model";
import { formatBerlinMonthShort } from "@/lib/monatCalendar";
import { MONAT_REGELR_MODEL_FOOTNOTE } from "@/lib/monatReglerPflichtzeile";
import { DisplayUnitNormalizer } from "@/components/v4/DisplayUnitNormalizer.client";

export function MonatV1Page({
  model,
  monthKey,
}: {
  model: MonatV1Model;
  monthKey: string;
}) {
  return (
    <DisplayUnitNormalizer>
    <div className={`${styles.root} v4-content`} data-testid="monat-v1-root">
      <p className={styles.eyebrow}>MONATSHORIZONT · {formatBerlinMonthShort(monthKey).toUpperCase()}</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <MonatV1Charts model={model} />
      <MonatSoGerechnet model={model} />
      <p className={`${styles.figcaption} num`} style={{ marginTop: 24 }}>
        {MONAT_REGELR_MODEL_FOOTNOTE}{" "}
        <a href="/methodik#annahmen" className="v4-text-link">
          Methodik
        </a>
      </p>
    </div>
    </DisplayUnitNormalizer>
  );
}
