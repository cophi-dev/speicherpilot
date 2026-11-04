/**
 * Anonymous reference anchor: large storage at a rural 110 kV node.
 * Size rounded to 100 MW / 230 MWh per product spec — no operator, place, or grid company.
 */
export const GROSSSPEICHER_ANKER = {
  nameDe: "Großspeicher am ländlichen 110-kV-Knoten",
  nameEn: "Large storage at a rural 110 kV node",
  powerMw: 100,
  energyMwh: 230,
  voltageLevel: "HS" as const,
  voltageKv: 110,
  statusDe: "Größenordnung eines in Betrieb befindlichen Großspeichers laut Marktstammdatenregister",
  statusEn: "Order of magnitude of an operating large storage unit per market master data register",
  modelTagDe: "MODELLTAG · Großspeicher 100 MW",
  modelTagEn: "MODEL DAY · 100 MW large storage",
  connection: {
    type: "fca-dynamic" as const,
    publishedLimitMw: null,
  },
  sources: [
    {
      publisher: "Marktstammdatenregister (Summen öffentlich)",
      dateIso: "2026-11-04",
      href: "https://www.marktstammdatenregister.de/MaStR",
      retrievedIso: "2026-11-04",
    },
  ],
} as const;

export function grossspeicherHoursAtFullPower(): number {
  return GROSSSPEICHER_ANKER.energyMwh / GROSSSPEICHER_ANKER.powerMw;
}

export function grossspeicherCRate(): number {
  return GROSSSPEICHER_ANKER.powerMw / GROSSSPEICHER_ANKER.energyMwh;
}

/** @deprecated Use GROSSSPEICHER_ANKER — kept for incremental migration */
export const REFERENCE_PARK = GROSSSPEICHER_ANKER;

export function referenceParkHoursAtFullPower(): number {
  return grossspeicherHoursAtFullPower();
}

export function referenceParkCRate(): number {
  return grossspeicherCRate();
}
