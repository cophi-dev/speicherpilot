# Plan — Premium-Lauf, 9. November 2026

Ableitung aus [`AUDIT.md`](AUDIT.md). Zehn Maßnahmen, Top 3 markiert. Alle Einsichten bleiben deterministisch aus vorhandenen öffentlichen Reihen (Energy-Charts, SMARD, MaStR/Battery Charts). Kein Sprachmodell zur Laufzeit, kein bezahlter Dienst, keine neue Formel.

| # | Maßnahme | Nutzen | Aufwand | Status |
| --- | --- | --- | --- | --- |
| **1** | **Start: Fußnotenapparat.** Formel, Daten, Modell, Netz, „Annahmen und Zeiträume“, Kopf-Einordnung, Kapitel-02-Unterzeile und beide Klappen wandern in nummerierte Anmerkungen am Seitenende. Oben bleiben Kernwerte mit Fußnotenzeichen und Graph. | hoch (alle drei Zielgruppen, Pflichtpunkt) | klein–mittel, nur Anordnung | **Top 1, umgesetzt** |
| **2** | **Kopf-Leiste mit Skala.** Höchstwert in GWh an der Leiste, erstes und letztes Datum darunter, Hilfslinie. Gleiche Daten, keine neue Rechnung. | hoch (Leiste wird ohne Hover lesbar) | klein | **Top 2, umgesetzt** |
| **3** | **Monat und Tag: Graph früher, Text als Fußnote.** Monats-Kopffußnote und „Vorberechneter Monatslauf“ unter die Kurve; Hauptkennzahl als große Zahl plus kleine Einordnungszeile; Fußnote auf `/tag` zurück in die Inhaltsspalte. | hoch für Netzplaner | klein | **Top 3, umgesetzt** |
| 4 | Referenzspitze in `formatPeakKpi` aus den Monatsstatistiken statt fest „64,41 GW“. | mittel, verhindert Fehler beim zweiten Monat | klein, aber Rechen-/Formatlogik | offen, eigener PR |
| 5 | Start ×2/×5/×10 als kleine Mehrfach-Leisten (Small Multiples) statt Umschalter. | mittel (Projektierer sehen alle Faktoren auf einen Blick) | mittel | offen |
| 6 | `/ort`: Anschlusskurve in den ersten Bildschirm. | mittel | mittel, Badge/Perspektiven nicht nebenbei | offen |
| 7 | Monats-Zeitreihe entflechten (Serien standardmäßig reduziert). | mittel für Laien | mittel | offen |
| 8 | Tagesphasen auf `/tag` als Annotation in der Kurve statt Liste. | mittel | mittel | offen |
| 9 | CSV-Download der Tageskennzahlen für Institute (statisch, aus vorhandenen Records). | mittel für Forschung | klein–mittel | offen |
| 10 | Glossar-Hinweise an Kennzahl-Labels (Restlast, SoC) statt Fließtext. | gering–mittel | klein | offen |

## Leitplanken

- Deutsch, einfache Sprache. Jede Formel und Annahme bleibt auf `/methodik` mit Quelle, Einheit und Unsicherheit; jede Fußnote verlinkt dorthin.
- Euro nur ×1 als Modellschätzung, nie skaliert. Auf `/` weiterhin kein Euro.
- Badge netzdienlich/neutral/belastend/nicht bewertet bleibt Schätzung; `/ort` unberührt.
- Kein Share-Button, kein OG-/X-Bild, kein Content-Generator.
- Modell unverändert: Round-Trip 85 %, SoC 10–90 %, Price Taker, nur Day-Ahead. Keine Datei unter `lib/` mit Rechenlogik geändert.

## In diesem Lauf umgesetzt

Maßnahmen 1, 2 und 3. Abnahme in [`abnahme.md`](abnahme.md).
