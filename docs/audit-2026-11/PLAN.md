# Plan — 9. November 2026

Ableitung aus [`AUDIT.md`](AUDIT.md). Höchstens zehn Maßnahmen. Einsichten bleiben deterministisch: vorhandene Tagesreihen und Kennzahlen, keine neue Formel, kein Modell zur Laufzeit, kein kostenpflichtiger Dienst.

Nutzen: was eine der drei Zielgruppen im ersten Blick versteht. Aufwand: wie viel Oberfläche sich bewegt, ohne den Rechenkern.

## Top 3

### 1. Start und Tag: Kernwerte und Graph, der Rest als Fußnote

**Nutzen: hoch.** Projektierer und Netzplaner sehen Verbrauch, Erzeugung, Überschuss und die Kurve, bevor sie eine Formel lesen. Die Formel, die Quellenzeile, die Modellzeile (Referenzflotte, geladen, abgegeben) und „Annahmen und Zeiträume“ bleiben im Dokument, unter dem Graphen, 13 px, mit Link auf `/methodik`. Dieselbe Regel auf `/tag`: die Display-Zeile und `Σ max(0, …)` rutschen unter die Kurve. Die drei Tagesphasen (Nacht, Mittag, Abend) bleiben, sie lesen die Kurve.

**Aufwand: klein.** Reihenfolge und Schriftgröße. Keine neue Zahl.

### 2. 30-Tage-Modell als Balkendiagramm mit Achse

**Nutzen: hoch.** Die Frage „was brächte ×2, ×5, ×10“ wird ein Bild: jeder Tag ein Balken in GWh, auch die Tage mit null. Der farbige Teil ist die Modell-Ladung des gewählten Faktors, aus `dayRows`, die der bestehende Lauf schon liefert. Die 25 leeren Tage und der 24.10. stehen in derselben Grafik. Prozentzahl und „32,6 von 115,6 GWh“ bleiben.

**Aufwand: mittel.** Eine SVG-Figur und Legende. Kein neuer Dispatch, kein Euro, keine freie MW-Eingabe.

### 3. Einordnung aus der Heldenzeile in die Fußnote, Balken auf 390 px nach oben

**Nutzen: hoch für den ersten Bildschirm.** Unter der 25 bleibt der stärkste Tag (61,1 GWh). Der Satz zu Peak- und Preisfahrweise wird Fußnote. Auf dem Telefon stehen die 30-Tage-Balken direkt unter der Zahl, die Links darunter, die Balken höher als 64 px. Im Monat bleibt der stärkste Tag in der Unterzeile; der Satz „nicht dasselbe wie vollständiger Speicher-Nutzen“ wird Fußnote, damit die Viertelstundenkurve früher beginnt.

**Aufwand: klein.** Texte, die es schon gibt, und die Reihenfolge im Hero.

## Weitere Maßnahmen

### 4. Sitemap um die Navigationsziele ergänzen — mit umgesetzt

**Nutzen: mittel für Suche.** `/ort`, `/beitraege`, `/impressum`, `/datenschutz` fehlen, obwohl die Seiten existieren.

**Aufwand: klein.** Eine Liste. Ältere Routen bleiben drin.

### 5. Monats-KPIs noch dichter, Kurve im ersten 900-px-Fenster

**Nutzen: mittel.** Die Kurve ist echt, sie beginnt heute knapp unter dem Falz.

**Aufwand: mittel, nicht in diesem Lauf.** Die drei Kennzahlen (Spitze, Ladung, Abgabe) sind der Satz zum Chart. Sie bleiben darüber. Nur die Textfußnote aus Maßnahme 3 rückt die Kurve ein Stück.

### 6. Ort: Anschlusskurve in den ersten Bildschirm

**Nutzen: mittel für Projektierer und Netzplaner.** Heute steht der Befund, die Kurve beginnt am unteren Rand.

**Aufwand: größer.** Eigene Layoutfrage, Badge und Perspektiven nicht nebenbei anfassen.

### 7. Monats-Zeitreihe entflechten

**Nutzen: mittel.** Viele Linien in einem Fenster sind für Institute vollständig und für alle anderen dicht.

**Aufwand: größer, nicht in diesem Lauf.** Serien auszublenden hieße, Belege zu verstecken. Die Legende bleibt.

### 8. Zweiter Datenweg oder Cache für Energy-Charts

**Nutzen: mittel für die Ladezeit.** PR 76 hat den großen Schnitt schon gemacht.

**Aufwand: hoch und tabu für diesen Lauf.** Rechenlogik und Abruf bleiben.

### 9. Beiträge-Index straffen

**Nutzen: gering.** Die Seite ist schon ein Leseraum mit einer echten Preiskurve.

**Aufwand: klein, kein Bedarf.**

### 10. Freie Flottengröße neben ×1/×2/×5/×10

**Nutzen: für Projektierer verlockend, fachlich falsch in dieser Ansicht.** Eine freie MW-Zahl würde die beobachtete Flotte und das skalierte Modell vermischen.

**Aufwand: nicht vorgesehen.** Faktoren bleiben diskret. Begründung steht auf `/methodik`.

## Leitplanken für die Umsetzung

- Deutsch, kurze Sätze. Jede Formel, die die Fußnote nennt, steht weiter auf `/methodik` mit Quelle, Einheit und Unsicherheit.
- Keine Euro-Skalierung mit dem Faktor. Im 30-Tage-Chart nur GWh.
- Badge netzdienlich / neutral / belastend / nicht bewertet bleibt Schätzung. Ort-Logik nicht anfassen.
- Perspektiven auf `/ort` bleiben getrennt.
- Kein Share-Button, kein OG- oder X-Bild, kein Textgenerator, kein bezahlter Dienst, kein Laufzeit-Sprachmodell.
- Modell unverändert: Round-Trip 85 %, SoC 10–90 %, Price Taker, nur Day-Ahead.

## In diesem Lauf umgesetzt

Maßnahmen 1, 2, 3 und 4. Abnahme in [`abnahme.md`](abnahme.md).
