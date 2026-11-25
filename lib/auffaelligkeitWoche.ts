import {
  NATIONAL_FLEET_STRATEGY_UI,
  type NationalFleetFactor,
  type NationalFleetRunSeries,
  type NationalFleetStrategyUi,
} from "@/lib/nationalMonthFleetModel";

/** Schema der Tagesdateien von speicherpilot (forschung/auffaelligkeit_woche_v1). */
export const AUFFAELLIGKEIT_WOCHE_SCHEMA = "auffaelligkeit-woche/1";

export const AUFFAELLIGKEIT_WOCHE_REL_DIR = "data/auffaelligkeit-woche/tage";

/**
 * Eine Referenzflotte (4,64 GW) heißt im Repo Stufe ×2
 * (Zusatzflotte = (k−1)×Basis). Stufe ×1 ist der Ist ohne Zusatzflotte (0).
 */
export const REFERENCE_FLEET_REPO_FACTOR: NationalFleetFactor = 2;

export function auffaelligkeitWocheRelPath(dayKey: string): string {
  return `${AUFFAELLIGKEIT_WOCHE_REL_DIR}/${dayKey}.json`;
}

export type WocheFahrweiseKennzahlen = {
  erloesEur: number;
  geladenMwh: number;
  entladenMwh: number;
  roundTripVerlustMwh: number;
  durchsatzMwh: number;
  senkungGw: number;
  spitzeVorherGw: number;
  spitzeVorherUhrzeit: string;
  spitzeNachherGw: number;
  spitzeNachherUhrzeit: string;
};

export type WocheZeitreiheStrategy = {
  c_mw: number[];
  d_mw: number[];
  e_mwh: number[];
  r_prime_mw: number[];
};

export type AuffaelligkeitWocheTag = {
  schema: string;
  dateBerlin: string;
  fahrweisen: Record<NationalFleetStrategyUi, WocheFahrweiseKennzahlen>;
  vergleich: {
    spitzeMinusMarktEur: number;
    spitzeMinusMarktProzent: number;
    senkungSpitzeMinusMarktGw?: number;
    grenzeDe?: string;
  };
  zeitreihe: {
    timestampBerlin: string[];
    restlastMw: number[];
    dayAheadEurMwh: number[];
    markt: WocheZeitreiheStrategy;
    ueberschuss: WocheZeitreiheStrategy;
    spitze: WocheZeitreiheStrategy;
  };
};

function isFiniteNumberArray(value: unknown, length: number): value is number[] {
  return Array.isArray(value) && value.length === length && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

function isStrategyZeitreihe(value: unknown, intervalCount: number): value is WocheZeitreiheStrategy {
  if (!value || typeof value !== "object") {
    return false;
  }
  const z = value as Record<string, unknown>;
  return (
    isFiniteNumberArray(z.c_mw, intervalCount) &&
    isFiniteNumberArray(z.d_mw, intervalCount) &&
    isFiniteNumberArray(z.e_mwh, intervalCount + 1) &&
    isFiniteNumberArray(z.r_prime_mw, intervalCount)
  );
}

function isFahrweise(value: unknown): value is WocheFahrweiseKennzahlen {
  if (!value || typeof value !== "object") {
    return false;
  }
  const f = value as Record<string, unknown>;
  return typeof f.erloesEur === "number" && Number.isFinite(f.erloesEur) && typeof f.geladenMwh === "number" && typeof f.entladenMwh === "number";
}

export function isAuffaelligkeitWocheTag(value: unknown): value is AuffaelligkeitWocheTag {
  if (!value || typeof value !== "object") {
    return false;
  }
  const d = value as Record<string, unknown>;
  if (d.schema !== AUFFAELLIGKEIT_WOCHE_SCHEMA || typeof d.dateBerlin !== "string") {
    return false;
  }
  const zr = d.zeitreihe as Record<string, unknown> | undefined;
  const fw = d.fahrweisen as Record<string, unknown> | undefined;
  const vgl = d.vergleich as Record<string, unknown> | undefined;
  if (!zr || !fw || !vgl || !Array.isArray(zr.timestampBerlin) || zr.timestampBerlin.length === 0) {
    return false;
  }
  const n = zr.timestampBerlin.length;
  return (
    isFahrweise(fw.spitze) &&
    isFahrweise(fw.markt) &&
    isFahrweise(fw.ueberschuss) &&
    typeof vgl.spitzeMinusMarktEur === "number" &&
    typeof vgl.spitzeMinusMarktProzent === "number" &&
    isFiniteNumberArray(zr.restlastMw, n) &&
    isFiniteNumberArray(zr.dayAheadEurMwh, n) &&
    isStrategyZeitreihe(zr.spitze, n) &&
    isStrategyZeitreihe(zr.markt, n) &&
    isStrategyZeitreihe(zr.ueberschuss, n)
  );
}

export function wocheZeitreiheToFleetRun(
  doc: AuffaelligkeitWocheTag,
  strategy: NationalFleetStrategyUi,
  sourceSha256 = "",
): NationalFleetRunSeries {
  const block = doc.zeitreihe[strategy];
  const n = doc.zeitreihe.timestampBerlin.length;
  return {
    factor: REFERENCE_FLEET_REPO_FACTOR,
    strategySlug: NATIONAL_FLEET_STRATEGY_UI[strategy].fileKey,
    strategyUi: strategy,
    sourceSha256,
    intervalCount: n,
    timestamp_berlin: doc.zeitreihe.timestampBerlin,
    c_mw: block.c_mw,
    d_mw: block.d_mw,
    e_start_mwh: block.e_mwh.slice(0, n),
    e_end_mwh: block.e_mwh.slice(1),
    r_mw: doc.zeitreihe.restlastMw,
    r_prime_mw: block.r_prime_mw,
    day_ahead_eur_mwh: doc.zeitreihe.dayAheadEurMwh,
  };
}
