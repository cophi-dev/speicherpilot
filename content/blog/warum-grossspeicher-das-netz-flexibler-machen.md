# Warum Großspeicher das Netz flexibler machen

*Was Batterie-Großspeicher technisch leisten, wie der Markt sie einsetzt und worauf Projektentwickler achten. Ein Überblick aus drei Blickwinkeln: Netz, Markt, Projekt.*

*Stand der Zahlen und Rechtslage: 27.10.2026. Quellen stehen in eckigen Klammern, die Liste folgt am Ende. Gemeint sind Batterie-Großspeicher (BESS), keine Heimspeicher.*

<!--ARTIKELTEXT_START-->

## Ein Sonntag im Netz

Am Sonntag, dem 11.10.2026, kostete Strom im Day-Ahead-Handel (Preisgebiet DE-LU) zwischen 13 und 14 Uhr im Stundenmittel 15 Euro pro Megawattstunde. Zwischen 19 und 20 Uhr waren es 235 Euro. [Q16]

Das Muster ist bekannt. Mittags kommt viel Wind- und Solarstrom ins Netz, abends sinkt die Solareinspeisung bei hoher Nachfrage. Batteriespeicher können Energie von der Mittagszeit in den Abend verschieben und so Angebot und Nachfrage näher zusammenbringen. [Q12]

Das ist die einfachste Form von Flexibilität. Dieser Beitrag betrachtet sie aus drei Richtungen: was ein Großspeicher technisch kann, was er für das Netz bedeutet und wie Markt und Projektentwicklung damit umgehen.

## Was ein Großspeicher technisch ist

Ein Batterie-Großspeicher besteht aus Batteriezellen, Wechselrichtern und einem Transformator. Der Wechselrichter wandelt Gleichstrom aus der Batterie in Wechselstrom fürs Netz und umgekehrt. Der Transformator hebt die Spannung auf die des Netzanschlusses. Beim Speicher in Bollingstedt (Schleswig-Holstein) sind das 64 Container mit Lithium-Ionen-Batterien und 32 Container für Wechselrichter und Transformatoren. [Q1]

Vier Begriffe helfen beim Lesen von Datenblättern:

- **MW und MWh.** Die Leistung in Megawatt sagt, wie schnell ein Speicher laden oder entladen kann. Die Kapazität in Megawattstunden sagt, wie viel Energie hineinpasst. Bollingstedt hat 103,5 MW und 238 MWh. Bei voller Leistung ist der Speicher damit rechnerisch nach gut zwei Stunden (238 geteilt durch 103,5, also etwa 2,3 Stunden) leer. Dieses Verhältnis heißt Speicherdauer. Bei Großspeichern ist sie von etwa einer auf etwa zwei Stunden gewachsen. [Q12]
- **C-Rate.** Sie setzt Leistung und Kapazität ins Verhältnis. 1 C entspricht einer Vollentladung in einer Stunde. Bollingstedt liegt bei rund 0,43 C (eigene Rechnung).
- **SoC (State of Charge).** Der Ladezustand in Prozent. Ein Speicher nutzt meist nicht den gesamten Bereich. Das Modell von SpeicherPilot rechnet mit einem nutzbaren Bereich von 10 bis 90 Prozent (Modellannahme).
- **Round-Trip-Wirkungsgrad.** Der Anteil der eingespeicherten Energie, der wieder herauskommt. SpeicherPilot nimmt 85 Prozent an, mit einer Spanne von 80 bis 90 Prozent (Modellannahme). Der Preissimulator des Fraunhofer ISE rechnet mit 86 Prozent. [Q4] Aus 100 MWh Ladung werden damit rund 85 MWh Entladung.

Zur Geschwindigkeit: Für Regelleistung zur Frequenzhaltung (FCR) muss die volle Leistung innerhalb von 30 Sekunden bereitstehen. [Q5] Der Netzbooster von TransnetBW soll Überlastungen nach Angaben des Netzbetreibers „sekundenschnell" ausgleichen. [Q13]

Modernere Umrichter können außerdem netzbildend arbeiten. Sie verhalten sich dann wie eine Spannungsquelle und können Momentanreserve liefern, also eine sofortige Stützwirkung bei schnellen Frequenzänderungen. Die technischen Anforderungen hat das VDE FNN beschrieben. [Q15] Für neu im Übertragungsnetz angeschlossene Batteriespeicher gilt laut dena ein verpflichtender Standard für netzbildende Eigenschaften. [Q12]

## Blickwinkel Netz

**Frequenz.** Das Netz muss bei 50 Hertz bleiben, Erzeugung und Verbrauch müssen sich ausgleichen. Die Übertragungsnetzbetreiber halten dafür Regelreserve vor. FCR reagiert automatisch auf die Netzfrequenz und muss innerhalb von 30 Sekunden voll erbracht werden. Die automatische Sekundärregelung (aFRR) hat 5 Minuten Zeit. [Q5, Q6] Batteriespeicher können Regelenergie bereitstellen. [Q12] Anbieter müssen die geforderten Zeiten in einer Präqualifikation mit Betriebsfahrt nachweisen. [Q7] Der Bedarf wird von den Netzbetreibern bemessen, der Markt ist also nach oben begrenzt. Die Kosten für die Beschaffung von FCR, aFRR und mFRR lagen 2024 bei rund 0,5 Milliarden Euro. [Q9]

**Spannung und Blindleistung.** Batteriespeicher haben nach Einschätzung von 50Hertz das technische Potenzial für Momentanreserve und für statische und dynamische Blindleistung. [Q14] Beim Netzbooster Kupferzell nennt TransnetBW die Blindleistungsbereitstellung als zusätzlichen Nutzen. [Q13]

**Engpässe.** Wenn eine Leitung überlastet zu werden droht, senken Netzbetreiber die Einspeisung vor dem Engpass und erhöhen sie dahinter. Das heißt Redispatch. 2025 gab es 30.319 GWh an Maßnahmen des Netzengpassmanagements. Die vorläufigen Kosten betrugen rund 3.071 Millionen Euro. Etwa 3,5 Prozent der erneuerbaren Erzeugung wurden abgeregelt, über 96 Prozent kamen beim Verbraucher an. [Q8] Der Anteil der Redispatch-Menge bei Erneuerbaren, der durch Engpässe im Verteilnetz entstand, stieg von 26 Prozent (2024) auf 35 Prozent (2025). [Q8]

Ein Speicher kann hier helfen, weil er an der richtigen Stelle Energie aufnimmt oder abgibt. Der Bundesgerichtshof hat 2025 festgehalten, dass Batteriespeicher netzdienliche Wirkungen haben können, weil sie bei Netzengpässen bedarfsgerecht speichern oder einspeisen können. [Q10] TransnetBW baut den Netzbooster Kupferzell mit 250 MW und 250 MWh. Er springt im Fehlerfall für bis zu eine Stunde ein, bis Kraftwerke den Redispatch übernehmen. So lassen sich Leitungen im Normalbetrieb höher auslasten. [Q13, Q18] Der Bau läuft, Stand 27.10.2026. [Q13]

**Besser ausgelastete Anschlüsse.** Ein Netzanschluss ist auf eine maximale Leistung ausgelegt. Eine flexible Netzanschlussvereinbarung erlaubt dem Netzbetreiber, Entnahme oder Einspeisung statisch oder dynamisch zu begrenzen. So kann ein Speicher auch dort angeschlossen werden, wo nicht jederzeit volle Kapazität frei ist. Das Gesetz sieht diese Möglichkeit vor: Netzbetreiber können sie anbieten (§ 17 Abs. 2b EnWG). [Q11] Im Gegenzug ist der Betrieb des Speichers eingeschränkt. [Q12] Ebenso kann ein Speicher einen Anschluss mit einer Solaranlage teilen. Das nennt sich Überbauung oder Co-Location. [Q12]

Wichtig ist dabei die Fahrweise. Die dena und 50Hertz weisen darauf hin, dass ein rein preisgetriebener Betrieb nicht automatisch dem Netz nützt. Die Wirkung hängt von der lokalen Netzsituation ab. [Q12, Q14] Deshalb sind Vorgaben zur Fahrweise und lokale Signale ein Thema.

**Regulatorisch ist vieles im Fluss.** Das Bundeskabinett hat am 29.07.2026 ein „Netzanschlusspaket" verabschiedet, das Anschlussverfahren neu ordnet und Priorisierungen nach gesetzlichen Kriterien vorsieht. [Q17, Q19] Parallel liegt ein Gesetzentwurf des Bundesrats vom 10.07.2026 im Bundestag (Drucksache 21/7734). Er würde flexible Anschlussvereinbarungen für Stand-Alone-Batteriespeicher verpflichtend machen. [Q17, Q19] Die Bundesregierung sieht ebenfalls Handlungsbedarf, hält eine separate Initiative aber nicht für nötig und verweist auf ihr Paket. [Q19] Beides sind Entwürfe. Ob und in welcher Form sie in Kraft treten, ist offen.

## Blickwinkel Markt

Wirtschaftlich beruht ein Großspeicher auf Preisunterschieden und auf Systemdienstleistungen.

**Day-Ahead und Intraday.** Am Day-Ahead-Markt werden Strompreise für jede Stunde des Folgetags festgelegt. Ein Speicher lädt in günstigen und entlädt in teuren Stunden. Wie groß die Tagesspanne ist, schwankt. Das Fraunhofer ISE nennt für 2025 einen mittleren Preisunterschied von 130 Euro pro MWh zwischen der teuersten und der billigsten Viertelstunde eines Tages. [Q4] Eine eigene Auswertung der Stundenwerte von SMARD ergibt für 2025 im Mittel rund 124 Euro pro MWh und für 2026 bis zum 27.10. rund 158 Euro pro MWh. Stundenwerte sind Mittelwerte und glätten Spitzen, ein Vergleich mit dem ISE-Wert ist deshalb nur grob möglich. Auch das allgemeine Preisniveau war 2026 höher (Mittel rund 112 gegenüber rund 89 Euro pro MWh). [Q16] Eine Spanne ist kein Erlös, denn Wirkungsgrad, Leistung und Kapazität setzen Grenzen.

**Regelleistung und Revenue Stacking.** Zusätzlich zum Handel kann ein Speicher Regelleistung anbieten. Beide Märkte nacheinander oder in Zeitscheiben zu bedienen, nennt man Revenue Stacking. Das ISE betont, dass Intraday-Handel und Regelenergie zu den Day-Ahead-Erlösen hinzukommen. [Q4]

**Kannibalisierung.** Je mehr Speicher am Markt sind, desto kleiner werden die Preisunterschiede, von denen Speicher leben. Das ISE hat diesen Effekt mit den echten Geboten von 2025 nachgerechnet. Mit 20 GW Batterien und 2 Stunden Speicherdauer sinkt die mittlere Tagesspanne von 130 auf 53 Euro pro MWh. Stunden über 200 Euro pro MWh gehen von 169 auf 20 zurück, negative Stunden von 575 auf 271. Der Marktwert von Solarstrom steigt um 35 Prozent. [Q4] Der Day-Ahead-Erlös je Kilowatt Leistung fällt in dieser Modellrechnung von 35 Euro pro Jahr bei 2 GW auf 11 Euro bei 20 GW (Modellschätzung, nur Day-Ahead, 2 Stunden). [Q3]

Zur Einordnung: Im Marktstammdatenregister standen am 13.10.2026 rund 4,5 GW und 7,9 GWh in 654 Großspeichern (über 1 MWh Kapazität) in Betrieb. Weitere 12 GW und 37 GWh sind als geplant registriert, ein Teil davon wird nicht oder später gebaut. [Q3] Die 20 GW der Simulation liegen deutlich über dem heutigen Bestand. Das Fraunhofer ISE stellt zugleich fest: Speicher glätten Preise, erzeugen aber keinen Strom. [Q4]

## Blickwinkel Projektentwicklung

Der Weg vom Grundstück zum Betrieb hat grob diese Stationen. Beitrag 3 dieser Reihe geht darauf ausführlich ein.

1. **Standort und Netzverknüpfungspunkt.** Beim Projekt Bollingstedt war die Nähe zu einem bestehenden Umspannwerk Grundlage der Standortwahl. [Q1, Q2]
2. **Netzanschlussanfrage.** Anschlusskapazität ist gefragt. Nach einer BDEW-Auswertung vom November 2025 haben Netzbetreiber rund 80 GW an Anschlusszusagen für Speicher erteilt, bei Anfragen von über 700 GW. Ein großer Teil der Anfragen sind laut dena Mehrfachanfragen oder Projekte mit geringer Realisierungswahrscheinlichkeit. [Q12] Für Anschlüsse im Übertragungsnetz haben die vier Netzbetreiber ein Reifegradverfahren vorgeschlagen, das nach Projektreife priorisiert. [Q12]
3. **Anschlusskosten.** Netzbetreiber dürfen laut BGH (Beschluss vom 15.07.2025, EnVR 1/24) für netzgekoppelte Batteriespeicher einen Baukostenzuschuss nach dem Leistungspreismodell erheben. Der Zuschuss soll den Anschluss am tatsächlichen Leistungsbedarf ausrichten und zur Finanzierung des Verteilernetzes beitragen. [Q10, Q20] Daneben sind Speicher, die bis August 2029 in Betrieb gehen, unter den Voraussetzungen des § 118 Abs. 6 EnWG für 20 Jahre von den Netzzugangsentgelten für den Strombezug freigestellt. [Q11] Laut dena wird die Netzentgeltsystematik von der Bundesnetzagentur überarbeitet (Stand 02/2026). [Q12]
4. **Finanzierung und Vermarktung.** Projektentwickler schließen zunehmend Power Storage Agreements ab. Sie sichern laufende Einnahmen ab und verteilen Risiken, analog zu Power Purchase Agreements (PPA). [Q12]
5. **Bau, Inbetriebnahme, Präqualifikation.** Wer Regelleistung anbieten will, muss die Eignung gegenüber dem Übertragungsnetzbetreiber nachweisen. [Q7]

Die größte Unsicherheit liegt in den Erlösen. Die dena beschreibt die langfristige Erlösentwicklung als unsicher, weil der Markt ab einem gewissen Punkt sättigt und Speicher mit anderen Flexibilitäten konkurrieren. [Q12] Hinzu kommt die Alterung. Zellen verlieren mit Zyklen und Zeit an nutzbarer Kapazität, der ISE-Simulator rechnet Alterungskosten je MWh ein. [Q4] Bollingstedt ist auf zwei Lade- und Entladevorgänge pro Tag ausgelegt. [Q2] Kosten für Bau und Betrieb nennt dieser Beitrag nicht, weil keine belastbare öffentliche Zahl vorliegt.

## Ein Referenzbeispiel: Bollingstedt

Der Speicher in Bollingstedt ist ein öffentlich gut dokumentiertes Beispiel. Nach Angaben des Betreibers ECO STOR ist er seit April 2025 am Netz und wurde am 05.06.2025 offiziell eingeweiht. Er hat 103,5 MW Leistung und 238 MWh Kapazität, 212.992 Batteriezellen in 512 Schränken auf etwa 1,2 Hektar und speist in das Netz der SH-Netz ein. [Q1, Q2] Zum Zeitpunkt der Einweihung zählte er zu den größten Batteriespeichern Deutschlands. [Q1] Erlöse oder Betriebsdaten des Speichers sind hier nicht zitiert, weil dazu keine geprüften öffentlichen Angaben vorliegen.

<!--ARTIKELTEXT_ENDE-->

> ### Was dieser Artikel vereinfacht
>
> - **Ein Tag ist kein Jahr.** Der Sonntag am Anfang ist ein einzelner Tag. Spannen und Erlöse schwanken mit Wetter, Jahreszeit und Brennstoffpreisen.
> - **Spanne ist nicht Erlös.** Verluste durch den Wirkungsgrad, begrenzte Leistung und Kapazität sowie Alterung stehen zwischen Preisunterschied und Ergebnis. Der Round-Trip-Wirkungsgrad hängt von Anlage und Betrieb ab. 85 Prozent sind eine Modellannahme, kein Messwert einer bestimmten Anlage.
> - **Die ISE-Zahlen sind Modellrechnungen.** Sie nutzen reale Gebote von 2025, gelten aber nur für den Day-Ahead-Markt und unterstellen, dass sich andere Marktteilnehmer nicht anpassen. Das Fraunhofer ISE weist selbst darauf hin, dass kein Modell diese Anpassung vollständig abbilden kann. Die Entwicklung des Simulators wurde unter anderem von ECO STOR, dem Betreiber des Beispielspeichers, mitfinanziert. [Q4]
> - **Preisnehmer.** Die Rechnungen gehen davon aus, dass ein einzelner Speicher den Preis nicht beeinflusst. Bei großen Flotten stimmt das nicht mehr, wie der Abschnitt zur Kannibalisierung zeigt.
> - **Netz ist lokal.** Ob ein Speicher entlastet, hängt vom Standort, vom Netzzustand und von der Fahrweise ab. Der Artikel gibt dafür keine pauschale Antwort.
> - **Rechtsstand.** Rechtliche Aussagen gelten für den 27.10.2026. Gesetzentwürfe können sich ändern. Der Artikel ist keine Rechtsberatung.
> - **Registerzahlen.** Das Marktstammdatenregister beruht auf Meldungen der Betreiber. Der Eintrag „in Planung" heißt nicht genehmigt oder gebaut.
>
> **Welche Gegenfrage ein Profi stellen würde:** Welche Erlöse kommen aus welchem Markt, und was bleibt davon nach Netzanschlusskosten und einer möglichen Einschränkung der Fahrweise übrig?

## Ausblick

Großspeicher werden das Netz nicht allein entlasten, denn der Netzausbau bleibt laut dena zentral. [Q12] Sie können aber Spitzen verschieben, Regelreserve stellen und Leitungen besser auslasten, wenn Fahrweise und Netzanschluss zusammenpassen. Wie schnell das gelingt, hängt an Anschlussverfahren, Netzentgelten und an der Frage, welche Erlöse in einem Markt mit vielen Speichern übrig bleiben. Die Szenarien des Fraunhofer ISE (REMod, Stand 2024/2025) sehen für 2030 je nach Annahmen 66 bis 169 GWh an Batteriespeichern vor, stationär und in Fahrzeugen. Das sind Wenn-dann-Rechnungen, keine Prognosen. [Q3]

Wer solche Zusammenhänge selbst nachrechnen möchte, findet auf speicherpilot.app ein Rechenwerkzeug mit offen gelegten Modellannahmen.

---

## Quellen

Alle Links wurden am 27.10.2026 mit curl geprüft (HTTP 200). Stand = Veröffentlichungs- bzw. Abrufdatum der Quelle.

| Nr. | Quelle | Stand | Link |
|---|---|---|---|
| Q1 | ECO STOR: Einweihung in Bollingstedt (Pressemitteilung) | 05.06.2025, Abruf 27.10.2026 | https://www.eco-stor.de/de/unternehmen/news/250605_Einweihung_BOL |
| Q2 | ECO STOR: Projektseite Bollingstedt (Eckdaten) | Abruf 27.10.2026 | https://www.eco-stor.de/de/unsere%20speicher/Projekt%20Bollingstedt |
| Q3 | Fraunhofer ISE / Energy-Charts: Wie viel Speicher haben wir schon im Netz (Vortrag, MaStR-Stand 13.10.2026) | 20.10.2026 | https://energy-charts.info/presentations/2026-10-20_Speicher_Bestand_Bedarf_SolarClusterBW.pdf |
| Q4 | Fraunhofer ISE: Energy-Charts startet Preissimulator (Pressemitteilung) | 01.10.2026 | https://www.ise.fraunhofer.de/de/presse-und-medien/presseinformationen/2026/datenplattform-energy-charts-startet-preissimulator.html |
| Q5 | regelleistung.net: Frequency Containment Reserve, Aktivierung | Abruf 27.10.2026 | https://www.regelleistung.net/en-us/Become-a-balancing-service-provider/Activation-of-reserves/Frequency-Containment-Reserve |
| Q6 | regelleistung.net: Präqualifikation von Regelreserve in Deutschland (Allgemeine Informationen, Tabelle FCR/aFRR/mFRR) | Abruf 27.10.2026 | https://www.regelleistung.net/cdn/files/0cb7f8df-290b-4b51-6a59-08debc94191b/allgemeine%20informationen_pq%20von%20regelreserve%20in%20deutschland_.pdf |
| Q7 | regelleistung.net: PQ-Bedingungen für FCR, aFRR und mFRR | Fassung 07.10.2026 | https://www.regelleistung.net/cdn/files/64507326-b71c-41b0-cdb6-08df1e03d14c/pq-bedingungen-2026_10_07.pdf |
| Q8 | Bundesnetzagentur / SMARD: Netzengpassmanagement 2025 | 30.03.2026 | https://www.smard.de/page/en/topic-article/5892/220534/volume-of-measures-stable-in-the-year-as-a-whole |
| Q9 | Bundesnetzagentur: Monitoringbericht 2025 | 2025 | https://data.bundesnetzagentur.de/Bundesnetzagentur/SharedDocs/Downloads/EN/Areas/ElectricityGas/CollectionCompanySpecificData/Monitoring/MonitoringReport2025.pdf |
| Q10 | Bundesgerichtshof: Pressemitteilung Nr. 129/2025 zu EnVR 1/24 | 15.07.2025 | https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html |
| Q11 | Gesetze im Internet: § 17 EnWG und § 118 EnWG | Abruf 27.10.2026 | https://www.gesetze-im-internet.de/enwg_2005/__17.html und https://www.gesetze-im-internet.de/enwg_2005/__118.html |
| Q12 | dena: Großbatteriespeicher effizient integrieren (Analyse) | 02/2026 | https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2026/Analyse_Grossbatteriespeicher_UA.pdf |
| Q13 | TransnetBW: Netzbooster Kupferzell, Projektporträt und Projektseite | Abruf 27.10.2026 | https://www.transnetbw.de/de/netzentwicklung/projekte/netzbooster-kupferzell/projektportraet und https://www.transnetbw.de/de/netzentwicklung/projekte/netzbooster-kupferzell |
| Q14 | 50Hertz: Policy Brief „Hochlauf der Großbatteriespeicher" | 2025 | https://www.50hertz.com/xspProxy/api/staticfiles/50hertz-client/dokumente/transparenz/positionspapiere/50hertz_policy_brief_grossbatteriespeicher_.pdf |
| Q15 | VDE FNN: Hinweis Netzbildende Eigenschaften inkl. Momentanreserve, Version 2.0 | 05/2025 | https://www.vde.com/resource/blob/2387778/d2af154bb6d0669eaaf705dbf0594b86/vde-fnn-hinweis-netzbildende-eigenschaften-download-data.pdf |
| Q16 | SMARD (Bundesnetzagentur): Day-Ahead-Großhandelspreise DE-LU, Stundenwerte, eigene Auswertung | Daten bis 27.10.2026 | https://www.smard.de/app/chart_data/4169/DE-LU/index_hour.json (Marktdaten: https://www.smard.de/home/marktdaten) |
| Q17 | Deutscher Bundestag: hib 673/2026 „Bundesrat will Vergabe von Netzanschlüssen neu regeln" | 31.08.2026 | https://www.bundestag.de/presse/hib/kurzmeldungen-1209238 |
| Q18 | Bundesnetzagentur: Genehmigung nach § 11b EnWG, Netzbooster-Pilotanlage Kupferzell (250 MW / 250 MWh) | 05.09.2023 | https://www.bundesnetzagentur.de/SharedDocs/Downloads/DE/Sachgebiete/Energie/Unternehmen_Institutionen/EntflechtungKonzession/Entflechtung/GenehmigungKupferzell.pdf?__blob=publicationFile&v=1 |
| Q19 | Deutscher Bundestag: Drucksache 21/7734, Gesetzentwurf des Bundesrates zur Änderung des EnWG | 26.08.2026 | https://dserver.bundestag.de/btd/21/077/2107734.pdf (Bundesrat-Beschluss BR-Drs. 143/26 vom 10.07.2026: https://dserver.bundestag.de/brd/2026/0143-26B.pdf) |
| Q20 | Bundesgerichtshof: Beschluss EnVR 1/24 (Volltext) | 15.07.2025 | https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/UebrigeSenate/KartS/2024/EnVR___1-24.pdf?__blob=publicationFile&v=3 |

Eigene Rechnungen sind im Text als solche gekennzeichnet und im Faktencheck (`blog1_faktencheck.md`) mit Methode dokumentiert.
