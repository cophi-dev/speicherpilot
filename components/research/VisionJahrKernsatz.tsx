import Link from "next/link";

import styles from "@/components/research/research.module.css";
import { VISION_METHODIK_ANCHOR } from "@/lib/research/visionJahrKernsatz";

export function VisionJahrKernsatzBlock({ paragraph }: { paragraph: string }) {
  return (
    <p className={styles.kernsatz} id="vision-kernsatz">
      {paragraph}{" "}
      <Link href={`/methodik#${VISION_METHODIK_ANCHOR}`} className={styles.link}>
        Methodik →
      </Link>
    </p>
  );
}