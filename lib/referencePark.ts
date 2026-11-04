/**
 * Operating reference anchor — anonymised large storage at a rural 110 kV node.
 */
export type ReferenceParkSource = {
  publisher: string;
  dateIso: string;
  href: string;
  retrievedIso: string;
};

export type ReferenceParkUnit = {
  seeId: string;
  powerMw: number;
  energyMwh: number;
  href: string;
};

export { GROSSSPEICHER_ANKER } from "@/lib/grossspeicherAnker";

const RETRIEVED = "2026-11-04";

export const REFERENCE_PARK = {
  nameDe: "Großspeicher am ländlichen 110-kV-Knoten",
  nameEn: "Large storage at a rural 110 kV node",
  project: "",
  operator: "",
  owner: "",
  ownerSinceIso: "",
  placeDe: "",
  placeEn: "",
  districtDe: "",
  districtEn: "",
  state: "",
  powerMw: 100,
  energyMwh: 230,
  operatorEnergyMwh: 230,
  voltageLevel: "HS" as const,
  voltageKv: 110,
  gridOperator: "",
  commissioningIso: "",
  statusDe: "Modellanker",
  statusEn: "Model anchor",
  mastrUnits: [] as ReferenceParkUnit[],
  connection: {
    type: "fca-dynamic" as const,
    publishedLimitMw: null as number | null,
  },
  dashboardHref: "",
  sources: [
    {
      publisher: "Marktstammdatenregister (öffentliche Summen)",
      dateIso: "2026-11-04",
      href: "https://www.marktstammdatenregister.de/MaStR",
      retrievedIso: RETRIEVED,
    },
  ] as ReferenceParkSource[],
};

export function referenceParkHoursAtFullPower(): number {
  return REFERENCE_PARK.energyMwh / REFERENCE_PARK.powerMw;
}

export function referenceParkCRate(): number {
  return REFERENCE_PARK.powerMw / REFERENCE_PARK.energyMwh;
}
