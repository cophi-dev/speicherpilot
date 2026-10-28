export type BlogFigure = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

/** Alt texts are the approved wording from the visual brief, unchanged. */
export const BLOG_FIGURES = {
  a1: {
    src: "/blog/A1_titelbild_1600x900.svg",
    width: 1600,
    height: 900,
    alt: "Ring mit 24 Segmenten für die Stunden des 11.10.2026. Der Day-Ahead-Preis fällt mittags auf 15 Euro pro Megawattstunde und steigt abends auf 235 Euro.",
  },
  b: {
    src: "/blog/B_mw_mwh_1200x700.svg",
    width: 1200,
    height: 700,
    alt: "Schema: Ein Speicher mit 103,5 Megawatt Leistung und 238 Megawattstunden Kapazität ist bei voller Leistung nach etwa 2,3 Stunden entladen. Mit einem angenommenen Wirkungsgrad von 85 Prozent werden aus 100 Megawattstunden Ladung etwa 85 entladen.",
  },
  c: {
    src: "/blog/C_spanne_speicher_1200x700.svg",
    width: 1200,
    height: 700,
    alt: "Diagramm: Die mittlere Tagesspanne des Day-Ahead-Preises beträgt 130 Euro pro Megawattstunde ohne zusätzliche Speicher, 78 mit 5 Gigawatt und 53 mit 20 Gigawatt zusätzlicher Batterieleistung (Modellrechnung, Fraunhofer ISE, Gebote 2025).",
  },
} as const satisfies Record<string, BlogFigure>;

export type BlogFigureId = keyof typeof BLOG_FIGURES;
