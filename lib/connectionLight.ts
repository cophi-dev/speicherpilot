export type ConnectionLightStatus = "ok" | "tight" | "over" | "missing";

export type ConnectionLight = {
  status: ConnectionLightStatus;
  peakKw: number | null;
  limitKw: number | null;
  /** Peak divided by the connection. Null when the connection is missing. */
  ratio: number | null;
  label: { de: string; en: string };
  sentence: { de: string; en: string };
};

function kw(value: number, language: "de" | "en"): string {
  return new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Connection traffic light.
 * Over the limit: does not fit. From 90 % up to the limit: tight. Below 90 %: fits.
 * A missing or non-positive limit stays gray.
 */
export function connectionLight(peakKw: number, limitKw: number): ConnectionLight {
  if (!Number.isFinite(peakKw) || peakKw < 0 || !Number.isFinite(limitKw) || limitKw <= 0) {
    return {
      status: "missing",
      peakKw: Number.isFinite(peakKw) ? peakKw : null,
      limitKw: Number.isFinite(limitKw) ? limitKw : null,
      ratio: null,
      label: { de: "Anschlussleistung fehlt", en: "Connection capacity is missing" },
      sentence: { de: "Anschlussleistung fehlt.", en: "Connection capacity is missing." },
    };
  }

  const ratio = peakKw / limitKw;
  const status: ConnectionLightStatus = ratio > 1 ? "over" : ratio >= 0.9 ? "tight" : "ok";
  const dePeak = kw(peakKw, "de");
  const enPeak = kw(peakKw, "en");
  const deLimit = kw(limitKw, "de");
  const enLimit = kw(limitKw, "en");
  const verdict = {
    ok: { de: "passt", en: "fits" },
    tight: { de: "knapp", en: "tight" },
    over: { de: "passt nicht", en: "does not fit" },
  }[status];

  return {
    status,
    peakKw,
    limitKw,
    ratio,
    label: {
      de: status === "ok" ? "PASST" : status === "tight" ? "KNAPP" : "PASST NICHT",
      en: status === "ok" ? "FITS" : status === "tight" ? "TIGHT" : "DOES NOT FIT",
    },
    sentence: {
      de: `Spitze ${dePeak} kW, Anschluss ${deLimit} kW: ${verdict.de}.`,
      en: `Peak ${enPeak} kW, connection ${enLimit} kW: ${verdict.en}.`,
    },
  };
}
