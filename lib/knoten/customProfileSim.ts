export type CustomProfileParseResult =
  | { ok: true; values: number[]; label: string }
  | { ok: false; error: string };

export type KnotenDiagnosis = {
  criticalSlot: number;
  criticalTime: string;
  maxAbsBaseMw: number;
  maxAbsBessMw: number;
  maxUtilBasePct: number;
  maxUtilBessPct: number;
  qhOverBase: number;
  qhOverBess: number;
  minNeededPowerMw: number;
  sentences: string[];
};

export type CustomBessSimulation = {
  base: number[];
  withBess: number[];
  bessDispatchMw: number[];
  socPct: number[];
  diagnosis: KnotenDiagnosis;
};

export function slotIndexToTime(index: number): string {
  const clamped = Math.max(0, Math.min(95, Math.floor(index)));
  const totalMinutes = clamped * 15;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function fmtMw(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}\u00A0MW`;
}

function fmtPct(v: number): string {
  return `${Math.round(v)}\u00A0%`;
}

function parseLocalizedNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").replace(/\u00A0|\s+/g, "");
  if (!cleaned) return null;
  // Support German decimal comma (e.g. "-42,5") and English dot ("-42.5").
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses a generic 96-quarter-hour CSV/TXT profile locally in the browser.
 * Accepts semicolon, comma, or tab delimiters; optional header row and optional timestamp column.
 */
export function parseQuarterHourCsv(text: string, filename = "Eigenes Profil"): CustomProfileParseResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length < 12) {
    return {
      ok: false,
      error: "Zu wenige Zeilen erkannt. Bitte eine CSV mit 96\u00A0Viertelstundenwerten (MW) laden.",
    };
  }

  const sample = lines[Math.min(1, lines.length - 1)]!;
  const delimiter = sample.includes(";") ? ";" : sample.includes("\t") ? "\t" : ",";

  const values: number[] = [];
  for (const line of lines) {
    const cols = line.split(delimiter).map((c) => c.trim());
    // If first column looks like a timestamp/date (contains ":" or "-" or "."), read column 1, else column 0.
    const firstIsTime = /[:T]|^\d{4}-\d{2}-\d{2}|^\d{2}\.\d{2}\./.test(cols[0] ?? "");
    const candidate = firstIsTime ? cols[1] : cols[0];
    const num = candidate != null ? parseLocalizedNumber(candidate) : null;
    if (num !== null) {
      values.push(num);
    }
  }

  if (values.length < 24) {
    return {
      ok: false,
      error: "Keine gültige MW-Spalte gefunden. Erwartet: „Uhrzeit;Last_MW“ oder eine Spalte mit MW-Werten.",
    };
  }

  // Normalize to 96 quarter-hours (take first 96 if longer, repeat/pad 24 hourly values x4 if 24h).
  let normalized: number[];
  if (values.length >= 96) {
    normalized = values.slice(0, 96);
  } else if (values.length === 24) {
    normalized = values.flatMap((v) => [v, v, v, v]);
  } else {
    normalized = Array.from({ length: 96 }, (_, i) => {
      const srcIdx = Math.min(values.length - 1, Math.floor((i / 96) * values.length));
      return values[srcIdx]!;
    });
  }

  return { ok: true, values: normalized, label: filename.replace(/\.[^.]+$/, "") };
}

/**
 * Generates a realistic 96-quarter-hour synthetic substation load/feed-in profile (MW)
 * for instant local testing without uploading a file.
 */
export function buildSampleCustomProfile(): number[] {
  return Array.from({ length: 96 }, (_, i) => {
    const h = i / 4;
    // Morning ramp + midday PV dip (reverse flow) + steep evening peak above 80 MW.
    const baseLoad = 48 + 14 * Math.sin(((h - 7) / 24) * Math.PI * 2);
    const pvDip = h >= 8 && h <= 17 ? -68 * Math.sin(((h - 8) / 9) * Math.PI) : 0;
    const eveningPeak = 44 * Math.exp(-Math.pow((h - 19.25) / 2.1, 2));
    const morningPeak = 18 * Math.exp(-Math.pow((h - 8.5) / 1.6, 2));
    return Number((baseLoad + pvDip + eveningPeak + morningPeak).toFixed(2));
  });
}

export function buildKnotenDiagnosis(
  base: number[],
  comparison: number[],
  limitMw: number,
  comparisonLabel: string,
): KnotenDiagnosis {
  let criticalSlot = 0;
  let maxAbsBaseMw = 0;
  let maxAbsBessMw = 0;
  let qhOverBase = 0;
  let qhOverBess = 0;

  for (let i = 0; i < base.length; i += 1) {
    const b = Math.abs(base[i] ?? 0);
    const c = Math.abs(comparison[i] ?? 0);
    if (b > maxAbsBaseMw) {
      maxAbsBaseMw = b;
      criticalSlot = i;
    }
    if (c > maxAbsBessMw) {
      maxAbsBessMw = c;
    }
    if (b > limitMw + 1e-6) qhOverBase += 1;
    if (c > limitMw + 1e-6) qhOverBess += 1;
  }

  const maxUtilBasePct = limitMw > 0 ? (maxAbsBaseMw / limitMw) * 100 : 0;
  const maxUtilBessPct = limitMw > 0 ? (maxAbsBessMw / limitMw) * 100 : 0;
  const minNeededPowerMw = Math.max(0, maxAbsBaseMw - limitMw);
  const criticalTime = `${slotIndexToTime(criticalSlot)}\u00A0Uhr`;

  const sentences: string[] = [];
  if (qhOverBase === 0) {
    sentences.push(
      `Ohne Speicher bleibt der Knoten an allen 96\u00A0Viertelstunden unter ±${limitMw}\u00A0MW (Maximum ${fmtMw(maxAbsBaseMw)} um ${criticalTime}, ${fmtPct(maxUtilBasePct)} Auslastung).`,
    );
  } else {
    sentences.push(
      `Kritischster Zeitpunkt ohne Speicher: ${criticalTime} mit ${fmtMw(maxAbsBaseMw)} (${fmtPct(maxUtilBasePct)} von ±${limitMw}\u00A0MW; insgesamt ${qhOverBase}\u00A0Viertelstunden über Grenze).`,
    );
  }

  if (qhOverBess === 0 && qhOverBase > 0) {
    sentences.push(
      `Mit ${comparisonLabel} verschwinden alle Überschreitungen vollständig (0\u00A0Viertelstunden über Grenze, neue Spitze ${fmtMw(maxAbsBessMw)}).`,
    );
  } else if (qhOverBess < qhOverBase) {
    sentences.push(
      `Mit ${comparisonLabel} sinken die Überschreitungen von ${qhOverBase} auf ${qhOverBess}\u00A0Viertelstunden (neue Spitze ${fmtMw(maxAbsBessMw)}, ${fmtPct(maxUtilBessPct)}).`,
    );
  } else if (qhOverBess > qhOverBase) {
    sentences.push(
      `Achtung: ${comparisonLabel} erhöht die Grenzwert-Überschreitungen von ${qhOverBase} auf ${qhOverBess}\u00A0Viertelstunden (Spitze ${fmtMw(maxAbsBessMw)}, ${fmtPct(maxUtilBessPct)}).`,
    );
  } else {
    sentences.push(
      `Unter ${comparisonLabel} liegt die maximale Knotenauslastung bei ${fmtMw(maxAbsBessMw)} (${fmtPct(maxUtilBessPct)}, ${qhOverBess}\u00A0Viertelstunden über ±${limitMw}\u00A0MW).`,
    );
  }

  if (minNeededPowerMw > 0.1) {
    sentences.push(
      `Für eine vollständige Kappung der Basisspitze unter ±${limitMw}\u00A0MW wären mindestens ${fmtMw(minNeededPowerMw)} netzdienliche Speicherleistung nötig.`,
    );
  }

  return {
    criticalSlot,
    criticalTime,
    maxAbsBaseMw,
    maxAbsBessMw,
    maxUtilBasePct,
    maxUtilBessPct,
    qhOverBase,
    qhOverBess,
    minNeededPowerMw,
    sentences,
  };
}

/**
 * Deterministic local-in-browser peak-shaving & reverse-flow-absorption BESS simulation.
 * Positive flow = import from HV grid; negative flow = feed-in to HV grid.
 * Positive bessDispatchMw = charging (increases import); negative = discharging (reduces import).
 */
export function simulateCustomKnotenBess(
  baseMw: number[],
  limitMw: number,
  bessPowerMw: number,
  bessEnergyMwh: number,
): CustomBessSimulation {
  const dt = 0.25;
  const eta = 0.96; // one-way efficiency (~92% round-trip)
  const cap = Math.max(1, bessEnergyMwh);
  const pMax = Math.max(0.5, bessPowerMw);
  let socMwh = cap * 0.5;

  const withBess: number[] = [];
  const bessDispatchMw: number[] = [];
  const socPct: number[] = [];

  for (let i = 0; i < baseMw.length; i += 1) {
    const load = baseMw[i] ?? 0;
    let pBatt = 0; // + = charge, - = discharge

    if (load > limitMw) {
      // Shave positive peak by discharging.
      const neededDischarge = load - limitMw;
      const maxDischargeFromSoc = (socMwh * eta) / dt;
      const discharge = Math.min(pMax, neededDischarge, maxDischargeFromSoc);
      pBatt = -discharge;
    } else if (load < -limitMw) {
      // Absorb excess feed-in by charging.
      const neededCharge = -limitMw - load;
      const maxChargeToSoc = (cap - socMwh) / (eta * dt);
      const charge = Math.min(pMax, neededCharge, maxChargeToSoc);
      pBatt = charge;
    } else {
      // Gentle SoC re-centering toward 50% when safely inside 70% of limit.
      const targetSoc = cap * 0.5;
      const safeMargin = limitMw * 0.85;
      if (socMwh < targetSoc - 0.1 && load < safeMargin) {
        const headroom = safeMargin - load;
        const charge = Math.min(pMax * 0.4, headroom, (targetSoc - socMwh) / (eta * dt));
        pBatt = Math.max(0, charge);
      } else if (socMwh > targetSoc + 0.1 && load > -safeMargin) {
        const headroom = load + safeMargin;
        const discharge = Math.min(pMax * 0.4, headroom, ((socMwh - targetSoc) * eta) / dt);
        pBatt = -Math.max(0, discharge);
      }
    }

    if (pBatt >= 0) {
      socMwh = Math.min(cap, socMwh + pBatt * eta * dt);
    } else {
      socMwh = Math.max(0, socMwh + (pBatt / eta) * dt);
    }

    bessDispatchMw.push(Number(pBatt.toFixed(2)));
    withBess.push(Number((load + pBatt).toFixed(2)));
    socPct.push(Number(((socMwh / cap) * 100).toFixed(1)));
  }

  const diagnosis = buildKnotenDiagnosis(
    baseMw,
    withBess,
    limitMw,
    `knotentreuem Speicher (${bessPowerMw}\u00A0MW / ${bessEnergyMwh}\u00A0MWh)`,
  );

  return { base: baseMw, withBess, bessDispatchMw, socPct, diagnosis };
}
