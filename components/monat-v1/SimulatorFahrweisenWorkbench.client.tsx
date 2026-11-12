"use client";

import styles from "@/components/monat-v1/monat-v1.module.css";
import simStyles from "@/components/monat-v1/simulator-fahrweisen.module.css";
import { SimulatorParetoSection } from "@/components/monat-v1/SimulatorParetoSection.client";
import { SimulatorTagesSection } from "@/components/monat-v1/SimulatorTagesSection.client";
import { SimulatorFnavSection } from "@/components/monat-v1/SimulatorFnavSection.client";
import type { SimulatorFahrweisenData } from "@/lib/simulatorFahrweisenTypes";

export function SimulatorFahrweisenWorkbench({ data }: { data: SimulatorFahrweisenData }) {
  return (
    <div data-testid="simulator-werkbank" className={simStyles.simulatorRoot}>
      <p className={styles.eyebrow}>FAHRWEISEN · OKTOBER 2026 · MONATSHORIZONT</p>
      <div className={styles.chipRow}>
        <span className={styles.chip}>MODELL</span>
      </div>
      <SimulatorParetoSection data={data} />
      <SimulatorTagesSection data={data} />
      <SimulatorFnavSection data={data} />
      <LegalBox />
    </div>
  );
}

function LegalBox() {
  return (
    <aside className={simStyles.legalBox} aria-labelledby="sim-legal-title">
      <h2 id="sim-legal-title">Die Front zeigt den Preis. Sie zahlt ihn nicht.</h2>
      <ul>
        <li>
          <strong>§ 118 Abs. 6 EnWG</strong> — IBN bis 4.8.2029: 20 Jahre keine Netzentgelte auf den Bezug. Heute fehlt
          das laufende Entgelt-Signal.
        </li>
        <li>
          <strong>§ 17 Abs. 2b EnWG</strong> — Flexible Netzanschlussvereinbarung (Höhe, Zeit). Angebot, keine Pflicht.
          Rahmen für den Leistungsdeckel.
        </li>
        <li>
          <strong>BGH EnVR 1/24</strong> — BKZ nach Leistungspreis zulässig, auch wenn der Speicher netzdienlich wirken
          kann.
        </li>
        <li>
          <strong>AgNes</strong>
          <span className={simStyles.chipEntwurf}>ENTWURF</span> — Konsultation abgeschlossen, am 12.11.2026 kein
          festgelegtes Recht. Kein AgNes-Tarif in diesem Modell.
        </li>
        <li>
          <strong>§ 14a EnWG</strong> — Gilt nicht für diese Flotte (nicht Niederspannung).
        </li>
      </ul>
      <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--mv-muted)" }}>Kein Rechtsrat.</p>
    </aside>
  );
}
