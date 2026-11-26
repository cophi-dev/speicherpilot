"use client";

import { useEffect } from "react";

import {
  BUNDESLAND_KUERZEL_ZU_NAME,
  epStunden,
  formatEinspeisungLabel,
  formatIbnDateDe,
  isEpPlausibel,
  mastrNameNbsp,
} from "@/lib/bessKarte3d/logic";
import type { KarteSite } from "@/lib/bessKarte3d/types";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity, formatQuantityUnit } from "@/lib/formatQuantity";
import styles from "@/components/bess-netzbetreiber/bess-netzbetreiber.module.css";

function SiteDetailBody({
  site,
  epPlausibelH,
}: {
  site: KarteSite;
  epPlausibelH: readonly [number, number];
}) {
  const ep = epStunden(site.kapMwh, site.nettoMw);
  const epOk = isEpPlausibel(ep, epPlausibelH);
  const blFull = BUNDESLAND_KUERZEL_ZU_NAME[site.bl] ?? site.bl;

  return (
    <div className={styles.detailBody}>
      <div className={styles.detailHeadMeta}>
        <p className={styles.detailTitle}>{mastrNameNbsp(site.name)}</p>
        <p className={`${styles.detailSub} num`}>
          {site.lk} · {blFull} · Lokation {site.lok}
        </p>
      </div>

      <dl className={styles.detailGrid}>
        <div>
          <dt>Nettoleistung</dt>
          <dd className="num">
            {insertDisplayUnitNbsp(formatQuantityUnit(site.nettoMw, "de", 1, "MW"))}
          </dd>
        </div>
        <div>
          <dt>Bruttoleistung</dt>
          <dd className="num">
            {insertDisplayUnitNbsp(formatQuantityUnit(site.bruttoMw, "de", 1, "MW"))}
          </dd>
        </div>
        <div>
          <dt>Speicherkapazität</dt>
          <dd className="num">
            {insertDisplayUnitNbsp(formatQuantityUnit(site.kapMwh, "de", 1, "MWh"))}
          </dd>
        </div>
        <div>
          <dt>E/P-Verhältnis</dt>
          <dd className="num">
            {ep !== null
              ? insertDisplayUnitNbsp(formatQuantityUnit(ep, "de", 2, "h"))
              : "k. A."}
            {!epOk && ep !== null ? (
              <span className={styles.detailWarn}> (außerhalb {epPlausibelH[0]}–{epPlausibelH[1]}&nbsp;h)</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Inbetriebnahme</dt>
          <dd className="num">
            {site.earliestIbn === site.latestIbn
              ? formatIbnDateDe(site.earliestIbn)
              : `${formatIbnDateDe(site.earliestIbn)} – ${formatIbnDateDe(site.latestIbn)}`}
          </dd>
        </div>
        <div>
          <dt>NB-Prüfung</dt>
          <dd>
            {site.geprueftAlle
              ? "abgeschlossen"
              : site.geprueftCount === 0
                ? "offen"
                : `${site.geprueftCount} von ${site.unitsCount} abgeschlossen`}
          </dd>
        </div>
        <div>
          <dt>Einspeisung (Indiz)</dt>
          <dd>{formatEinspeisungLabel(site.einspeisung)}</dd>
        </div>
        <div>
          <dt>Spannungsebene</dt>
          <dd>{site.span}</dd>
        </div>
      </dl>

      {site.unitsCount > 1 ? (
        <div className={styles.detailUnitsBox}>
          <p className={`${styles.detailUnitsHead} num`}>
            {formatQuantity(site.unitsCount, "de", 0)} Einheiten an dieser Lokation:
          </p>
          <ul className={styles.detailUnitsList}>
            {site.einheiten.map((u, idx) => (
              <li key={`${u.name}-${u.ibn}-${idx}`} className="num">
                <span>{mastrNameNbsp(u.name)}</span>
                <span>
                  {insertDisplayUnitNbsp(formatQuantityUnit(u.nettoMw, "de", 1, "MW"))} ·{" "}
                  {formatIbnDateDe(u.ibn)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function BessKarteDetailCard({
  site,
  sites,
  epPlausibelH,
  onSelectSite,
}: {
  site: KarteSite | null;
  sites: readonly KarteSite[];
  epPlausibelH: readonly [number, number];
  onSelectSite: (site: KarteSite | null) => void;
}) {
  const topQuick = sites.slice(0, 4);

  return (
    <aside className={styles.detailCard} aria-label="Lokationsdetails">
      <div className={styles.detailCardBar}>
        <label htmlFor="karte-standort-select" className={`${styles.detailSelectLabel} num`}>
          Lokation wählen (Tastatur)
        </label>
        <select
          id="karte-standort-select"
          className={styles.detailSelect}
          value={site?.lok ?? ""}
          onChange={(e) => {
            const lok = e.target.value;
            const found = sites.find((s) => s.lok === lok) ?? null;
            onSelectSite(found);
          }}
        >
          <option value="">
            — {formatQuantity(sites.length, "de", 0)} kartierte Lokationen —
          </option>
          {sites.map((s) => (
            <option key={s.lok} value={s.lok}>
              {mastrNameNbsp(s.name)} ({s.bl}) · {formatQuantity(s.nettoMw, "de", 1)}{"\u00a0"}MW
            </option>
          ))}
        </select>
      </div>

      {site ? (
        <div className={styles.detailSelected}>
          <div className={styles.detailCloseRow}>
            <span className={`${styles.detailBadge} num`}>Ausgewählte Lokation</span>
            <button
              type="button"
              className={styles.detailCloseBtn}
              onClick={() => onSelectSite(null)}
              aria-label="Auswahl schließen"
            >
              Schließen ×
            </button>
          </div>
          <SiteDetailBody site={site} epPlausibelH={epPlausibelH} />
        </div>
      ) : (
        <div className={styles.detailEmpty}>
          <p>
            Klicke eine Säule auf der Karte an oder wähle eine Lokation oben aus der Liste, um
            Leistung, Kapazität, E/P, Inbetriebnahme und Prüfstatus zu sehen.
          </p>
          {topQuick.length > 0 ? (
            <div className={styles.detailQuickList}>
              <span className={`${styles.detailQuickHead} num`}>Größte Lokationen zum gewählten Monat:</span>
              <div className={styles.detailQuickBtns}>
                {topQuick.map((s) => (
                  <button
                    key={s.lok}
                    type="button"
                    className={styles.detailQuickBtn}
                    onClick={() => onSelectSite(s)}
                  >
                    <span>{mastrNameNbsp(s.name)}</span>
                    <span className="num">
                      {insertDisplayUnitNbsp(formatQuantityUnit(s.nettoMw, "de", 1, "MW"))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}

export function BessKarteBottomSheet({
  site,
  epPlausibelH,
  onClose,
}: {
  site: KarteSite | null;
  epPlausibelH: readonly [number, number];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!site) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [site, onClose]);

  if (!site) return null;

  return (
    <div className={styles.sheetBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.sheetPanel}
        role="dialog"
        aria-modal="true"
        aria-label={`Lokationsdetails ${site.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetTopBar}>
          <span className={`${styles.detailBadge} num`}>Lokationsdetails</span>
          <button
            type="button"
            className={styles.sheetCloseBtn}
            onClick={onClose}
            aria-label="Details schließen"
          >
            ×
          </button>
        </div>
        <SiteDetailBody site={site} epPlausibelH={epPlausibelH} />
      </div>
    </div>
  );
}
