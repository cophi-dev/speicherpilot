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
  | "day-ahead-price"
  | "regelzone"
  | "gebotszone"
  | "wind-auf-see"
  | "abregelung"
  | "deutschland-live"
  | "residuallast"
  | "handelssaldo"
  | "netzfrequenz"
  | "modellschaetzung"
  | "kupferplatte"
  | "quartier"
  | "ortsnetzstation"
  | "behind-the-meter"
  | "front-of-meter"
  | "fpa"
  | "fca"
  | "grossspeicher"
  | "ladezustand"
  | "netzgrenze"
  | "baukostenzuschuss"
  | "leistungspreis"
  | "lastfluss"
  | "spannung-pu"
  | "auslastung"
  | "hosting-capacity"
  | "testnetz"
  | "starklast"
  | "schwachlast-pv"
  | "trennstelle"
  | "stufensteller"
  | "n-1"
  | "statisch-dynamisch"
  | "negative-preise"
  | "preisnehmer"
  | "preisspanne"
  | "intraday"
  | "regelleistung";

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
    id: "day-ahead-price",
    term: { de: "Day-Ahead-Preis", en: "Day-ahead price" },
    text: {
      de: "Der Preis aus der Auktion für den nächsten Tag, in Euro pro Megawattstunde. Für Deutschland und Luxemburg ist das eine Gebotszone, kein Hamburger Preis.",
      en: "The price from the auction for the next day, in euro per megawatt-hour. For Germany and Luxembourg that is one bidding zone, not a Hamburg price.",
    },
  },
  {
    id: "regelzone",
    term: { de: "Regelzone", en: "Control area" },
    text: {
      de: "Das Gebiet eines Übertragungsnetzbetreibers. Hamburg liegt in der Regelzone 50Hertz. Die Zahl gilt für die ganze Zone, unter anderem Berlin, Brandenburg und Sachsen, nicht für die Stadt.",
      en: "The area of a transmission operator. Hamburg sits in the 50Hertz control area. The figure is the whole area, including Berlin, Brandenburg and Saxony, not the city.",
    },
  },
  {
    id: "gebotszone",
    term: { de: "Gebotszone", en: "Bidding zone" },
    text: {
      de: "Das Gebiet mit einem gemeinsamen Strompreis. DE-LU ist Deutschland und Luxemburg zusammen. Darin gibt es keinen eigenen Preis für Hamburg oder für den Norden.",
      en: "The area that shares one electricity price. DE-LU is Germany and Luxembourg together. It has no separate price for Hamburg or for the north.",
    },
  },
  {
    id: "wind-auf-see",
    term: { de: "Wind auf See", en: "Offshore wind" },
    text: {
      de: "Windparks im Meer. Die Reihe der Regelzone 50Hertz ist an die Ostsee angeschlossen, die Reihe der Regelzone TenneT an die Nordsee. Das ist nicht die Stromlast von Norddeutschland.",
      en: "Wind farms at sea. The 50Hertz series is connected to the Baltic, the TenneT series to the North Sea. That is not northern Germany’s electricity load.",
    },
  },
  {
    id: "abregelung",
    term: { de: "Abregelung", en: "Curtailment" },
    text: {
      de: "Erzeugung, die das Netz nicht aufnimmt und die deshalb gedrosselt wird. Redispatch ist der Eingriff, mit dem der Netzbetreiber Kraftwerke hoch- oder herunterfährt. Für heute zeigt diese Seite keine solche Zahl.",
      en: "Generation the grid does not take, so it is turned down. Redispatch is the grid operator moving plants up or down. This page shows no such figure for today.",
    },
  },
  {
    id: "deutschland-live",
    term: { de: "Deutschland", en: "Germany" },
    text: {
      de: "Die nationale Reihe. Sie wird nie als Hamburg oder als Norden beschriftet. Fehlt die Erzeugung, bleibt das Feld leer, statt aus 0 GW ein Defizit zu rechnen.",
      en: "The national series. It is never labelled as Hamburg or as the north. If generation is missing, the field stays empty instead of turning 0 GW into a deficit.",
    },
  },
  {
    id: "handelssaldo",
    term: { de: "Handelssaldo", en: "Cross-border balance" },
    text: {
      de: "Strom über die Grenze, Reihe von Energy-Charts. Positiv heißt Import nach Deutschland, negativ heißt Export. Kein Erlös.",
      en: "Power across the border, the Energy-Charts series. Positive means import into Germany, negative means export. Not revenue.",
    },
  },
  {
    id: "netzfrequenz",
    term: { de: "Netzfrequenz", en: "Grid frequency" },
    text: {
      de: "Messung in Freiburg, veröffentlicht von Energy-Charts. Das ist kein Wert eines Netzbetreibers. Etwa 30 Minuten Verzögerung.",
      en: "A measurement in Freiburg, published by Energy-Charts. It is not a grid-operator value. About 30 minutes of delay.",
    },
  },
  {
    id: "residuallast",
    term: { de: "Residuallast", en: "Residual load" },
    text: {
      de: "Last minus Wind minus Sonne. Das ist, was andere Kraftwerke und Import in dieser Viertelstunde liefern müssen. Liegt die Linie unter null, liefern Wind und Sonne mehr, als verbraucht wird.",
      en: "Load minus wind minus solar. That is what other plants and imports have to supply in that quarter-hour. Below zero, wind and solar deliver more than is consumed.",
    },
  },
  {
    id: "modellschaetzung",
    term: { de: "Modellschätzung", en: "Model estimate" },
    text: {
      de: "Eine Rechnung für den deutschen Großspeicher-Bestand, kein Messwert. Die Nennenergie ist die Größe der Flotte. Nutzbar sind 10–90 % davon. Ein Tag ohne Vortag startet bei 10 %. Geladen wird nur, wenn Wind plus Sonne über der Last liegt, und nur vor 17 Uhr. Ab 17 Uhr geht Energie auf die Abendspitze. 85 % Wirkungsgrad gelten nur auf der Abgabe.",
      en: "A calculation for Germany’s large-storage fleet, not a measurement. Nameplate energy is the fleet size. The usable window is 10–90% of that. A day with no previous day starts at 10%. Charging happens only while wind plus solar exceeds load, and only before 17:00. From 17:00 energy goes onto the evening peak. The 85% round-trip applies only on discharge.",
    },
  },
  {
    id: "kupferplatte",
    term: { de: "Kupferplatte", en: "Copper plate" },
    text: {
      de: "Annahme in der Live-Simulation: alle Speicher wirken als ein Block. Netzengpässe zwischen ihnen werden nicht gerechnet.",
      en: "Assumption in the live simulation: every battery acts as one block. Grid bottlenecks between them are not modelled.",
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
      de: "Ein Speicher direkt am Netz, ohne Last eines Betriebs dahinter. Der Großspeicher Bollingstedt ist so ein Fall. Dieser Rechner kann dann keine Lastspitze eines Standorts kappen.",
      en: "A battery on the grid itself, with no site load behind it. The Bollingstedt large storage is that kind of case. This calculator then cannot shave a site peak.",
    },
  },
  {
    id: "fpa",
    term: { de: "Flexibility Purchase Agreement", en: "Flexibility Purchase Agreement" },
    text: {
      de: "Ein Vertrag, mit dem ein Vermarkter die Flexibilität des Speichers handelt. Manchmal heißt das auch virtuelles Tolling. Den Preis veröffentlicht so ein Vertrag nicht.",
      en: "A contract under which a marketer trades the battery’s flexibility. It is sometimes also called virtual tolling. That kind of contract does not publish the price.",
    },
  },
  {
    id: "fca",
    term: { de: "flexible Netzanschlussvereinbarung (FCA)", en: "flexible grid connection agreement (FCA)" },
    text: {
      de: "Nach § 17 Abs. 2b EnWG kann der Netzbetreiber sie anbieten. Sie kann die höchste Bezugs- oder Einspeiseleistung statisch oder dynamisch begrenzen.",
      en: "Under section 17 (2b) of the Energy Industry Act the network operator can offer it. It can limit the highest withdrawal or feed-in power, statically or dynamically.",
    },
  },
  {
    id: "grossspeicher",
    term: { de: "Großspeicher", en: "Large storage" },
    text: {
      de: "Batteriespeicher ab 1 000 kWh oder 1 000 kW, wie sie Battery Charts aus dem Marktstammdatenregister zählt. Die Zahl ist der registrierte Bestand, keine Messung, was an diesem Tag geladen wurde.",
      en: "Batteries from 1,000 kWh or 1,000 kW, as Battery Charts counts them from the Marktstammdatenregister. The figure is the registered stock, not a measurement of what charged on this day.",
    },
  },
  {
    id: "ladezustand",
    term: { de: "Ladezustand", en: "State of charge" },
    text: {
      de: "Wie voll der Speicher ist. Im Modell starten die Großspeicher leer und füllen sich nur mit Überschuss vor 17 Uhr. Der Ring innen zeigt diesen Stand als Anteil der Nennenergie.",
      en: "How full the battery is. In the model the large storage starts empty and fills only on surplus before 17:00. The inner ring shows that level as a share of nameplate energy.",
    },
  },
  {
    id: "netzgrenze",
    term: { de: "Netzgrenze", en: "Grid limit" },
    text: {
      de: "Höchste Leistung, mit der der Speicher Strom aus dem Netz nehmen oder ins Netz geben darf.",
      en: "The highest power at which the battery may take electricity from the grid or feed it in.",
    },
  },
  {
    id: "baukostenzuschuss",
    term: { de: "Baukostenzuschuss", en: "Construction-cost contribution" },
    text: {
      de: "Ein Betrag, den der Netzbetreiber für den Ausbau des Anschlusses verlangen kann. Dieses Modell rechnet ihn nicht.",
      en: "An amount the grid operator can charge for reinforcing the connection. This model does not calculate it.",
    },
  },
  {
    id: "leistungspreis",
    term: { de: "Leistungspreis", en: "Demand charge" },
    text: {
      de: "Ein Preis auf die höchste bezogene Leistung, nicht auf die Energiemenge. Dieses Modell rechnet ihn nicht.",
      en: "A charge on the highest power drawn, not on the amount of energy. This model does not calculate it.",
    },
  },
  {
    id: "lastfluss",
    term: { de: "Lastfluss", en: "Load flow" },
    text: {
      de: "Die Rechnung, die für ein Netz mit gegebenen Lasten und Einspeisungen die Spannung an jedem Knoten und den Strom in jeder Leitung bestimmt.",
      en: "The calculation that finds the voltage at every node and the current in every line for given loads and generation.",
    },
  },
  {
    id: "spannung-pu",
    term: { de: "Spannung in p.u.", en: "Voltage in p.u." },
    text: {
      de: "Die Spannung als Anteil der Nennspannung. 1,00 p.u. sind in einem 20-kV-Netz 20 kV, 1,055 p.u. sind 21,1 kV.",
      en: "Voltage as a fraction of the nominal voltage. 1.00 p.u. is 20 kV in a 20 kV grid; 1.055 p.u. is 21.1 kV.",
    },
  },
  {
    id: "auslastung",
    term: { de: "Auslastung", en: "Loading" },
    text: {
      de: "Der Strom in einer Leitung oder einem Transformator in Prozent des Dauerstroms, den er tragen darf. Über 100 % gilt hier als Grenzverletzung.",
      en: "The current in a line or transformer as a percentage of the continuous current it may carry. Above 100 % counts as a limit violation here.",
    },
  },
  {
    id: "hosting-capacity",
    term: { de: "Kipppunkt (Hosting Capacity)", en: "Tipping point (hosting capacity)" },
    text: {
      de: "Die größte Leistung an einem Knoten, bei der im Normalbetrieb im Testnetz noch alle angenommenen Grenzen halten. Er sagt nichts über (n−1).",
      en: "The largest power at a node at which all assumed limits still hold in normal operation in the test grid. It says nothing about (n−1).",
    },
  },
  {
    id: "testnetz",
    term: { de: "Testnetz", en: "Test grid" },
    text: {
      de: "Ein öffentliches Beispielnetz für Rechnungen und Vergleiche. Es bildet kein bestimmtes reales Netz ab.",
      en: "A public example grid for calculations and comparisons. It does not represent a specific real grid.",
    },
  },
  {
    id: "starklast",
    term: { de: "Starklast", en: "Peak load" },
    text: {
      de: "Ein Lastfall mit hohem Verbrauch und ohne dezentrale Erzeugung.",
      en: "A load case with high consumption and no distributed generation.",
    },
  },
  {
    id: "schwachlast-pv",
    term: { de: "Schwachlast mit viel Sonne und Wind", en: "Low load with much sun and wind" },
    text: {
      de: "Ein Lastfall mit niedrigem Verbrauch und hoher Einspeisung; der Strom fließt Richtung Hochspannung zurück.",
      en: "A load case with low consumption and high feed-in; power flows back towards the high-voltage grid.",
    },
  },
  {
    id: "trennstelle",
    term: { de: "Trennstelle", en: "Tie switch" },
    text: {
      de: "Ein offener Schalter, der ein Netz im Normalbetrieb in Stränge teilt. Im Störungsfall kann er geschlossen werden.",
      en: "An open switch that splits a grid into feeders in normal operation. It can be closed after a fault.",
    },
  },
  {
    id: "stufensteller",
    term: { de: "Stufensteller", en: "Tap changer" },
    text: {
      de: "Die Einstellung am Transformator, die das Übersetzungsverhältnis in kleinen Stufen ändert und damit die Spannung hebt oder senkt. Im Testnetz ist er je Fall fest.",
      en: "The setting on a transformer that changes the ratio in small steps and so raises or lowers the voltage. It is fixed per case in the test grid.",
    },
  },
  {
    id: "n-1",
    term: { de: "(n−1)", en: "(n−1)" },
    text: {
      de: "Das Netz soll auch dann noch arbeiten, wenn ein Teil ausfällt. Auf /netz wird das im Testnetz für Einzelausfälle gerechnet, in den anderen Rechnern nicht.",
      en: "The grid should keep working when one part fails. On /netz this is calculated for single outages in the test grid, and not in the other calculators.",
    },
  },
  {
    id: "statisch-dynamisch",
    term: { de: "statisch oder dynamisch", en: "static or dynamic" },
    text: {
      de: "§ 17 Abs. 2b EnWG sagt nur „statisch oder dynamisch“. Eine Definition der beiden Wörter steht dort nicht. In diesem Rechner ist die feste Grenze ganztägig. Abend- und Mittagsfenster gelten nur in diesen Stunden. Das ist eine Annahme des Modells.",
      en: "Section 17 (2b) EnWG only says “static or dynamic”. It does not define the two words. In this calculator the fixed limit is all day. The evening and midday windows apply only in those hours. That is an assumption of the model.",
    },
  },
  {
    id: "negative-preise",
    term: { de: "negative Preise", en: "negative prices" },
    text: {
      de: "Manchmal ist Strom an der Börse so reichlich, dass der Preis unter null fällt. Dann bekommt, wer Strom abnimmt, Geld.",
      en: "Sometimes electricity is so plentiful on the exchange that the price falls below zero. Then whoever takes power is paid.",
    },
  },
  {
    id: "preisnehmer",
    term: { de: "Preisnehmer", en: "price taker" },
    text: {
      de: "Das Modell nimmt die Preise, wie sie waren. Dass ein großer Speicher selbst die Preise verändert, kommt darin nicht vor.",
      en: "The model takes the prices as they were. It does not include a large battery changing those prices itself.",
    },
  },
  {
    id: "preisspanne",
    term: { de: "Preisspanne", en: "price spread" },
    text: {
      de: "Unterschied zwischen dem höchsten und dem niedrigsten Preis eines Tages, in Euro pro Megawattstunde.",
      en: "The gap between the highest and the lowest price of a day, in euro per megawatt-hour.",
    },
  },
  {
    id: "intraday",
    term: { de: "Intraday", en: "intraday" },
    text: {
      de: "Handel am selben Tag, nach der Day-Ahead-Auktion. Das Modell rechnet ihn nicht mit.",
      en: "Trading on the same day, after the day-ahead auction. The model does not include it.",
    },
  },
  {
    id: "regelleistung",
    term: { de: "Regelleistung", en: "balancing power" },
    text: {
      de: "Leistung, die der Netzbetreiber kurzfristig abruft, um das Netz im Gleichgewicht zu halten. Speicher können sie anbieten. Das Modell rechnet sie nicht mit.",
      en: "Power the grid operator calls at short notice to keep the grid in balance. Batteries can offer it. The model does not include it.",
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
