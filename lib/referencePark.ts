/**
 * Operating reference park. Figures are the published MaStR sum and the operator's
 * own releases. No revenue and no connection limit: the flexible agreement does
 * not publish its bounds.
 *
 * MaStR energy is 2 × 119.264 MWh = 238.528 MWh. The tool uses 238.5 MWh.
 * The operator's press release says 238 MWh.
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

const RETRIEVED = "2026-10-23";

export const REFERENCE_PARK = {
  nameDe: "Großspeicher Bollingstedt",
  nameEn: "Bollingstedt large storage",
  project: "Eco Power One",
  operator: "ECO STOR",
  owner: "Alpiq",
  ownerSinceIso: "2026-08-25",
  placeDe: "Bollingstedt",
  placeEn: "Bollingstedt",
  districtDe: "Kreis Schleswig-Flensburg",
  districtEn: "Schleswig-Flensburg district",
  state: "SH",
  powerMw: 103.5,
  energyMwh: 238.5,
  /** Operator press release, rounded. The MaStR sum in the tool is `energyMwh`. */
  operatorEnergyMwh: 238,
  voltageLevel: "HS",
  voltageKv: 110,
  gridOperator: "SH Netz",
  commissioningIso: "2025-03-13",
  statusDe: "in Betrieb",
  statusEn: "in operation",
  mastrUnits: [
    {
      seeId: "SEE925543621515",
      powerMw: 51.75,
      energyMwh: 119.264,
      href: "https://www.marktstammdatenregister.de/MaStR/Einheit/Detail/IndexOeffentlich/6197052",
    },
    {
      seeId: "SEE922158261037",
      powerMw: 51.75,
      energyMwh: 119.264,
      href: "https://www.marktstammdatenregister.de/MaStR/Einheit/Detail/IndexOeffentlich/10256929",
    },
  ],
  connection: {
    type: "fca-dynamic",
    publishedLimitMw: null,
  },
  dashboardHref: "https://www.eco-stor.de/grid_stability_dashboard",
  sources: [
    {
      publisher: "MaStR SEE925543621515",
      dateIso: "2025-03-13",
      href: "https://www.marktstammdatenregister.de/MaStR/Einheit/Detail/IndexOeffentlich/6197052",
      retrievedIso: RETRIEVED,
    },
    {
      publisher: "MaStR SEE922158261037",
      dateIso: "2025-03-13",
      href: "https://www.marktstammdatenregister.de/MaStR/Einheit/Detail/IndexOeffentlich/10256929",
      retrievedIso: RETRIEVED,
    },
    {
      publisher: "ECO STOR",
      dateIso: "2025-06-05",
      href: "https://www.eco-stor.de/de/unternehmen/news/250605_Einweihung_BOL",
      retrievedIso: RETRIEVED,
    },
    {
      publisher: "ECO STOR und SH Netz",
      dateIso: "2026-06-05",
      href: "https://www.eco-stor.de/de/unternehmen/news/260605_Antwort_auf_Speicherboom_-_ECO%20STOR_und_SH_Netz_zeigen_wie_Batteriespeicher_schneller_und_ohne_Stromnetzausbau_angeschlossen_werden_koennen",
      retrievedIso: RETRIEVED,
    },
    {
      publisher: "ECO STOR, Eigentümerwechsel",
      dateIso: "2026-08-25",
      href: "https://www.eco-stor.de/de/unternehmen/news/260825_Alpiq_uebernimmt_Batteriespeicher_Bollingstedt_von_ECO_STOR",
      retrievedIso: RETRIEVED,
    },
  ],
} as const satisfies {
  nameDe: string;
  nameEn: string;
  project: string;
  operator: string;
  owner: string;
  ownerSinceIso: string;
  placeDe: string;
  placeEn: string;
  districtDe: string;
  districtEn: string;
  state: string;
  powerMw: number;
  energyMwh: number;
  operatorEnergyMwh: number;
  voltageLevel: "HS";
  voltageKv: number;
  gridOperator: string;
  commissioningIso: string;
  statusDe: string;
  statusEn: string;
  mastrUnits: readonly ReferenceParkUnit[];
  connection: { type: "fca-dynamic"; publishedLimitMw: null };
  dashboardHref: string;
  sources: readonly ReferenceParkSource[];
};

/** Hours at full power. The two published totals divided, not a measured dispatch. */
export function referenceParkHoursAtFullPower(): number {
  return REFERENCE_PARK.energyMwh / REFERENCE_PARK.powerMw;
}

/** Power divided by energy. Derived, not a measured C-rate. */
export function referenceParkCRate(): number {
  return REFERENCE_PARK.powerMw / REFERENCE_PARK.energyMwh;
}
