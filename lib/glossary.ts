export type GlossaryId =
  | "bess"
  | "peak-shaving"
  | "p95"
  | "soc"
  | "vollzyklen"
  | "eur-per-kw-year"
  | "jahresdauerlinie"
  | "ns"
  | "ms"
  | "hs"
  | "g0"
  | "g1"
  | "l0"
  | "capex"
  | "opex"
  | "npv"
  | "day-ahead"
  | "quartier"
  | "ortsnetzstation"
  | "behind-the-meter"
  | "front-of-meter"
  | "fpa";

export type GlossaryEntry = {
  id: GlossaryId;
  term: { de: string; en: string };
  text: { de: string; en: string };
};

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: "bess",
    term: { de: "BESS", en: "BESS" },
    text: {
      de: "Battery Energy Storage System: ein Batteriespeicher, der Strom aufnimmt und später wieder abgibt.",
      en: "Battery energy storage system: a battery that takes in electricity and delivers it again later.",
    },
  },
  {
    id: "peak-shaving",
    term: { de: "Peak Shaving", en: "Peak shaving" },
    text: {
      de: "Der Speicher liefert Strom in den Stunden mit der höchsten Last, damit der Bezug aus dem Netz unter einer Grenze bleibt.",
      en: "The battery supplies power in the highest-load hours so grid import stays under a limit.",
    },
  },
  {
    id: "p95",
    term: { de: "P95", en: "P95" },
    text: {
      de: "Der Wert, den 95 von 100 Tagen nicht überschreiten. Die automatische Größe nutzt P95 und lässt die härtesten Tage bewusst über der Grenze.",
      en: "The value that 95 of 100 days stay under. Automatic sizing uses P95 and deliberately leaves the hardest days above the limit.",
    },
  },
  {
    id: "soc",
    term: { de: "SoC", en: "SoC" },
    text: {
      de: "State of Charge: wie voll der Speicher ist, in Prozent. 0 % ist leer, 100 % ist voll. Die Live-Zahl für Deutschland ist eine Schätzung, keine Messung.",
      en: "State of charge: how full the battery is, in percent. 0% is empty, 100% is full. The Germany live figure is an estimate, not a measurement.",
    },
  },
  {
    id: "vollzyklen",
    term: { de: "Vollzyklen", en: "Full cycles" },
    text: {
      de: "Wie oft die gespeicherte Energie im Jahr komplett entladen wird. Ein Zyklus heißt: einmal der ganze Inhalt hinaus.",
      en: "How many times the stored energy is fully discharged in a year. One cycle means the whole contents went out once.",
    },
  },
  {
    id: "eur-per-kw-year",
    term: { de: "€/kW·a", en: "€/kW·year" },
    text: {
      de: "Euro pro Kilowatt und Jahr. So rechnet der Leistungspreis: es zählt die höchste bezogene Leistung, nicht wie lange sie anliegt.",
      en: "Euro per kilowatt and year. That is how a demand charge works: the highest power you draw counts, not how long it lasts.",
    },
  },
  {
    id: "jahresdauerlinie",
    term: { de: "Jahresdauerlinie", en: "Annual duration curve" },
    text: {
      de: "Alle Stunden des Jahres, sortiert von der höchsten Last zur niedrigsten. Sie zeigt, wie viele Stunden über einer Grenze liegen.",
      en: "Every hour of the year, sorted from the highest load to the lowest. It shows how many hours sit above a limit.",
    },
  },
  {
    id: "ns",
    term: { de: "NS", en: "LV" },
    text: {
      de: "Niederspannung. In diesem Rechner der Planungshinweis bis 135 kW, mit Verweis auf VDE-AR-N 4105. Keine Anschlusszusage.",
      en: "Low voltage. In this calculator the planning hint up to 135 kW, pointing at VDE-AR-N 4105. Not a connection offer.",
    },
  },
  {
    id: "ms",
    term: { de: "MS", en: "MV" },
    text: {
      de: "Mittelspannung. In diesem Rechner der Planungshinweis über 135 kW bis 20 MW, mit Verweis auf VDE-AR-N 4110. Keine Anschlusszusage.",
      en: "Medium voltage. In this calculator the planning hint above 135 kW up to 20 MW, pointing at VDE-AR-N 4110. Not a connection offer.",
    },
  },
  {
    id: "hs",
    term: { de: "HS", en: "HV" },
    text: {
      de: "Hochspannung. In diesem Rechner der Planungshinweis über 20 MW, mit Verweis auf VDE-AR-N 4120. Keine Anschlusszusage.",
      en: "High voltage. In this calculator the planning hint above 20 MW, pointing at VDE-AR-N 4120. Not a connection offer.",
    },
  },
  {
    id: "g0",
    term: { de: "G0", en: "G0" },
    text: {
      de: "Eine Gewerbeform in diesem Rechner: tagsüber relativ gleichmäßig. Sie wird auf den eingegebenen Jahresverbrauch skaliert und ist nicht gemessen.",
      en: "A commercial shape in this calculator: fairly flat through the day. It is scaled to the annual consumption you enter and is not measured.",
    },
  },
  {
    id: "g1",
    term: { de: "G1", en: "G1" },
    text: {
      de: "Eine Gewerbeform in diesem Rechner mit einer zusätzlichen Abendspitze. Skaliert auf den Jahresverbrauch, nicht gemessen.",
      en: "A commercial shape in this calculator with an extra evening peak. Scaled to annual consumption, not measured.",
    },
  },
  {
    id: "l0",
    term: { de: "L0", en: "L0" },
    text: {
      de: "Eine Form in diesem Rechner mit Morgen- und Abendspitze, ähnlich einem Lade- oder Einzelhandelsstandort. Skaliert auf den Jahresverbrauch, nicht gemessen.",
      en: "A shape in this calculator with a morning and an evening peak, similar to a retail or charging site. Scaled to annual consumption, not measured.",
    },
  },
  {
    id: "capex",
    term: { de: "CAPEX", en: "CAPEX" },
    text: {
      de: "Die einmalige Ausgabe für den Speicher, hier Euro pro Kilowattstunde Inhalt. 500 €/kWh ist die voreingestellte Annahme, kein Angebot.",
      en: "The one-off cost of the battery, here in euro per kilowatt-hour of capacity. 500 €/kWh is the default assumption, not a quote.",
    },
  },
  {
    id: "opex",
    term: { de: "OPEX", en: "OPEX" },
    text: {
      de: "Die laufenden Kosten. Das Modell setzt sie auf 1,5 % der einmaligen Ausgabe pro Jahr. Eine Annahme, keine Rechnung eines Betreibers.",
      en: "The running cost. The model sets it at 1.5% of the one-off cost per year. An assumption, not an operator’s invoice.",
    },
  },
  {
    id: "npv",
    term: { de: "NPV", en: "NPV" },
    text: {
      de: "Net Present Value: die Summe der jährlichen Vorteile über die Lebensdauer, abzüglich der einmaligen Ausgabe. Bei Diskont 0 ist das nur die undiskontierte Summe.",
      en: "Net present value: the annual benefits over the lifetime, minus the one-off cost. At a discount rate of 0 this is just the undiscounted sum.",
    },
  },
  {
    id: "day-ahead",
    term: { de: "Day-Ahead-Arbitrage", en: "Day-ahead arbitrage" },
    text: {
      de: "Strom laden, wenn der angenommene Preis niedrig ist, und entladen, wenn er hoch ist. Gerechnet auf der 15-Minuten-Reihe, kein echtes Orderbuch.",
      en: "Charge when the assumed price is low and discharge when it is high. Computed on the 15-minute series, not a real order book.",
    },
  },
  {
    id: "quartier",
    term: { de: "Quartier", en: "Neighbourhood" },
    text: {
      de: "Hier ein fiktives neues Wohngebiet: viele Haushalte, Wärmepumpen, Wallboxen und Dach-PV hinter einer gemeinsamen Ortsnetzstation, mit einem Speicher an dieser Station.",
      en: "Here, a fictional new housing area: many households, heat pumps, chargers and rooftop PV behind one shared distribution substation, with a battery at that substation.",
    },
  },
  {
    id: "ortsnetzstation",
    term: { de: "Ortsnetzstation", en: "Distribution substation" },
    text: {
      de: "Die Station, die Mittelspannung auf Niederspannung bringt. Im Quartiersbeispiel ist ihre Planleistung eine Annahme, kein gemessener Transformator und keine Hamburger Anlage.",
      en: "The station that steps medium voltage down to low voltage. In the neighbourhood example its planning rating is an assumption, not a measured transformer and not a Hamburg asset.",
    },
  },
  {
    id: "behind-the-meter",
    term: { de: "Behind-the-Meter", en: "Behind the meter" },
    text: {
      de: "Der Speicher steht hinter dem Zähler eines Betriebs oder Quartiers und arbeitet mit dessen Last. Das Supermarkt- und das Quartiersbeispiel sind so gebaut.",
      en: "The battery sits behind a site or neighbourhood meter and works with that load. The supermarket and neighbourhood examples are built this way.",
    },
  },
  {
    id: "front-of-meter",
    term: { de: "Front-of-Meter", en: "Front of the meter" },
    text: {
      de: "Ein Speicher direkt am Netz, ohne Last eines Betriebs dahinter. Flower in Bergedorf ist so ein Fall. Dieser Rechner kann dann keine Lastspitze eines Standorts kappen.",
      en: "A battery on the grid itself, with no site load behind it. Flower in Bergedorf is that kind of case. This calculator then cannot shave a site peak.",
    },
  },
  {
    id: "fpa",
    term: { de: "Flexibility Purchase Agreement", en: "Flexibility Purchase Agreement" },
    text: {
      de: "Ein Vertrag, mit dem ein Vermarkter die Flexibilität des Speichers handelt. Flower und ENGIE haben ein solches Agreement, auch virtuelles Tolling genannt. Der Preis steht in den Quellen nicht.",
      en: "A contract under which a marketer trades the battery’s flexibility. Flower and ENGIE have one, also called a virtual tolling agreement. The sources do not state the price.",
    },
  },
];

const byId = new Map(GLOSSARY.map((entry) => [entry.id, entry]));

export function glossaryEntry(id: GlossaryId): GlossaryEntry {
  const entry = byId.get(id);
  if (!entry) {
    throw new Error(`Missing glossary entry ${id}`);
  }
  return entry;
}
