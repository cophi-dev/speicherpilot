"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/components/simulator/simulator-subnav.module.css";

export function SimulatorSubnav() {
  const pathname = usePathname() ?? "";
  const kompActive = pathname.startsWith("/kompromiss") || pathname.startsWith("/simulator");
  const knotenActive = pathname.startsWith("/knoten");
  return (
    <nav className={styles.bar} aria-label="Simulator" data-testid="simulator-subnav">
      <Link
        href="/kompromiss"
        className={`${styles.tab}${kompActive ? ` ${styles.tabActive}` : ""}`}
        aria-current={kompActive ? "page" : undefined}
      >
        Kompromiss
      </Link>
      <Link
        href="/knoten"
        className={`${styles.tab}${knotenActive ? ` ${styles.tabActive}` : ""}`}
        aria-current={knotenActive ? "page" : undefined}
      >
        Knoten
      </Link>
    </nav>
  );
}