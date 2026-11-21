export type CustomProfileParseResult =
  | { ok: true; values: number[]; label: string; note?: string }
  | { ok: false; error: string };

export type SampleProfileId = "stadt_abend" | "pv_bipolar" | "trafo_engpass";

export type SampleSubstationProfile = {
  id: SampleProfileId;
  shortLabel: string;
  label: string;
  description: string;
  defaultLimitMw: number;
  values: number[];
};

export type KnotenVerdictLevel = "high" | "medium" | "low";

export type KnotenRecommendation = {
  level: KnotenVerdictLevel;
  badgeLabel: string;
  recommendedMode: string;
  minPowerMw: number;
  recommendedPowerMw: number;
  recommendedEnergyMwh: number;
  recommendedHours: number;
  maxOverloadMw: number;
  qhOverBase: number;
  qhOverMarket: number;
  qhOverKnoten: number;
  maxUtilBasePct: number;
  maxUtilMarketPct: number;
  maxUtilKnotenPct: number;
  maxAbsBaseMw: number;
  maxAbsMarketMw: number;
  maxAbsKnotenMw: number;
  criticalTime: string;
  sentences: string[];
};

export type CustomBessSimulation = {
  base: number[];
  market: number[];
  withBess: number[];
  bessDispatchMw: number[];
  socPct: number[];
  recommendation: KnotenRecommendation;
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

function roundUpStep(val: number, step: number): number {
  if (val <= 0) return 0;
  return Math.ceil(val / step) * step;
}

function parseLocalizedNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "").replace(/\u00A0|\s+/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses a generic quarter-hour CSV/TXT profile locally in the browser.
 * Accepts semicolon, comma, or tab delimiters; optional header and timestamp column.
 * If more than 96 quarter-hours (multi-day export) are provided, selects the peak 24h day automatically.
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

  const cleanLabel = filename.replace(/\.[^.]+$/, "");

  if (values.length >= 192) {
    const dayCount = Math.floor(values.length / 96);
    let bestDay = 0;
    let bestPeak = -1;
    for (let d = 0; d < dayCount; d += 1) {
      let dayPeak = 0;
      for (let q = 0; q < 96; q += 1) {
        const a = Math.abs(values[d * 96 + q] ?? 0);
        if (a > dayPeak) dayPeak = a;
      }
      if (dayPeak > bestPeak) {
        bestPeak = dayPeak;
        bestDay = d;
      }
    }
    return {
      ok: true,
      values: values.slice(bestDay * 96, bestDay * 96 + 96),
      label: cleanLabel,
      note: `Spitzentag (Tag ${bestDay + 1} von ${dayCount}) automatisch aus Mehrtages-CSV gewählt.`,
    };
  }

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

  return { ok: true, values: normalized, label: cleanLabel };
}

export const SAMPLE_SUBSTATION_PROFILES: readonly SampleSubstationProfile[] = [
  {
    id: "stadt_abend",
    shortLabel: "Stadt-UW (Abendspitze)",
    label: "Städtisches HS/MS-UW (Wärme & E-Mobilität)",
    description: "Steile Abendspitze bis 94\u00A0MW durch Wärmepumpen und Heimladung an einer 80\u00A0MW Grenze.",
    defaultLimitMw: 80,
    values: Array.from({ length: 96 }, (_, i) => {
      const h = i / 4;
      const base = 46 + 12 * Math.sin(((h - 6.5) / 24) * Math.PI * 2);
      const morning = 16 * Math.exp(-Math.pow((h - 8.25) / 1.5, 2));
      const evening = 40 * Math.exp(-Math.pow((h - 19.25) / 1.85, 2));
      return Number((base + morning + evening).toFixed(2));
    }),
  },
  {
    id: "pv_bipolar",
    shortLabel: "PV-Knoten (bipolar)",
    label: "PV- & Lastknoten (Mittags-Rückspeisung + Abendspitze)",
    description: "Starke PV-Rückspeisung bis −88\u00A0MW mittags und +91\u00A0MW Bezug am Abend.",
    defaultLimitMw: 80,
    values: Array.from({ length: 96 }, (_, i) => {
      const h = i / 4;
      const base = 44 + 10 * Math.sin(((h - 7) / 24) * Math.PI * 2);
      const pvDip = h >= 8 && h <= 17 ? -138 * Math.sin(((h - 8) / 9) * Math.PI) : 0;
      const evening = 43 * Math.exp(-Math.pow((h - 19.5) / 1.9, 2));
      return Number((base + pvDip + evening).toFixed(2));
    }),
  },
  {
    id: "trafo_engpass",
    shortLabel: "Bestands-UW (N-1-Engpass)",
    label: "Hoch ausgelastetes Bestands-UW (4\u00A0h Lastspitze)",
    description: "Anhaltende Abendlast bis 97\u00A0MW über mehrere Stunden — testet Leistung und Speicherdauer.",
    defaultLimitMw: 80,
    values: Array.from({ length: 96 }, (_, i) => {
      const h = i / 4;
      const base = 54 + 10 * Math.sin(((h - 7) / 24) * Math.PI * 2);
      const morning = 20 * Math.exp(-Math.pow((h - 9.0) / 1.8, 2));
      const longEvening = 36 * Math.exp(-Math.pow((h - 18.75) / 2.9, 2));
      return Number((base + morning + longEvening).toFixed(2));
    }),
  },
];

export function buildSampleCustomProfile(): number[] {
  return SAMPLE_SUBSTATION_PROFILES[1]!.values;
}

/**
 * Evaluates a node's base, market, and grid-friendly series against a threshold
 * and computes a deterministic BESS sizing & operating-mode recommendation.
 */
export function buildKnotenRecommendation(
  base: number[],
  market: number[],
  knoten: number[],
  limitMw: number,
  activeBessLabel?: string,
): KnotenRecommendation {
  let criticalSlot = 0;
  let maxAbsBaseMw = 0;
  let maxAbsMarketMw = 0;
  let maxAbsKnotenMw = 0;
  let qhOverBase = 0;
  let qhOverMarket = 0;
  let qhOverKnoten = 0;

  let currentRunEnergyMwh = 0;
  let maxConsecutiveOverloadMwh = 0;
  let lastSign = 0;

  for (let i = 0; i < base.length; i += 1) {
    const bVal = base[i] ?? 0;
    const mVal = market[i] ?? bVal;
    const kVal = knoten[i] ?? bVal;
    const bAbs = Math.abs(bVal);
    const mAbs = Math.abs(mVal);
    const kAbs = Math.abs(kVal);

    if (bAbs > maxAbsBaseMw) {
      maxAbsBaseMw = bAbs;
      criticalSlot = i;
    }
    if (mAbs > maxAbsMarketMw) maxAbsMarketMw = mAbs;
    if (kAbs > maxAbsKnotenMw) maxAbsKnotenMw = kAbs;

    if (bAbs > limitMw + 1e-6) {
      qhOverBase += 1;
      const sign = bVal >= 0 ? 1 : -1;
      const excessMw = bAbs - limitMw;
      if (sign === lastSign) {
        currentRunEnergyMwh += excessMw * 0.25;
      } else {
        currentRunEnergyMwh = excessMw * 0.25;
        lastSign = sign;
      }
      if (currentRunEnergyMwh > maxConsecutiveOverloadMwh) {
        maxConsecutiveOverloadMwh = currentRunEnergyMwh;
      }
    } else {
      currentRunEnergyMwh = 0;
      lastSign = 0;
    }

    if (mAbs > limitMw + 1e-6) qhOverMarket += 1;
    if (kAbs > limitMw + 1e-6) qhOverKnoten += 1;
  }

  const maxOverloadMw = Math.max(0, maxAbsBaseMw - limitMw);
  const maxUtilBasePct = limitMw > 0 ? (maxAbsBaseMw / limitMw) * 100 : 0;
  const maxUtilMarketPct = limitMw > 0 ? (maxAbsMarketMw / limitMw) * 100 : 0;
  const maxUtilKnotenPct = limitMw > 0 ? (maxAbsKnotenMw / limitMw) * 100 : 0;
  const criticalTime = `${slotIndexToTime(criticalSlot)}\u00A0Uhr`;

  // Sizing with 92% round-trip efficiency & 15% operational headroom
  const rawPower = maxOverloadMw > 0.1 ? maxOverloadMw * 1.05 : 0;
  const recommendedPowerMw = rawPower > 0 ? Math.max(5, roundUpStep(rawPower, 5)) : 0;
  const rawEnergy = maxConsecutiveOverloadMwh > 0.05 ? (maxConsecutiveOverloadMwh / 0.92) * 1.15 : 0;
  const recommendedHours =
    recommendedPowerMw > 0 && rawEnergy / recommendedPowerMw > 2 ? 4 : 2;
  const recommendedEnergyMwh =
    recommendedPowerMw > 0
      ? Math.max(recommendedPowerMw * recommendedHours, roundUpStep(rawEnergy, 5))
      : 0;

  let level: KnotenVerdictLevel;
  let badgeLabel: string;
  let recommendedMode: string;

  if (qhOverBase >= 4 || maxUtilBasePct >= 105) {
    level = "high";
    badgeLabel = "Hoher Netznutzen durch BESS";
    recommendedMode = "Knotentreue Fahrweise (§\u00A017 Abs.\u00A02b EnWG)";
  } else if (qhOverBase > 0 || qhOverMarket > 0 || maxUtilBasePct >= 90) {
    level = "medium";
    badgeLabel = "Bedingt sinnvoll · Leistungsdeckel nötig";
    recommendedMode = "Marktbetrieb nur mit dynamischem Knoten-Deckel";
  } else {
    level = "low";
    badgeLabel = "Kein akuter Knoten-Engpass";
    recommendedMode = "Standard-Marktbetrieb im Limit";
  }

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

  if (qhOverMarket > qhOverBase) {
    sentences.push(
      `Reines Preisfahren verschärft den Knoten von ${qhOverBase} auf ${qhOverMarket}\u00A0Viertelstunden über Grenze (Spitze ${fmtMw(maxAbsMarketMw)}, ${fmtPct(maxUtilMarketPct)}).`,
    );
  } else if (qhOverMarket > 0) {
    sentences.push(
      `Im reinen Markt-Fahrplan verbleiben ${qhOverMarket}\u00A0Viertelstunden über ±${limitMw}\u00A0MW (Spitze ${fmtMw(maxAbsMarketMw)}).`,
    );
  }

  const label = activeBessLabel ?? "knotentreuer Fahrweise";
  if (qhOverKnoten === 0 && (qhOverBase > 0 || qhOverMarket > 0)) {
    sentences.push(
      `Mit ${label} sinken alle Überschreitungen auf 0\u00A0Viertelstunden (neue Spitze ${fmtMw(maxAbsKnotenMw)}, ${fmtPct(maxUtilKnotenPct)}).`,
    );
  } else if (qhOverKnoten < qhOverBase) {
    sentences.push(
      `Mit ${label} sinken die Überschreitungen von ${qhOverBase} auf ${qhOverKnoten}\u00A0Viertelstunden (Spitze ${fmtMw(maxAbsKnotenMw)}).`,
    );
  } else if (qhOverBase > 0) {
    sentences.push(
      `Für eine vollständige Entlastung unter ±${limitMw}\u00A0MW empfiehlt die Auswertung mindestens ${recommendedPowerMw}\u00A0MW / ${recommendedEnergyMwh}\u00A0MWh (${recommendedHours}\u00A0h) in knotentreuer Fahrweise.`,
    );
  }

  return {
    level,
    badgeLabel,
    recommendedMode,
    minPowerMw: maxOverloadMw,
    recommendedPowerMw,
    recommendedEnergyMwh,
    recommendedHours,
    maxOverloadMw,
    qhOverBase,
    qhOverMarket,
    qhOverKnoten,
    maxUtilBasePct,
    maxUtilMarketPct,
    maxUtilKnotenPct,
    maxAbsBaseMw,
    maxAbsMarketMw,
    maxAbsKnotenMw,
    criticalTime,
    sentences,
  };
}

/**
 * Deterministic local-in-browser simulation of BOTH:
 * 1) Unconstrained Day-Ahead market arbitrage (charges midday solar trough, discharges morning/evening price peaks)
 * 2) Grid-friendly ("knotentreu") peak-shaving & reverse-flow-absorption dispatch at ±limitMw.
 */
export function simulateCustomKnotenBess(
  baseMw: number[],
  limitMw: number,
  bessPowerMw: number,
  bessEnergyMwh: number,
): CustomBessSimulation {
  const dt = 0.25;
  const eta = 0.96;
  const cap = Math.max(1, bessEnergyMwh);
  const pMax = Math.max(0.5, bessPowerMw);

  // 1) Synthetic typical German Day-Ahead market dispatch (price-driven, ignores local substation limit)
  let socMarket = cap * 0.45;
  const market: number[] = [];
  for (let i = 0; i < baseMw.length; i += 1) {
    const h = i / 4;
    const load = baseMw[i] ?? 0;
    let pMkt = 0;
    // Charge during night trough (02:00–05:00) & midday PV trough (11:30–14:30)
    if ((h >= 2 && h < 5) || (h >= 11.5 && h < 14.5)) {
      pMkt = Math.min(pMax * 0.85, (cap - socMarket) / (eta * dt));
    } else if ((h >= 7.5 && h < 9.5) || (h >= 18 && h < 20.5)) {
      // Discharge during morning/evening price peaks
      pMkt = -Math.min(pMax * 0.85, (socMarket * eta) / dt);
    }
    if (pMkt >= 0) {
      socMarket = Math.min(cap, socMarket + pMkt * eta * dt);
    } else {
      socMarket = Math.max(0, socMarket + (pMkt / eta) * dt);
    }
    market.push(Number((load + pMkt).toFixed(2)));
  }

  // 2) Grid-friendly ("knotentreu") dispatch strictly respecting ±limitMw where physically possible
  let socMwh = cap * 0.5;
  const withBess: number[] = [];
  const bessDispatchMw: number[] = [];
  const socPct: number[] = [];

  for (let i = 0; i < baseMw.length; i += 1) {
    const load = baseMw[i] ?? 0;
    let pBatt = 0;

    if (load > limitMw) {
      const neededDischarge = load - limitMw;
      const maxDischargeFromSoc = (socMwh * eta) / dt;
      pBatt = -Math.min(pMax, neededDischarge, maxDischargeFromSoc);
    } else if (load < -limitMw) {
      const neededCharge = -limitMw - load;
      const maxChargeToSoc = (cap - socMwh) / (eta * dt);
      pBatt = Math.min(pMax, neededCharge, maxChargeToSoc);
    } else {
      const targetSoc = cap * 0.5;
      const safeMargin = limitMw * 0.85;
      if (socMwh < targetSoc - 0.1 && load < safeMargin) {
        const headroom = safeMargin - load;
        pBatt = Math.max(0, Math.min(pMax * 0.4, headroom, (targetSoc - socMwh) / (eta * dt)));
      } else if (socMwh > targetSoc + 0.1 && load > -safeMargin) {
        const headroom = load + safeMargin;
        pBatt = -Math.max(0, Math.min(pMax * 0.4, headroom, ((socMwh - targetSoc) * eta) / dt));
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

  const recommendation = buildKnotenRecommendation(
    baseMw,
    market,
    withBess,
    limitMw,
    `knotentreuem Speicher (${bessPowerMw}\u00A0MW / ${bessEnergyMwh}\u00A0MWh)`,
  );

  return { base: baseMw, market, withBess, bessDispatchMw, socPct, recommendation };
}

export function buildAnalyticsReportText({
  profileName,
  limitMw,
  recommendation,
  bessLabel,
}: {
  profileName: string;
  limitMw: number;
  recommendation: KnotenRecommendation;
  bessLabel: string;
}): string {
  const lines = [
    `SpeicherPilot · Umspannwerk-Analyse (${profileName})`,
    `Knotengrenze: ±${limitMw}\u00A0MW | Bewertung: ${recommendation.badgeLabel}`,
    `Empfohlene Fahrweise: ${recommendation.recommendedMode}`,
    recommendation.recommendedPowerMw > 0
      ? `Empfohlene BESS-Mindestgröße: ${recommendation.recommendedPowerMw}\u00A0MW / ${recommendation.recommendedEnergyMwh}\u00A0MWh (${recommendation.recommendedHours}\u00A0h)`
      : `Empfohlene BESS-Mindestgröße: Kein netzbedingter Speicherbedarf`,
    ``,
    `Vergleich (96\u00A0Viertelstunden, Grenze ±${limitMw}\u00A0MW):`,
    `- Ohne Speicher: ${recommendation.qhOverBase}\u00A0QH über Grenze (Max. ${fmtMw(recommendation.maxAbsBaseMw)} / ${fmtPct(recommendation.maxUtilBasePct)})`,
    `- Markt-Fahrplan: ${recommendation.qhOverMarket}\u00A0QH über Grenze (Max. ${fmtMw(recommendation.maxAbsMarketMw)} / ${fmtPct(recommendation.maxUtilMarketPct)})`,
    `- Knotentreu (${bessLabel}): ${recommendation.qhOverKnoten}\u00A0QH über Grenze (Max. ${fmtMw(recommendation.maxAbsKnotenMw)} / ${fmtPct(recommendation.maxUtilKnotenPct)})`,
    ``,
    `Diagnose:`,
    ...recommendation.sentences.map((s) => `- ${s}`),
    ``,
    `Quelle: https://www.speicherpilot.app/knoten (lokale Browser-Auswertung, Modellrechnung zur fachlichen Einordnung)`,
  ];
  return lines.join("\n");
}
