# Audit — Premium-Lauf, 9. November 2026

Live-Seite `https://www.speicherpilot.app`, Stand Commit `dfb2f88` (main, inkl. PR #77). Durchgeklickt: `/`, `/tag`, `/monat`, `/ort`, `/methodik`, `/beitraege`, jeweils 1440 und 390 px, hell und dunkel. Bilder: [`screens/vorher/`](screens/vorher/) (`*-fold.png` erster Bildschirm, `*-full.png` ganze Seite). Kernzahlen vorher: [`kernzahlen-vorher.json`](kernzahlen-vorher.json).

Sortierung innerhalb jeder Kategorie: größte Wirkung zuerst.

## Zielgruppen und ihre Aufgaben

| Zielgruppe | Aufgabe auf der Seite | Wo sie heute hängen bleibt |
| --- | --- | --- |
| Speicherprojektierer | Wie oft gibt es Überschuss, wie groß, wie viel davon nimmt die heutige Flotte schon auf? Lohnt mehr Speicher? | Auf `/` steht zwischen Tageskurve und 30-Tage-Modell ein Block aus Formel, Quelle, Modell und Netz. Der Weg zur ×2/×5/×10-Frage ist länger als nötig. |
| Netzplaner (städtischer VNB) | Abendspitze, Restlast, wann und wie stark die Lücke ist; Anschlussfrage am Ort getrennt von der Marktsicht. | `/monat` beginnt mit Text und Bedienelementen, die Monatskurve liegt unter dem Falz. Die Hauptkennzahl ist ein Satz in Fettschrift über vier Zeilen. |
| Forschung, Institute | Nachvollziehbarkeit: Quelle, Einheit, Formel, Unsicherheit, Daten je Tag. | Gut bedient von `/methodik` und den Tabellen. Fehlt: eine Skala an der 30-Tage-Leiste oben, damit die Leiste ohne Hover lesbar ist. |

## Konzept und Story

1. **Roter Faden stimmt, der Einstieg ist zu laut.** Start erzählt Tag → 30 Tage → Ort. Das trägt. Aber nach der Tageskurve kommt ein vierteiliger Erklärblock (Formel, Daten, Modell, Netz, dazu „Annahmen und Zeiträume“). Er unterbricht die Geschichte genau dort, wo die Frage „was brächte mehr Speicher“ beginnen sollte. **Pflichtpunkt: in Fußnoten.**
2. **Doppelte Leiste ohne Bezug.** Der Kopf zeigt „Überschuss je Tag“ als graue Leiste ohne Skala und Datum. Kapitel 02 zeigt dieselben 30 Tage mit Achse und Modellanteil. Die Kopf-Leiste muss für sich lesbar sein: Höchstwert, Zeitraum, markierter Tag.
3. **Negativer Aufmacher.** „25 Tage ohne Überschuss“ ist ehrlich und datengetrieben. Er bleibt; die Einordnung „gestern ohne Überschuss … Peak- und Preisfahrweisen rechnet der Monatslauf anders“ gehört aber nicht in den Kopf, sondern als Fußnote.
4. **Perspektiven sauber getrennt.** `/ort` trennt Projektierer und Netzbetreiber mit Tabs, Badge als Schätzung. Nicht anfassen.

## Inhalt

1. **Start, Kapitel 02:** Unterzeile „Überschuss-Lademodell (×1–×10 skaliert nur Energie/Leistung)“ und zwei Klappen („Immer öfter?“, „Modellgrenzen und 30-Tage-Details“) wiederholen, was die Fußnote sagen kann. Kern ist: 28 % bei ×1, ×5 75 %, ×10 100 %, Balken.
2. **Monat:** Kopf-Fußnote „31 Tage mit Kennzahlen … nicht dasselbe wie vollständiger Speicher-Nutzen“ und „Vorberechneter Monatslauf (×1, hypothetisch)“ stehen vor der Kurve.
3. **Tag:** die drei Phasen (Nacht, Mittag, Abend) lesen die Kurve. Gut, bleibt.
4. **Methodik:** vollständig, mit Quelle, Einheit, Unsicherheit. Jede Fußnote verlinkt dorthin.

## Design

1. **Fehler `/tag` 1440 px:** Die Fußnote unter der Tageskurve („Unter 0,05 GWh Tages-Überschuss …“) klebt am linken Rand (x ≈ 18 px) statt an der Inhaltsspalte. Ursache: `.v4-footnote` setzt `margin` und `max-width` und überschreibt damit `.v4-content`. Sichtbar in `tag-1440-*-full.png`.
2. **Kopf-Leiste ohne Skala** (Start, 390 und 1440): 30 graue Balken, keine Zahl, kein Datum. Auf 390 px wirken die Null-Tage wie eine Grundlinie.
3. **Monat, Hauptkennzahl:** „62,16 GW (Senkung 2,24 GW, 3,5 % zur Referenzspitze 64,41 GW)“ als fette Monospace über vier Zeilen. Wert und Einordnung gehören getrennt: große Zahl, kleine Zeile.
4. **Dunkel und hell** sind konsistent. Kontraste aus dem letzten Lauf (Akzent `#c2410c` hell) halten.
5. **390 px Start:** vier Linkzeilen und eine Fußnote im ersten Bildschirm, bevor die Tageswerte kommen.

## Rechen-Korrektheit

1. Kernzahlen Start, Tag und Monat stimmen mit der Abnahme des Vorlaufs überein (8.11.: Verbrauch 1.275,1 GWh, Erzeugung 1.417,5 GWh, Wind+Sonne 184,9 GWh, Überschuss 0,0 GWh; 30 Tage 32,6 von 115,6 GWh, 28 % bei ×1).
2. **Risiko:** `formatPeakKpi` in `lib/nationalFleetCharts.ts` schreibt die Referenzspitze „64,41 GW“ als festen Text. Richtig für Oktober 2026, dem einzigen vorberechneten Monat. Sobald ein zweiter Monat kommt, muss der Wert aus den Statistiken kommen. In diesem Lauf nicht geändert (Rechenlogik tabu), nur markiert.
3. Kein Euro auf `/`, Euro nur als €/MWh-Börsenpreis auf `/tag` und ×1-Modellschätzung auf `/ort`.

## Performance und SEO

1. Lighthouse im Vorlauf: Performance 91–100, Barrierefreiheit 100, SEO 100. Kein akuter Handlungsbedarf.
2. Sitemap ist seit PR #77 vollständig.
3. Weniger sichtbarer Text oben verkürzt den Layout-Weg auf 390 px; keine neue Abhängigkeit.

## Benchmark: die ersten fünf Sekunden

| Angebot | Erste fünf Sekunden | Übernehmen |
| --- | --- | --- |
| Energy-Charts (Fraunhofer ISE) | Ein großes Diagramm, Achsen mit Einheit, Legende zum Abwählen. Fast kein Fließtext. | Jede Leiste mit Achse und Einheit. |
| Electricity Maps | Eine Zahl (gCO₂/kWh) und eine Karte, Quellen hinter einem Info-Symbol. | Kernwert groß, Herleitung nur auf Klick. |
| Our World in Data | Titel als Aussage, ein Diagramm, darunter eine Zeile „Source: …“ und Tabs Chart/Table. | Quellen und Anmerkungen als nummerierte Zeilen am Ende, nicht im Lesefluss. |
| Modo Energy (GB BESS Index) | Ein Indexwert mit Trendlinie, Zeitraum klar, Methodik verlinkt. | Zeitraum und Höchstwert direkt an der Leiste. |
| FT/NYT-Datengrafik | Aussage-Überschrift, ein annotiertes Diagramm, Fußnoten klein am Ende. | Fußnotenzeichen am Kernwert, Text am Seitenende. |

Gemeinsamer Nenner: **Aussage, Zahl, Grafik.** Methode und Quelle sind vollständig, aber am Ende und nummeriert.
