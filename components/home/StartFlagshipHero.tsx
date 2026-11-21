"use client";

import Link from "next/link";

import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { formatDeGw, insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatPreisSpanne } from "@/lib/preisFenster";

export function StartFlagshipHero({
  dayKey,
  dataStand,
  record,
}: {
  dayKey: string;
  dataStand: string;
  record: TagesKennzahlRecord;
}) {
  const peakLabel = record.eveningPeakGw != null ? formatDeGw(record.eveningPeakGw, 1) : "—";
  const peakTime = record.eveningPeakAt ? `${record.eveningPeakAt}\u00A0Uhr` : null;
  const priceRange =
    record.pmin != null && record.pmax != null ? formatPreisSpanne(record.pmin, record.pmax) : null;
  const dryStreakNote =
    record.dryStreak >= 2 ? `${record.dryStreak}.\u00A0Tag ohne Überschuss` : null;

  return (
    <section className="v4-flagship-hero" aria-labelledby="start-flagship-h1" data-testid="start-flagship-hero">
      <div className="v4-content">
        <p className="v4-kicker num">
          STROMNETZ DEUTSCHLAND · OFFENE DATEN · STAND {dataStand}
        </p>

        <h1 id="start-flagship-h1" className="v4-h1 v4-flagship-h1">
          Was Großspeicher dem Stromnetz wirklich bringen.
        </h1>

        <p className="v4-subline v4-flagship-subline">
          {insertDisplayUnitNbsp(
            "Offene Viertelstundendaten für Deutschland — von der nationalen Abendspitze bis zum 80-MW-Umspannwerk.",
          )}
        </p>

        <div className="v4-flagship-actions">
          <Link href="/knoten" className="v4-btn-primary">
            Umspannwerk testen →
          </Link>
          <Link href="/kompromiss" className="v4-btn-secondary">
            Pareto-Kompromiss →
          </Link>
          <Link href="/monat/2026-10" className="v4-btn-secondary">
            Monatsflotte →
          </Link>
        </div>

        <div className="v4-flagship-grid">
          <a href="#tagesverlauf" className="v4-flagship-card">
            <div className="v4-flagship-card-top">
              <span className="v4-kompass-kicker num">Gestern im Netz · Live</span>
              {dryStreakNote ? <span className="v4-flagship-pill num">{dryStreakNote}</span> : null}
            </div>
            <p className="v4-flagship-metric num">{peakLabel}</p>
            <p className="v4-kompass-body">
              Abendspitze{peakTime ? ` um ${peakTime}` : ""}
              {priceRange ? ` · Börsenpreis ${priceRange}` : ""}.
            </p>
            <span className="v4-flagship-cta">Zum Tagesverlauf ({dayKey}) ↓</span>
          </a>

          <Link href="/kompromiss" className="v4-flagship-card">
            <div className="v4-flagship-card-top">
              <span className="v4-kompass-kicker num">Kompromiss · ×2 Flotte</span>
            </div>
            <p className="v4-flagship-metric num">{insertDisplayUnitNbsp("2,51 GW")}</p>
            <p className="v4-kompass-body">
              {insertDisplayUnitNbsp(
                "Spitzensenkung statt 0,37 GW bei reinem Preisfahren — für nur 0,36 % weniger Erlös.",
              )}
            </p>
            <span className="v4-flagship-cta">Pareto-Front ansehen →</span>
          </Link>

          <Link href="/knoten" className="v4-flagship-card">
            <div className="v4-flagship-card-top">
              <span className="v4-kompass-kicker num">{insertDisplayUnitNbsp("Umspannwerk · 80 MW")}</span>
            </div>
            <p className="v4-flagship-metric num">6× → 0×</p>
            <p className="v4-kompass-body">
              {insertDisplayUnitNbsp(
                "Überlast am Trafo mit knotentreuer Fahrweise (§ 17 Abs. 2b EnWG) — inkl. lokalem CSV-Check.",
              )}
            </p>
            <span className="v4-flagship-cta">Dein Knoten öffnen →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
