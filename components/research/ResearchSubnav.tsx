"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/components/research/research.module.css";

export function ResearchSubnav({ active }: { active: "gestern" | "vision" }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  return (
    <nav className={styles.subnav} aria-label="Forschungsansichten">
      <Link href="/" data-active={active === "gestern" ? "true" : undefined}>
        Gestern
      </Link>
      {onHome ? (
        <a href="#woche" data-active={undefined}>
          Woche
        </a>
      ) : (
        <Link href="/#woche">Woche</Link>
      )}
      <Link href="/vision" data-active={active === "vision" ? "true" : undefined}>
        Vision
      </Link>
      <Link href="/methodik">Methodik</Link>
    </nav>
  );
}
