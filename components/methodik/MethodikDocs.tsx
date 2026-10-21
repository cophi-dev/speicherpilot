"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/components/language-context";
import { FLOWER_BERGEDORF, flowerHoursAtFullPower } from "@/lib/flowerBergedorf";
import { GLOSSARY } from "@/lib/glossary";
import { QUARTIER, quartierPvKwp } from "@/lib/quartierExample";
import { READABILITY_CONFIG } from "@/lib/readability";

const SECTIONS = [
  { id: "ueberblick", de: "Überblick", en: "Overview" },
  { id: "daten", de: "Daten", en: "Data" },
  { id: "dimensionierung", de: "Dimensionierung", en: "Sizing" },
  { id: "dispatch", de: "Dispatch", en: "Dispatch" },
  { id: "wirtschaft", de: "Wirtschaftlichkeit", en: "Economics" },
  { id: "anschluss", de: "Netzanschluss", en: "Connection" },
  { id: "netzdienlichkeit", de: "Einschätzung netzdienlich", en: "Grid-support estimate" },
  { id: "live", de: "Live", en: "Live" },
  { id: "quellen", de: "Quellen", en: "Sources" },
  { id: "grenzen", de: "Grenzen", en: "Limits" },
  { id: "beispiele", de: "Beispiele", en: "Examples" },
  { id: "glossar", de: "Glossar", en: "Glossary" },
  { id: "changelog", de: "Changelog", en: "Changelog" },
] as const;

export function MethodikDocs() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => node !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4] }
    );
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:px-8 lg:grid-cols-[240px_minmax(0,68ch)] lg:gap-16">
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <label className="block lg:hidden">
          <span className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Inhalt", "Contents")}</span>
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-card px-2" value={active} onChange={(event) => document.getElementById(event.target.value)?.scrollIntoView()}>
            {SECTIONS.map((section, index) => (
              <option key={section.id} value={section.id}>
                §{index + 1} {language === "de" ? section.de : section.en}
              </option>
            ))}
          </select>
        </label>
        <nav className="hidden lg:block" aria-label={tx("Inhalt", "Contents")}>
          <ol className="space-y-1 text-[13px]">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`num block border-l-2 py-1 pl-3 ${active === section.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}
                >
                  §{index + 1} {language === "de" ? section.de : section.en}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <article className="min-w-0 max-w-full space-y-12 lg:max-w-[68ch]">
        <header>
          <h1 className="text-[28px] font-medium md:text-[36px]">{tx("Methodik", "Method")}</h1>
          <p className="mt-3 text-muted-foreground">
            {tx(
              "Was der Standort-Rechner rechnet, welche Zahlen beobachtet sind und welche nur ein Modell.",
              "What the site calculator computes, which figures are observed, and which are only a model."
            )}
          </p>
        </header>
        <Section id="ueberblick" n="§1" title={tx("Überblick", "Overview")}>
          <p>{tx("Der Rechner legt einen Batteriespeicher auf ein Lastprofil, eine PV-Anlage und eine Anschlussleistung aus. Dieselbe Rechnung speist zwei Sichten: Projektierer (Größe, Peak-Shaving, 15-Minuten-Arbitrage, CAPEX, Amortisation, NPV) und Netzbetreiber (angefragte gegen verfügbare Leistung, Spannungshinweis, netzdienlich gegen marktgetrieben).", "The calculator sizes a battery against a load profile, a PV array, and a connection capacity. The same result feeds two views: a developer view (size, peak shaving, 15-minute arbitrage, CAPEX, payback, NPV) and a grid-operator view (requested versus available capacity, a voltage hint, grid-serving versus market-driven operation).")}</p>
          <p className="mt-3">{tx("Er ist kein Gutachten, keine Handelsempfehlung und keine Anschlusszusage. Verteilnetzbetreiber prüfen und schließen Speicher Dritter an; das Modell unterstellt nicht, dass sie den Speicher besitzen oder betreiben.", "It is not an engineering opinion, not trading advice, and not a connection offer. Distribution operators assess and connect third-party storage; the model does not assume that they own or operate it.")}</p>
          <Callout title={tx("Nicht enthalten", "Not included")}>{tx("SCADA, Handelsempfehlung, Netzbetreiber-Interna, Regelenergie, Netzentgelt §19 StromNEV.", "SCADA, a trading recommendation, DSO internals, balancing energy, §19 StromNEV grid charges.")}</Callout>
        </Section>
        <Section id="daten" n="§2" title={tx("Daten und Auflösung", "Data and resolution")}>
          <p>{tx("Beispielprofile haben 15 Minuten und ein illustratives Jahr mit 365 Tagen, Zeitzone Europe/Berlin, ohne gemessene Wetterdaten. Lücken bis 8 Intervalle werden linear interpoliert.", "Example profiles are 15 minutes over an illustrative 365-day year, Europe/Berlin, with no measured weather. Gaps of up to 8 intervals are interpolated in a straight line.")}</p>
          <div className="num mt-4 overflow-x-auto border border-border bg-secondary p-4 text-[13px]">
            <p>timestamp,kW</p>
            <p>2025-01-01T00:00:00+01:00,420</p>
            <p>2025-01-01T00:15:00+01:00,418</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{tx("Spalte kWh wird mit 60/Intervall in kW umgerechnet. 15 oder 60 Minuten.", "A kWh column is converted to kW by 60/interval. 15 or 60 minutes.")}</p>
        </Section>
        <Section id="dimensionierung" n="§3" title={tx("Dimensionierung", "Sizing")}>
          <Formula>P_BESS = max(0, P95(P_import,Tag − P_limit))</Formula>
          <Formula>E_BESS = P95(E_Ueberschuss,Tag) / (η_dis · 0,85)</Formula>
          <p className="text-sm text-muted-foreground">{tx("η_dis = √RTE. Das SoC-Fenster ist 10–95 %. P95 lässt die härtesten Tage über dem Limit. Das ist Absicht und steht im Anschluss-Check.", "η_dis = √round-trip efficiency. The SoC window is 10–95%. P95 leaves the hardest days above the limit. That is intentional and shown in the connection check.")}</p>
          <table className="mt-4 w-full text-sm">
            <thead className="bg-secondary"><tr className="num text-[12px] uppercase"><th className="px-2 py-2 text-left">{tx("Symbol", "Symbol")}</th><th className="px-2 py-2 text-left">{tx("Bedeutung", "Meaning")}</th><th className="px-2 py-2 text-left">{tx("Einheit", "Unit")}</th></tr></thead>
            <tbody className="num">
              <tr className="border-t border-border"><td className="px-2 py-2">P_BESS</td><td>{tx("Leistung", "Power")}</td><td>kW</td></tr>
              <tr className="border-t border-border"><td className="px-2 py-2">E_BESS</td><td>{tx("Energie", "Energy")}</td><td>kWh</td></tr>
              <tr className="border-t border-border"><td className="px-2 py-2">P_limit</td><td>{tx("Anschluss", "Connection")}</td><td>kW</td></tr>
            </tbody>
          </table>
        </Section>
        <Section id="dispatch" n="§4" title="Dispatch">
          <p>{tx("Zuerst Peak Shaving, dann Arbitrage auf dem Rest.", "Peak shaving first, then arbitrage on what is left.")}</p>
          <pre className="num mt-4 overflow-x-auto bg-secondary p-4 text-[13px] text-muted-foreground">{`market, for each day:
  if import > limit: discharge
  else if later excess > stored energy: charge
  else if dynamic tariff and price in the day's outer quintile:
    charge low / discharge high, inside the limit

grid-serving, same battery and same limit:
  discharge above the shave target
  charge from on-site surplus only, or precharge up to
  min(limit, that day's uncontrolled import peak)
  no arbitrage`}</pre>
          <p className="text-sm text-muted-foreground">{tx("Die Netzbetreiber-Sicht zeigt, ob die gewählte Betriebsart die Spitze am Netzanschlusspunkt senkt oder hebt. Die rote Linie in der Grafik ist die eingegebene Anschlussleistung.", "The grid-operator view shows whether the selected operation lowers or raises the peak at the connection point. The red line on the chart is the connection capacity you entered.")}</p>
        </Section>
        <Section id="wirtschaft" n="§5" title={tx("Wirtschaftlichkeit", "Economics")}>
          <p>{tx("Nutzen = Leistungspreis-Ersparnis + Arbeitspreis auf der Peak-Shaving-Energie + Arbitrage zum synthetischen oder übergebenen Preis + Änderung der Einspeisung − 1,5 % CAPEX als OPEX.", "Benefit = demand-charge saving + retail energy on the peak-shaving throughput + arbitrage at the synthetic or supplied price + the change in export − 1.5% of CAPEX as OPEX.")}</p>
          <p className="mt-3">{tx("Amortisation = CAPEX / Jahresnutzen, solange der Diskont 0 ist. NPV = −CAPEX + Summe der diskontierten Jahresnutzen über die Lebensdauer. Derselbe Jahresnutzen, kein zweites Preisszenario. Standard-CAPEX 500 €/kWh ist eine Annahme, kein Angebot.", "Payback = CAPEX / annual benefit while the discount rate is 0. NPV = −CAPEX + the sum of discounted annual benefits over the lifetime. The same annual benefit, not a second price scenario. The default CAPEX of 500 €/kWh is an assumption, not a quote.")}</p>
          <p className="mt-3">{tx("Die Arbitrage nutzt 15-Minuten-Preise. Ohne übergebene Reihe ist das ein synthetisches Band in Day-Ahead-Form, kein Intraday-Orderbuch. Erlösstapelung (Regelenergie, Kapazitätsmärkte) wird nicht bepreist und steht als Platzhalter ohne Euro-Betrag.", "Arbitrage uses 15-minute prices. Without a supplied series that band is synthetic and shaped like day-ahead, not an intraday order book. Revenue stacking (balancing, capacity markets) is not priced and is shown as a placeholder with no euro amount.")}</p>
          <p className="mt-3">{tx(`Die Ampel an der Amortisation ist eine Lesehilfe in READABILITY_CONFIG, keine Bankregel und kein Tarif: grün bis ${READABILITY_CONFIG.paybackGreenMaxYears} Jahre, gelb bis ${READABILITY_CONFIG.paybackYellowMaxYears} Jahre, rot darüber oder wenn das Geld innerhalb der Lebensdauer nicht zurückkommt.`, `The payback traffic light is a reading aid in READABILITY_CONFIG, not a bank rule and not a tariff: green up to ${READABILITY_CONFIG.paybackGreenMaxYears} years, yellow up to ${READABILITY_CONFIG.paybackYellowMaxYears} years, red beyond that or when the money does not come back inside the lifetime.`)}</p>
        </Section>
        <Section id="anschluss" n="§6" title={tx("Netzanschluss-Check", "Connection check")}>
          <p>{tx("OK unter 90 % der Anschlussleistung, nahe am Limit ab 90 %, über dem Limit wenn Bezug oder Rückspeisung die Leistung überschreitet. Die Checkliste verlangt zusätzlich 10 % Reserve und null Überschreitungsstunden. Angefragt ist die höhere der beiden Spitzen ohne Speicher, verfügbar ist die eingegebene Anschlussleistung.", "OK below 90% of the connection, near the limit from 90%, over the limit when import or export exceeds capacity. The checklist also asks for 10% reserve and zero hours above the limit. Requested power is the higher of the two peaks without storage. Available power is the connection capacity you entered.")}</p>
          <p className="mt-3">{tx("Spannungshinweis aus der angefragten Leistung: bis 135 kW NS und VDE-AR-N 4105, darüber bis 20 MW MS und VDE-AR-N 4110, darüber HS und VDE-AR-N 4120. Das sind Planungshinweise mit Verweis auf die FNN-Seiten, nicht der Anwendungsbereich im Rechtssinn und keine Netzanschlusszusage.", "Voltage hint from requested power: up to 135 kW LV and VDE-AR-N 4105, above that up to 20 MW MV and VDE-AR-N 4110, above that HV and VDE-AR-N 4120. These are planning hints that point at the FNN pages, not the legal scope of the rules and not a connection offer.")}</p>
          <p className="mt-3">{tx("Die Trafolast ist die Spitze am Netzanschlusspunkt geteilt durch einen Planungswert. Ohne eigenen Wert ist das die Anschlussleistung. Es ist kein gemessener Transformator.", "Transformer loading is the peak at the connection point divided by a planning rating. Without a separate value that rating is the connection capacity. It is not a measured transformer.")}</p>
          <p className="mt-3">{tx("Anschlussbegehren über 1,5 MVA werden markiert. Die Schwelle steht in GRID_CONNECTION_CONFIG. Verglichen wird das Maximum aus eingegebener Anschlussleistung und Standortspitze ohne Speicher, in kW bei cos φ = 1. Das ist keine gemessene Scheinleistung und keine Zuteilung.", "Connection requests above 1.5 MVA are flagged. The threshold lives in GRID_CONNECTION_CONFIG. The check uses the higher of the entered connection capacity and the site peak without storage, in kW at cos φ = 1. That is not a measured apparent power and not an allocation.")}</p>
          <p className="mt-3">{tx("Hamburger Energienetze schreiben auf der Seite zu Mittel- und Hochspannung, dass ein Verteilungsverfahren für Netzanschlusskapazitäten größer 1,5 MVA erarbeitet wird. Die Pressemitteilung vom 19. Mai 2026 auf der Startseite nennt das Verfahren Fair Grid und kündigt Runden für neue Hoch- und Mittelspannungsanschlüsse ab dem zweiten Halbjahr 2026 an.", "On its medium- and high-voltage pages, Hamburger Energienetze says an allocation procedure for connection capacity above 1.5 MVA is being prepared. The 19 May 2026 release listed on the operator homepage names the procedure Fair Grid and announces rounds for new high- and medium-voltage connections from the second half of 2026.")}</p>
          <p className="mt-3">{tx("Die flexible Anschlussvereinbarung ist ein zweites Szenario desselben Kerns nach § 17 Abs. 2b EnWG: der Netzbetreiber kann eine statische oder dynamische Begrenzung der Entnahme- oder Einspeiseleistung anbieten. Das Szenario kappt Bezug und Einspeisung auf den Anteil in GRID_CONNECTION_CONFIG. Was der Speicher nicht aufnimmt, gilt als abgeregelt. Kein Anspruch, kein Vertrag, kein SCADA. Das Gesetz setzt die Prozentzahl nicht.", "The flexible connection agreement is a second scenario of the same core under section 17 (2b) EnWG: the grid operator may offer a static or dynamic cap on withdrawal or feed-in. The scenario caps both sides at the share in GRID_CONNECTION_CONFIG. What the battery does not absorb counts as curtailed. No entitlement, no contract, no SCADA. The statute does not set the percentage.")}</p>
        </Section>
        <Section id="netzdienlichkeit" n="§7" title={tx("Einschätzung netzdienlich", "Grid-support estimate")}>
          <p>{tx("Die Marke heißt Einschätzung netzdienlich. Sie ist kein Befund und keine Zusage, dass der Speicher das Netz entlastet. Der Bundesgerichtshof hat im Beschluss vom 15. Juli 2025 (EnVR 1/24) festgehalten, dass nur der Netzbetreiber beurteilen kann, ob und unter welchen Voraussetzungen ein netzdienlicher Speicherbetrieb im örtlichen Verteilernetz Netzausbau vermeidet.", "The badge is labelled as a grid-support estimate. It is not a finding and not a statement that the storage relieves the grid. In its decision of 15 July 2025 (EnVR 1/24), the Federal Court of Justice held that only the grid operator can assess whether, and on what conditions, grid-supportive storage operation avoids reinforcement of the local distribution grid.")}</p>
          <p className="mt-3">{tx("Die Schätzung vergleicht die Entladeenergie mit der Auslastung des Anschlusses. Ein Intervall zählt als Spitzenfenster, wenn die Standortlast mindestens 90 % der Anschlussleistung erreicht. Der Anteil ist die Entladeenergie in diesen Fenstern geteilt durch die gesamte Entladeenergie.", "The estimate compares discharge energy with connection utilisation. An interval counts as a peak window when site load is at least 90% of the connection capacity. The share is discharge energy in those windows divided by all discharge energy.")}</p>
          <p className="mt-3">{tx("Einschätzung netzdienlich ab 60 % und ohne neue Bezugsspitze. Einschätzung gemischt von 30 % bis unter 60 %. Einschätzung marktgetrieben unter 30 %. Einschätzung neue Spitze, sobald ein Ladeintervall die Bezugsspitze über die Spitze ohne Speicher hebt.", "Estimate grid-supportive from 60% and only if charging creates no new import peak. Estimate mixed from 30% up to 60%. Estimate market-driven below 30%. Estimate new peak as soon as a charging interval lifts the import above the peak without storage.")}</p>
          <p className="mt-3">{tx("Die Schwellen 90 %, 60 % und 30 % stehen an einer Stelle im Rechenkern (GRID_SUPPORT_CONFIG). Sie sind vorläufig und noch nicht fachlich bestätigt.", "The 90%, 60% and 30% thresholds live in one place in the calculation core (GRID_SUPPORT_CONFIG). They are provisional and not yet confirmed.")}</p>
        </Section>
        <Section id="live" n="§8" title={tx("Live-Ansicht", "Live view")}>
          <p>{tx("Jede Grafik trägt ihre Ebene im Titel. Eine nationale Reihe heißt Deutschland. Sie wird nicht als Hamburg oder als Norden beschriftet.", "Every chart carries its level in the title. A national series is called Germany. It is not labelled as Hamburg or as the north.")}</p>
          <p className="mt-3">{tx("Die Startseite zeigt den heutigen Tag für Deutschland: Residuallast ist Last minus Wind minus Sonne, Viertelstunde, Energy-Charts. Die Fläche unter null ist Überschuss. Der Bestand der großen Speicher kommt von Battery Charts, RWTH, aus dem Marktstammdatenregister. Der Balken daneben stellt die Kapazität neben den Überschuss. Das ist ein Größenvergleich, keine Messung dessen, was gespeichert wurde. Fehlt die heutige Reihe, bleibt die Fläche leer.", "The homepage shows today’s day for Germany: residual load is load minus wind minus solar, quarter-hour, Energy-Charts. The area below zero is surplus. The large-storage stock comes from Battery Charts, RWTH, from the Marktstammdatenregister. The bar beside it places that capacity next to the surplus. That is a comparison of size, not a measurement of what was stored. If today’s series is missing, the area stays empty.")}</p>
          <p className="mt-3">{tx("Für die Stadt Hamburg gibt es in SMARD und bei Energy-Charts keine freie Viertelstundenreihe von Last oder Wind. Die nächste echte Ebene ist die Regelzone 50Hertz. Darin liegen unter anderem Hamburg, Berlin, Brandenburg, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt und Thüringen. Die TenneT-Regelzone wird nicht als Norddeutschland beschriftet, weil sie auch Bayern umfasst. Wind auf See wird getrennt gezeigt: 50Hertz über die Ostsee, TenneT über die Nordsee.", "SMARD and Energy-Charts have no free quarter-hour series of load or wind for the city of Hamburg. The next real level is the 50Hertz control area. It includes Hamburg, Berlin, Brandenburg, Mecklenburg-Vorpommern, Saxony, Saxony-Anhalt and Thuringia, among others. The TenneT control area is not labelled northern Germany, because it also includes Bavaria. Offshore wind is shown separately: 50Hertz through the Baltic, TenneT through the North Sea.")}</p>
          <p className="mt-3">{tx("Der Day-Ahead-Preis ist die Gebotszone DE-LU, 15 Minuten, von Energy-Charts mit der Lizenz CC BY 4.0 der Bundesnetzagentur | SMARD.de. Die Ampel daran ist eine Lesehilfe in LIVE_PRICE_CONFIG: grün, sobald eine Viertelstunde unter null liegt, gelb ab einer Spanne von 50 €/MWh, rot darunter. Das ist keine Handelsempfehlung.", "The day-ahead price is the DE-LU bidding zone, 15 minutes, from Energy-Charts under the CC BY 4.0 licence of Bundesnetzagentur | SMARD.de. The light on it is a reading aid in LIVE_PRICE_CONFIG: green once a quarter-hour is below zero, yellow from a spread of 50 €/MWh, red below that. It is not trading advice.")}</p>
          <p className="mt-3">{tx("Der Vergleich 50Hertz gegen TransnetBW zeigt, warum die Anteile auseinanderliegen: im Norden steht mehr Wind als im Süden. TransnetBW hat bei SMARD keine Offshore-Reihe, die Süd-Zahl ist Wind an Land plus Photovoltaik.", "The 50Hertz versus TransnetBW comparison shows why the shares differ: the north has more wind than the south. TransnetBW has no offshore series on SMARD, so the southern figure is onshore wind plus solar.")}</p>
          <p className="mt-3">{tx("Erzeugung und Last für Deutschland kommen von Energy-Charts. Die Bilanz nutzt nur einen Zeitpunkt, an dem Last und mindestens eine Erzeugungsserie veröffentlicht sind. Fehlt die Erzeugung, steht dort keine Differenz und kein Defizit aus 0 GW.", "Generation and load for Germany come from Energy-Charts. The balance uses only a timestamp where load and at least one generation series are published. If generation is missing, the page shows no difference and does not invent a deficit from 0 GW.")}</p>
          <p className="mt-3">{tx("Abregelung und Redispatch veröffentlicht Netztransparenz. Der Maschinenabruf braucht einen registrierten Zugang. Diese öffentliche Instanz hat ihn nicht, deshalb steht dort eine Erklärung und keine Megawattzahl.", "Netztransparenz publishes curtailment and redispatch. The machine feed needs a registered login. This public instance does not have one, so the page shows an explanation and no megawatt figure.")}</p>
        </Section>
        <Section id="quellen" n="§9" title={tx("Datenquellen", "Sources")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary"><tr className="num text-[12px] uppercase"><th className="px-2 py-2 text-left">{tx("Quelle", "Source")}</th><th className="px-2 py-2 text-left">{tx("Inhalt", "Content")}</th></tr></thead>
              <tbody>
                <tr className="border-t border-border"><td className="px-2 py-2">Energy-Charts / Fraunhofer ISE</td><td>{tx("Leistung Deutschland, 15 min. Signal des erneuerbaren Anteils, Land. Day-Ahead DE-LU, CC BY 4.0 über SMARD.", "Germany power, 15 min. Renewable-share signal, country. Day-ahead DE-LU, CC BY 4.0 via SMARD.")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.smard.de/en/datennutzung">SMARD · Bundesnetzagentur</a></td><td>{tx("Wind, Photovoltaik und Last je Regelzone, Viertelstunde, CC BY 4.0", "Wind, solar and load by control area, quarter-hour, CC BY 4.0")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">Netztransparenz</td><td>{tx("Abregelung / Redispatch, Abruf mit registriertem Zugang, hier ohne Zahl", "Curtailment / redispatch, registered feed, no figure here")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">MaStR</td><td>{tx("Speicherkarte", "Storage map")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2">OSM / CARTO</td><td>{tx("Kartenkacheln", "Map tiles")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/themen/tar/tar-niederspannung">VDE FNN · TAR Niederspannung</a></td><td>VDE-AR-N 4105</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-mittelspannung-vde-ar-n-4110">VDE FNN · VDE-AR-N 4110</a></td><td>{tx("Mittelspannung, Verweis", "Medium voltage, reference")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.vde.com/de/fnn/arbeitsgebiete/tar/tar-hochspannung-vde-ar-n-4120">VDE FNN · VDE-AR-N 4120</a></td><td>{tx("Hochspannung, Verweis", "High voltage, reference")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">BGH · PM 129/2025</a></td><td>{tx("Beschluss vom 15. Juli 2025, EnVR 1/24", "Decision of 15 July 2025, EnVR 1/24")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.gesetze-im-internet.de/enwg_2005/__17.html">§ 17 EnWG</a></td><td>{tx("Abs. 2b, flexible Netzanschlussvereinbarung", "Subsection 2b, flexible connection agreement")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Netzanschluss/artikel.html">Bundesnetzagentur</a></td><td>{tx("Einordnung flexibler Netzanschlussvereinbarungen", "Flexible connection agreements, public note")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.hamburger-energienetze.de/verbrauchen-erzeugen/planen-anmelden/kundenstation">Hamburger Energienetze</a></td><td>{tx("Verteilungsverfahren über 1,5 MVA; Fair Grid, Mitteilung 19. Mai 2026", "Allocation procedure above 1.5 MVA; Fair Grid, notice of 19 May 2026")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Umwelt/UGR/private-haushalte/Tabellen/stromverbrauch-haushalte.html">Destatis</a></td><td>{tx("Stromverbrauch der Haushalte, Stand 27. September 2023", "Household electricity use, as of 27 September 2023")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href="https://www.bdew.de/energie/standardlastprofile-strom/">BDEW</a></td><td>{tx("Standardlastprofile Strom. Die Zahlenreihe selbst steht nicht in diesem Rechner.", "Standard load profiles for electricity. The numeric series itself is not in this calculator.")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href={FLOWER_BERGEDORF.sources[0].href}>Flower</a></td><td>{tx("BESS Hamburg-Bergedorf, Meldung 10. September 2026", "BESS Hamburg-Bergedorf, notice of 10 September 2026")}</td></tr>
                <tr className="border-t border-border"><td className="px-2 py-2"><a className="underline underline-offset-[3px]" href={FLOWER_BERGEDORF.sources[1].href}>pv magazine</a></td><td>{tx("Spatenstich, 10. September 2026", "Groundbreaking, 10 September 2026")}</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section id="grenzen" n="§10" title={tx("Grenzen und Haftung", "Limits and liability")}>
          <ul className="list-disc pl-5">
            <li>{tx("Beispielprofile, darunter der fiktive Supermarkt in Hamburg und das fiktive Quartier, und das Day-Ahead-Band sind synthetisch und als BEISPIELDATEN markiert. Flower in Bergedorf nutzt nur die veröffentlichten Eckdaten.", "Example profiles, including the fictional Hamburg supermarket and the fictional neighbourhood, and the day-ahead band are synthetic and marked as example data. Flower in Bergedorf uses only the published figures.")}</li>
            <li>{tx("Keine Netzentgelte, keine Steuern, keine Finanzierung, keine Degradation.", "No grid tariffs beyond the inputs, no tax, no financing, no degradation.")}</li>
            <li>{tx("Keine Beschaffungs- oder Anlagenberatung.", "Not procurement or plant advice.")}</li>
            <li>{tx("VDE-AR-N 4105, 4110 und 4120 sind Quellenverweise. Die Spannungsschwellen 135 kW und 20 MW sind Planungshinweise in diesem Rechner, keine Rechtsauskunft.", "VDE-AR-N 4105, 4110 and 4120 are source references. The 135 kW and 20 MW voltage thresholds are planning hints in this calculator, not legal advice.")}</li>
            <li>{tx("Die Einschätzung netzdienlich ist kein Befund des Netzbetreibers. Fair Grid ist keine Zuteilung. Die flexible Anschlussvereinbarung im Rechner ist kein Vertrag.", "The grid-support estimate is not a grid-operator finding. Fair Grid is not an allocation. The flexible connection agreement in this calculator is not a contract.")}</li>
          </ul>
        </Section>
        <Section id="beispiele" n="§11" title={tx("Beispiele", "Examples")} date="2026-10-21">
          <p>{tx("Drei Fälle auf /site. Supermarkt und Quartier sind BEISPIELDATEN. Flower nennt nur Zahlen, die Flower und pv magazine veröffentlicht haben.", "Three cases on /site. The supermarket and the neighbourhood are example data. Flower states only figures that Flower and pv magazine published.")}</p>
          <h3 className="mt-4 text-lg font-medium">{tx("Supermarkt", "Supermarket")}</h3>
          <p>{tx("Fiktiver Betrieb in Hamburg, hinter dem Zähler, Peak Shaving. Dach-PV und netzorientierter Betrieb halten die Bezugsspitze auf der Anschlussgrenze. Das ist kein gemessener Markt.", "A fictional Hamburg site, behind the meter, peak shaving. Rooftop PV and grid-serving operation hold the import peak on the connection limit. That is not a measured market.")}</p>
          <h3 className="mt-4 text-lg font-medium">{tx("Quartier", "Neighbourhood")}</h3>
          <p>{tx(`Fiktives neues Wohngebiet, ${QUARTIER.households} Haushalte hinter einer Ortsnetzstation. Kein Stadtteil von Hamburg und kein gemessener Transformator. Der Speicher steht an der Station. Für den Betreiber zählt Größe und Rückzahlung, für den Netzbetreiber, ob die Station unter ihrer Planleistung bleibt.`, `A fictional new neighbourhood, ${QUARTIER.households} households behind one distribution substation. Not a Hamburg district and not a measured transformer. The battery sits at the station. The operator reads size and payback. The grid operator reads whether the station stays under its planning rating.`)}</p>
          <p>{tx(`Haushaltsstrom ${QUARTIER.householdKwhEach.toLocaleString("de-DE")} kWh je Haushalt für Licht und Geräte, ohne Wärmepumpe. Das liegt nahe an Destatis 2021, Zeile Haushaltsausstattung, 2.893 kWh. Diese Zeile schließt Raumwärme und Beleuchtung aus. Der gesamte Strom je Haushalt 2021 beträgt dort 3.383 kWh, inklusive Raumwärme, Warmwasser, Beleuchtung und Geräte (Stand 27. September 2023).`, `Household electricity ${QUARTIER.householdKwhEach.toLocaleString("en-GB")} kWh each for lights and appliances, without the heat pump. That sits near Destatis 2021, the household-appliances line, 2,893 kWh. That line excludes space heating and lighting. Total electricity per household in 2021 is 3,383 kWh there, including space heating, hot water, lighting and appliances (as of 27 September 2023).`)}</p>
          <p>{tx("Die Form ist eine vereinfachte Abendspitze und auf die genannten Jahreskilowattstunden skaliert. Sie ist nicht das Standardlastprofil H0 und nicht H25. BDEW beschreibt die Profile und verweist auf die VDEW-Norm von 1999; die Profile sind auf 1.000 kWh normiert. Die Zahlenreihe ist urheberrechtlich geschützt und steht hier nicht. Das BDEW-Profil H25 von 2025 ist auf 1.000.000 kWh normiert; auch diese Reihe ist nicht eingelesen.", "The shape is a simplified evening peak, scaled to the stated annual kilowatt-hours. It is not standard load profile H0 and not H25. BDEW describes the profiles and points to the 1999 VDEW norm; the profiles are normalised to 1,000 kWh. That numeric series is copyrighted and is not reproduced here. The 2025 BDEW profile H25 is normalised to 1,000,000 kWh; that series is not ingested either.")}</p>
          <ul className="list-disc pl-5">
            <li>{tx(`Wärmepumpen: ${(QUARTIER.heatPumpShare * 100).toLocaleString("de-DE")} % der Haushalte, ${QUARTIER.heatPumpKwhEach.toLocaleString("de-DE")} kWh je Pumpe, im Winter höher gewichtet. Modellannahme, keine gemessene Jahresarbeitszahl.`, `Heat pumps: ${(QUARTIER.heatPumpShare * 100).toLocaleString("en-GB")}% of households, ${QUARTIER.heatPumpKwhEach.toLocaleString("en-GB")} kWh each, weighted toward winter. A model assumption, not a measured seasonal performance factor.`)}</li>
            <li>{tx(`Wallboxen: ${(QUARTIER.wallboxShare * 100).toLocaleString("de-DE")} % der Haushalte, ${QUARTIER.wallboxKw} kW, Gleichzeitigkeit ${QUARTIER.wallboxCoincidence.toLocaleString("de-DE")}, ${QUARTIER.wallboxHoursPerWeekday.toLocaleString("de-DE")} Stunden je Werktag. Am Wochenende 0. Die Form ist eine Glocke um 18:30 mit einer Breite von 0,7 Stunden. Modellannahme.`, `Chargers: ${(QUARTIER.wallboxShare * 100).toLocaleString("en-GB")}% of households, ${QUARTIER.wallboxKw} kW, coincidence ${QUARTIER.wallboxCoincidence.toLocaleString("en-GB")}, ${QUARTIER.wallboxHoursPerWeekday.toLocaleString("en-GB")} hours on a weekday. Weekends are 0. The shape is a bell around 18:30 with a width of 0.7 hours. A model assumption.`)}</li>
            <li>{tx(`Dach-PV: ${(QUARTIER.pvShare * 100).toLocaleString("de-DE")} % der Haushalte mal ${QUARTIER.pvKwpEach} kWp, zusammen ${quartierPvKwp().toLocaleString("de-DE")} kWp Süd. Dieselbe klare-Himmel-Reihe wie im übrigen Rechner.`, `Rooftop PV: ${(QUARTIER.pvShare * 100).toLocaleString("en-GB")}% of households times ${QUARTIER.pvKwpEach} kWp, ${quartierPvKwp().toLocaleString("en-GB")} kWp south in total. The same clear-sky series as the rest of the calculator.`)}</li>
            <li>{tx(`Planleistung der Station ${QUARTIER.transformerKw} kW bei cos φ = 1. Annahme für eine bestehende Station, die die neue Last ohne Speicher überschreitet. Kein Hamburger Betriebsmittel.`, `Station planning rating ${QUARTIER.transformerKw} kW at cos φ = 1. An assumption for an existing station that the new load would exceed without storage. Not a Hamburg asset.`)}</li>
            <li>{tx(`Speicher von Hand ${QUARTIER.powerKw} kW / ${QUARTIER.energyKwh} kWh, Betrieb netzorientiert, dynamischer Tarif aus. Leistungspreis ${QUARTIER.demandChargeEurPerKwYear} €/kW·a, Arbeitspreis ${QUARTIER.energyPriceCtPerKwh.toLocaleString("de-DE")} ct/kWh, Einspeisung ${QUARTIER.feedInCtPerKwh} ct/kWh, Wirkungsgrad ${(QUARTIER.roundTripEfficiency * 100).toLocaleString("de-DE")} %, CAPEX ${QUARTIER.capexEurPerKwh} €/kWh, Lebensdauer ${QUARTIER.lifetimeYears} Jahre, Diskont 0. Dieselben Preisannahmen wie im Supermarkt, kein Angebot.`, `Battery entered by hand at ${QUARTIER.powerKw} kW / ${QUARTIER.energyKwh} kWh, grid-serving operation, dynamic tariff off. Demand charge ${QUARTIER.demandChargeEurPerKwYear} €/kW·year, energy price ${QUARTIER.energyPriceCtPerKwh.toLocaleString("en-GB")} ct/kWh, feed-in ${QUARTIER.feedInCtPerKwh} ct/kWh, round-trip efficiency ${(QUARTIER.roundTripEfficiency * 100).toLocaleString("en-GB")}%, CAPEX ${QUARTIER.capexEurPerKwh} €/kWh, lifetime ${QUARTIER.lifetimeYears} years, discount 0. The same price assumptions as the supermarket, not a quote.`)}</li>
            <li>{tx("Der Spannungshinweis folgt der angefragten Leistung und landet bei Mittelspannung. Das ist die Regel dieses Rechners, keine gemessene Spannung der Station.", "The voltage hint follows requested power and lands on medium voltage. That is this calculator’s rule, not a measured station voltage.")}</li>
          </ul>
          <h3 className="mt-4 text-lg font-medium">Flower BESS Hamburg-Bergedorf</h3>
          <p>{tx(`Öffentliche Referenz, kein fiktives Lastprofil. ${FLOWER_BERGEDORF.powerMw} MW, ${FLOWER_BERGEDORF.energyMwh} MWh, Baubeginn 9. September 2026, Betrieb geplant ${FLOWER_BERGEDORF.operationPlannedDe}. Vermarktung durch ${FLOWER_BERGEDORF.marketer} über ein ${FLOWER_BERGEDORF.agreementDe}. Stunden bei voller Leistung: ${flowerHoursAtFullPower()} h, das ist ${FLOWER_BERGEDORF.energyMwh} MWh geteilt durch ${FLOWER_BERGEDORF.powerMw} MW.`, `A public reference, not a fictional load profile. ${FLOWER_BERGEDORF.powerMw} MW, ${FLOWER_BERGEDORF.energyMwh} MWh, construction started 9 September 2026, operation planned for the ${FLOWER_BERGEDORF.operationPlannedEn}. Marketed by ${FLOWER_BERGEDORF.marketer} under a ${FLOWER_BERGEDORF.agreementEn}. Hours at full power: ${flowerHoursAtFullPower()} h, which is ${FLOWER_BERGEDORF.energyMwh} MWh divided by ${FLOWER_BERGEDORF.powerMw} MW.`)}</p>
          <p>{tx("Spannung, Netzanschlusspunkt, Erlös und Preis stehen in den beiden Quellen nicht. Der Rechner erfindet sie nicht. Ein Speicher vor dem Zähler hat keine Standortlast, deshalb keine Euro-Kachel und keine Anschlussgrenze. Für den Netzbetreiber bleibt die Frage, ob der Speicher lädt, während das Netz voll ist, plus das Szenario einer flexiblen Anschlussvereinbarung nach § 17 Abs. 2b EnWG. Die 80 % an anderer Stelle sind eine Modellannahme und nicht der Anschluss von Flower.", "The two sources do not state voltage, connection point, revenue or price. This calculator does not invent them. A front-of-meter battery has no site load, so there is no euro tile and no connection limit. For the grid operator the remaining question is whether the battery charges while the grid is full, plus the flexible-connection scenario under section 17 (2b) EnWG. The 80% used elsewhere is a model assumption and is not Flower’s connection.")}</p>
          <p>
            <a className="underline underline-offset-[3px]" href={FLOWER_BERGEDORF.sources[0].href}>Flower</a>
            {" · "}
            <a className="underline underline-offset-[3px]" href={FLOWER_BERGEDORF.sources[1].href}>pv magazine</a>
          </p>
        </Section>
        <Section id="glossar" n="§12" title={tx("Glossar", "Glossary")}>
          <p>{tx("Dieselben kurzen Erklärungen stehen als Hinweis an den Begriffen im Rechner.", "The same short explanations appear as hints on the terms in the calculator.")}</p>
          <dl className="mt-4 space-y-4">
            {GLOSSARY.map((entry) => (
              <div key={entry.id}>
                <dt className="font-medium">{language === "de" ? entry.term.de : entry.term.en}</dt>
                <dd className="text-muted-foreground">{language === "de" ? entry.text.de : entry.text.en}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section id="changelog" n="§13" title={tx("Changelog", "Changelog")}>
          <p className="num">2026-10-20 — {tx("Control-Room-Oberfläche, Standort-Rechner, Live unter /live.", "Control-room interface, site calculator, live view at /live.")}</p>
          <p className="num mt-2">2026-10-20 — {tx("Zwei Sichten auf /site: Projektierer und Netzbetreiber, ein Rechenkern. NPV, Spannungshinweis, netzorientierter Betrieb, flexibles Anschluss-Szenario.", "Two views on /site: developer and grid operator, one calculation core. NPV, voltage hint, grid-oriented operation, flexible-connection scenario.")}</p>
          <p className="num mt-2">2026-10-20 — {tx("Einschätzung netzdienlich statt Befund (BGH EnVR 1/24). Hinweis über 1,5 MVA, Fair Grid. Szenario nach § 17 Abs. 2b EnWG.", "Grid-support estimate instead of a finding (BGH EnVR 1/24). Flag above 1.5 MVA, Fair Grid. Scenario under section 17 (2b) EnWG.")}</p>
          <p className="num mt-2">2026-10-21 — {tx("Klare Sprache, Glossar, Ampel als Lesehilfe, Beispiel Supermarkt in Hamburg.", "Plain language, glossary, traffic-light reading aid, Hamburg supermarket example.")}</p>
          <p className="num mt-2">2026-10-21 — {tx("Einstieg mit zwei Perspektiven. Beispiele Supermarkt, Quartier und Flower Bergedorf. /site öffnet die Projektierung mit dem Supermarkt, gekennzeichnet als Beispieldaten. Die Netzansicht beginnt mit der Anschluss-Ampel.", "Entry with two perspectives. Examples: supermarket, neighbourhood, and Flower Bergedorf. /site opens the project view on the supermarket, labelled as example data. The grid view starts with the connection traffic light.")}</p>
          <p className="num mt-2">2026-10-21 — {tx("Live-Ansicht mit benannter Ebene: Regelzone 50Hertz, Gebotszone DE-LU, Deutschland. Keine Abregelungszahl ohne freie Reihe. Der Zonenvergleich sagt, dass im Norden mehr Wind steht als im Süden.", "Live view with a named level: 50Hertz control area, DE-LU bidding zone, Germany. No curtailment figure without a free series. The area comparison says the north has more wind than the south.")}</p>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, n, title, date = "2026-10-20", children }: { id: string; n: string; title: string; date?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{n}</p>
      <h2 className="mt-2 text-2xl font-medium">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
      <p className="num mt-4 text-[12px] text-muted-foreground">{date}</p>
    </section>
  );
}

function Formula({ children }: { children: string }) {
  return <p className="num border border-border bg-secondary px-4 py-3 text-[15px]">{children}</p>;
}

function Callout({ title, children }: { title: string; children: string }) {
  return (
    <aside className="border-l-[3px] border-warning pl-4">
      <p className="num text-[12px] tracking-[0.08em] uppercase">{title}</p>
      <p className="mt-1">{children}</p>
    </aside>
  );
}
