import { CHART_SCOPE_LINE } from "@/lib/chartScopeLine";

/** Kurzzeile unter Modell-Graphen auf /monat. */
export const MONAT_REGELR_GRAPH_CAPTION = CHART_SCOPE_LINE;

/** Einmal am Seitenende (Methodik-Verweis im Fließtext). */
export const MONAT_REGELR_MODEL_FOOTNOTE =
  "Modell: Deutschland als ein Netzknoten, ohne Leitungsengpässe. \u201eMarkt\u201c fährt nach Day-Ahead-Preis, ohne dass Speicher den Preis verändern (Stresstest). Details: Methodik.";

/** Zusatz nur am Hero-Graph bei Markt ×>1 (keine „Schraffur“ — es sind vertikale Striche). */
export const MONAT_REGELR_MARKT_HERO_SUFFIX =
  " \u00b7 Striche = \u00fcber beobachteter Monatsspitze";