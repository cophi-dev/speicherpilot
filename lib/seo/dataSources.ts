/** Primary upstream sources cited on /methodik — used in Dataset JSON-LD isBasedOn/citation. */
export const SPEICHERPILOT_DATA_CITATIONS = [
  {
    name: "Energy-Charts",
    url: "https://energy-charts.info/",
    credit: "Fraunhofer ISE, CC BY 4.0",
  },
  {
    name: "SMARD",
    url: "https://www.smard.de/",
    credit: "Bundesnetzagentur | SMARD.de, CC BY 4.0",
  },
  {
    name: "Battery Charts",
    url: "https://battery-charts.de/de/battery-charts-de/",
    credit: "RWTH, CC BY 4.0",
  },
] as const;

export const NEP_CITATION = {
  name: "Netzentwicklungsplan",
  url: "https://www.netzentwicklungsplan.de/",
  credit: "Übertragungsnetzbetreiber Deutschland",
} as const;

export const GERMANY_SPATIAL_COVERAGE = {
  "@type": "Place",
  name: "Deutschland",
} as const;