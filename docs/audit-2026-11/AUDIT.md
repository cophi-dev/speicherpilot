# Audit SpeicherPilot — 9. November 2026

Live-Stand: [https://www.speicherpilot.app](https://www.speicherpilot.app), Commit `8b00bc0` (Merge PR 76). Aufgenommen 19:13 UTC mit Chrome, ohne Codeänderung.

Viewports: 1440×900 und 390×844. Themen: hell und dunkel. Routen: `/`, `/tag` (landet auf `/tag/2026-11-08`), `/monat` (landet auf `/monat/2026-10`), `/ort`, `/methodik`, `/beitraege`.

Screenshots liegen in [`screens/`](screens/). Dateiname: `{route}-{breite}-{theme}-fold.png`, dazu Vollseiten für Start und Monat.

Der Block, den Phillipp im Anhang zeigt, ist Kapitel 01 auf der Startseite. Die Annahmen sind im Live-Stand zugeklappt (`details` ohne `open`). Formelzeile, Datenzeile und Modellzeile stehen trotzdem zwischen Überschrift und Graph. Aufgeklappt wird der Block zur Textwand, genau wie im Anhang.

## Kurzbefund

Der rote Faden stimmt: 30 Tage, ein Tag, ein Monat mit ×1/×2/×5/×10, dann der Anschluss, die Methodik zum Nachrechnen. Der erste Bildschirm der Startseite (große 25, Balken der Überschusstage) ist das starke Stück und soll bleiben.

Darunter verliert die Seite den Faden. Eine zweite Riesenzeile („Unter 0,05 GWh Tages-Überschuss.“), die Formel, die Quellenzeile und die Modellzeile schieben den echten Tagesgraphen nach unten. Das 30-Tage-Modell zeigt 28 % als Zahl, den Verlauf aber als Schema ohne Achse — und lässt die 25 Tage ohne Überschuss weg. Damit widerspricht die Grafik der Überschrift.

Rechnung und Quellen halten. Euro auf der Startseite gibt es in diesem Block nicht. Die Methodik trägt Round-Trip 85 %, SoC 10–90 %, Price Taker, nur Day-Ahead.

## Zielgruppen und ihre Aufgaben

| Wer | Aufgabe auf der Seite | Sitzt heute | Lücke |
| --- | --- | --- | --- |
| Speicherprojektierer | Tag und Monat lesen: wann wäre geladen worden, was bringen ×2/×5/×10 an Energie, nicht an erfundenen Euro | Monatslauf mit echten Viertelstunden; Ort mit Größe und Modellschätzung | Auf der Startseite sieht man den Ausbau nur als Prozent und als Schema |
| Netzplaner, städtischer Verteilnetzbetreiber | Residuallast und Abendspitze sehen; Netzwirkung am Ort als Schätzung, nicht als Befund | Tagesgraph mit 58,5 GW; Ort trennt Projektierer und Netzbetreiber; Badge bleibt Schätzung | Die Spitze steht unter Text. Nationales Modell und lokaler Anschluss sind zwei Türen, der Sprung erklärt sich erst nach dem Scrollen |
| Forschungsinstitut | Formel, Quelle, Einheit, Unsicherheit nachschlagen und die Zahl daneben prüfen | `/methodik` ist dafür gebaut und im ersten Blick klar | Dieselbe Formel steht noch einmal im Lesefluss von Start und Tag |

## Befunde, nach Wirkung

### 1. Konzept und Story

1. **Zwei Anfänge auf einer Seite.** Oben die 30-Tage-Zahl, direkt darunter eine zweite Display-Zeile zum einzelnen Tag. Der Leser weiß nicht, welche Zahl die Seite trägt. Die 25 ist die richtige, weil sie den Zeitraum erzählt. Die zweite Zeile wiederholt nur die Kennzahl 0,0 GWh.
2. **Der Graph ist die Belegstelle und kommt zu spät.** Energy-Charts, Our World in Data und die Financial-Times-Grafik setzen die Kurve in die ersten Sekunden. Auf 1440×900 endet der erste Start-Bildschirm an der Kapitelüberschrift. Der Tagesgraph (Verbrauch, Wind+Sonne, 58,5 GW) liegt darunter.
3. **Das Ausbau-Bild widerspricht der Überschrift.** „25 ohne Überschuss“ und dann ein Streifen, der nur die wenigen Überschusstage zeigt, in der Breite nach ihrer Energiemenge. Die Dürre, die die Seite behauptet, ist in der Grafik nicht zu sehen.
4. **Der Bogen selbst ist richtig.** Start → Tag → Monat → Ort, zwei Türen (Projekt, Netz), Methodik als Nachschlagewerk, Beiträge zum Lesen. Das nicht umbauen.

### 2. Inhalt

1. **Pflichtbefund Start, Kapitel 01.** Sichtbar vor dem Graphen: Formel `Σ max(0, Wind+Sonne−Last)×¼h`, „Zuletzt: So, 25.10. war Strom übrig.“, `Daten: So, 08.11.2026 · Quelle: Energy-Charts · Abrufstand: 19:56`, `Modell Referenzflotte 4,64 GW / 8,14 GWh · Geladen 0,0 GWh · Abgegeben 0,0 GWh`, dazu der zugeklappte Block „Annahmen und Zeiträume“. Das gehört unter den Graphen, in 13 px, nicht in den Lesefluss. Die Formel bleibt vollständig und verlinkt auf `/methodik`.
2. **Hero-Satz ist ein Methodenabsatz.** „Peak- und Preisfahrweisen rechnen im Modellflotte-Monatslauf anders.“ steht in der Unterzeile der 25. Der stärkste Tag (61,1 GWh am 24.10.) ist die Unterzeile. Der Hinweis auf die anderen Fahrweisen ist eine Fußnote.
3. **Monatskopf wiederholt die Grenze, bevor die Kurve kommt.** Drei Sätze, davon einer nur zur Abgrenzung der Kennzahl. Die Kurve selbst (Restlast, Laden, Entladen, SoC) ist echt und gut — sie beginnt knapp unter 900 px Höhe.
4. **Tag wiederholt die Formel über dem Graphen**, in derselben Display-Größe. Der Hero des Tags (14,5 %, Platz 1 von 31) ist schon die Aussage.
5. **Ort ist ruhig und trennt die Perspektiven.** Erster Satz Projektierer: „Ein Schnellladepark will mehr Leistung, als sein Anschluss hergibt.“ Netz ist ein eigener Tab. Kein Euro in der Netzsicht im ersten Blick. Der Simulator beginnt am unteren Rand; das ist der nächste, nicht dieser Schnitt.
6. **Methodik und Beiträge tragen.** Methodik öffnet mit „Jede Zahl lässt sich hier nachrechnen“ und den Annahmen (85 %, 10–90 %, Day-Ahead). Beiträge zeigen eine echte Day-Ahead-Kurve, keinen Generator, keinen Share-Button.

### 3. Design

1. **Drei Zahlengrößen übereinander** (Riesenzahl, `v4-tag-kern` bis 6 rem, dann die KPI-Zeile). Eine Display-Zahl pro Bildschirm reicht. Die zweite ist der Grund, warum der Graph auf dem Foto von Phillipp kaum noch ins Bild passt.
2. **Schema statt Achse.** Der 30-Tage-Streifen hat keine Einheit, keine Nulllinie, Beschriftung nur ab 9 GWh per Tooltip. Der Monat darunter hat Achsen, Legende, Viertelstunden. Die Startseite sollte dieselbe Sprache sprechen.
3. **390 px: die 30-Tage-Balken rutschen unter die Links** und werden auf 64 px Höhe abgeschnitten. Die Geschichte der 25 ist auf dem Telefon ein fast leerer Strich.
4. **Hell und dunkel tragen beide.** Warmes Orange für die eine Zahl, Aqua fürs Modell, Haarlinien statt Karten. Das nicht aufhellen und nicht in ein Dashboard mit 20 Serien verwandeln.
5. **Der Tagesgraph ist schon journalistisch:** Fläche Wind+Sonne, Linie Verbrauch, eine Annotation (58,5 GW). Den schützen, nur nach oben holen.

### 4. Rechen-Korrektheit

Stichprobe aus dem Live-HTML, nicht neu gerechnet. Werte in [`kernzahlen-vorher.json`](kernzahlen-vorher.json).

- 8.11.2026: Verbrauch 1.275,1 GWh, Erzeugung 1.417,5 GWh, Wind+Sonne 184,9 GWh, Überschuss 0,0 GWh. Erzeugung minus Last wäre positiv; die Überschuss-Kennzahl ist nur die positiven Viertelstunden von Wind+Sonne gegen die Last. 0,0 ist damit plausibel, kein Vertauschen der Bilanz.
- Modell ×1 an dem Tag: 4,64 GW / 8,14 GWh, geladen 0,0, abgegeben 0,0. Passend zu einem Tag ohne Überschuss im Überschuss-Lademodell. Kein Euro.
- 30 Tage, Überschuss-Laden: 28 % bei ×1, 75 % bei ×5, 100 % bei ×10; 32,6 von 115,6 GWh. ×10 sättigt, ×2 liegt dazwischen. Kein lineares Euro.
- 24.10.2026: 61,1 GWh Tages-Überschuss, integriert 61,10 GWh in 51 Viertelstunden, Netz-Ladung/Abgabe 11,37 / 10,22 GWh, Restlast 17,84 GW, Senkung 0,00 GW.
- 25.10.2026: 9,6 GWh in der Zeile, 9,64 GWh in 31 Viertelstunden, Ladung/Abgabe 9,01 / 2,51 GWh, Restlast 8,27 GW.
- Oktober 2026, ×1, „Differenz aufnehmen“: Restlastspitze 62,16 GW, Senkung 2,24 GW (3,5 % gegen 64,41 GW), Ladung 55,90 GWh, Abgabe 47,52 GWh. Abgabe liegt unter Ladung × 0,85, wie die Kette mit Wirkungsgrad und Rest-SoC erwarten lässt.
- Badge auf Ort bleibt eine Schätzung. Diesen Lauf nicht anfassen.
- Kein Tesla-Name, kein Share, kein OG-Bild, keine Laufzeit-KI auf diesen Seiten.

Nicht geprüft in diesem Audit: jede Viertelstunde gegen die Energy-Charts-API neu summieren. Die bestehenden Tests (`overviewChecksum`, Flottenkette) bleiben die Rechenreferenz. Dieser Lauf ändert keine Formel.

### 5. Performance und SEO

- Die sechs Routen antworten, Herkunfts-SHA im HTML ist `8b00bc0`. PR 76 hat Tag und Monat schon verschlankt. Ein weiterer Schnitt in den Datenweg ist hier nicht der Hebel.
- Die Sitemap nennt `/`, `/tag`, `/monat`, `/methodik`, dazu ältere Routen (`/live`, `/site`, `/blog`). `/ort` und `/beitraege` fehlen, obwohl sie in der Navigation stehen. `/impressum` und `/datenschutz` fehlen ebenfalls.
- Titel und Beschreibung sind auf Deutsch gesetzt. `lang="de"` steht am Dokument.

## Benchmark, erste 5 Sekunden

Aufgenommen 1440×900, außer Electricity Maps (Zugriff vom Headless-Browser blockiert; Einordnung nach dem öffentlichen Produkt, nicht nach einem Screenshot).

| Seite | Was in den ersten 5 Sekunden steht | Was wir übernehmen | Was wir nicht kopieren |
| --- | --- | --- | --- |
| Energy-Charts | Die Wochenkurve füllt das Fenster. Achse in MW, Legende, Quelle in der Fußzeile. Kaum Sätze. | Graph zuerst, Quelle klein darunter, eine Einheit an der Achse | Die volle Erzeugungsmischung und die rechte Schalttafel. Das ist ein Werkzeug, keine Geschichte |
| Our World in Data | Titel ist der Befund („Electricity generation by source“), direkt darunter die Fläche mit Achse und Länderliste | Titel = Befund, Achse, eine Serie, die man ohne Tooltip lesen kann | Jahres-Fläche seit 1990 und den Konfigurator. Zu weit für einen Tagesentscheid |
| SMARD | Zuerst Navigation und „Energiemarkt aktuell“, die Kurve kommt nach dem Portalrahmen | Amtliche Quelle benennen, deutsch, nüchtern | Den Behördenrahmen. SpeicherPilot ist kein zweites SMARD |
| Modo Energy, öffentliche Startseite | Produktversprechen und Demo-Button, keine Batteriekurve. Cookie-Leiste | Aus den veröffentlichten Index-Grafiken: eine Linie, ein Satz, Annahmen als Notiz. Euro nur, wo es eine Schätzung für die heutige Flotte ist | Landingpage, „Try for free“, Investoren-Ton |
| Electricity Maps | Öffentliche Ansicht: eine Karte, eine große Zahl (CO₂-Intensität), die Erklärung hinter einem Hinweis | Eine Zahl, eine Grafik, Methode einen Klick entfernt | Die Weltkarte. Unser Raum ist Deutschland, Tag und Anschluss |

Financial-Times- und New-York-Times-Grafiken machen dasselbe in der Zeitung: eine Annotation auf der Kurve (bei uns schon die 58,5 GW), Quelle unter der Figur, keine Formel im Fließtext. Die Formel lebt im Methodenblatt. Das ist `/methodik`.

## Was bleibt

Hero mit der 25, Rang der Tage, Tagesgraph mit Annotation, Monatskurve, Faktor ×1/×2/×5/×10, Ort mit zwei Perspektiven, Methodik mit jeder Annahme, Beiträge ohne Generator. Rechenkern, Round-Trip, SoC-Fenster, Price Taker, Day-Ahead, Euro nur als Modellschätzung bei ×1.
