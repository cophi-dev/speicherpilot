/** Blocklisted grid-operator and project names — visible copy only, not code identifiers. */
const BLOCKLIST: readonly string[] = [
  "50Hertz",
  "TenneT",
  "Tennet",
  "Amprion",
  "TransnetBW",
  "SH Netz",
  "SH-Netz",
  "Schleswig-Holstein Netz",
  "Hamburger Energienetze",
  "HNE",
  "Stromnetz Hamburg",
  "Stromnetz Berlin",
  "Bayernwerk",
  "E.DIS",
  "Avacon",
  "Westnetz",
  "Netze BW",
  "MITNETZ",
  "WEMAG",
  "Syna",
  "N-ERGIE",
  "LEW Verteilnetz",
  "ED Netze",
  "Bollingstedt",
  "ECO STOR",
  "Alpiq",
  "Eco Power One",
];

const FORBIDDEN_PHRASES: readonly string[] = [
  "Anschlussprüfung",
  "Anschluss prüfen",
  "Netzanschlussprüfung",
  "Prüfung des Netzanschlusses",
];

export function gridOperatorBlocklist(): readonly string[] {
  return BLOCKLIST;
}

export function forbiddenConnectionPhrases(): readonly string[] {
  return FORBIDDEN_PHRASES;
}

export function containsGridOperatorName(text: string): boolean {
  const normalized = text.normalize("NFKC");
  for (const name of BLOCKLIST) {
    if (normalized.includes(name)) {
      return true;
    }
  }
  return false;
}

export function containsForbiddenPhrase(text: string): boolean {
  const normalized = text.normalize("NFKC");
  for (const phrase of FORBIDDEN_PHRASES) {
    if (normalized.includes(phrase)) {
      return true;
    }
  }
  return false;
}

/** SMARD / live chart zone labels without TSO names. */
export const REGELZONE_LABELS = {
  nordost: "Regelzone Nordost",
  suedwest: "Regelzone Südwest",
  nordSuedMitte: "Regelzone Nord-Süd (Mitte)",
  offshore: "Wind auf See (Nord- und Ostsee)",
} as const;
