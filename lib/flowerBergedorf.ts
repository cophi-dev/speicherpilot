/**
 * Public reference case. Figures below are only what Flower and pv magazine
 * published. No voltage, connection capacity, revenue, or price.
 */
export const FLOWER_BERGEDORF = {
  nameDe: "Flower BESS Hamburg-Bergedorf",
  nameEn: "Flower BESS Hamburg-Bergedorf",
  placeDe: "Hamburg-Bergedorf",
  placeEn: "Hamburg-Bergedorf",
  powerMw: 100,
  energyMwh: 400,
  constructionStartedIso: "2026-09-09",
  operationPlannedDe: "Ende 2028",
  operationPlannedEn: "end of 2028",
  marketer: "ENGIE",
  agreementDe: "Flexibility Purchase Agreement, auch virtuelles Tolling",
  agreementEn: "Flexibility Purchase Agreement, also called a virtual tolling agreement",
  sources: [
    {
      publisher: "Flower",
      dateIso: "2026-09-10",
      href: "https://www.flower.se/news/flower-begins-construction-of-hamburgs-largest-battery-storage-system/",
    },
    {
      publisher: "pv magazine",
      dateIso: "2026-09-10",
      href: "https://www.pv-magazine.de/2026/09/10/spatenstich-fuer-400-megawattstunden-batteriespeicher-in-hamburg/",
    },
  ],
} as const;

/** Hours at full power. Division of the two published figures, not a measured dispatch. */
export function flowerHoursAtFullPower(): number {
  return FLOWER_BERGEDORF.energyMwh / FLOWER_BERGEDORF.powerMw;
}
