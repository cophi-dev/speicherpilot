# Konzept-Audit SpeicherPilot — 9. November 2026

Live: [https://www.speicherpilot.app](https://www.speicherpilot.app). Gelesen am Abend des 9. November 2026 (Europe/Berlin). Repo-Stand der Live-Seite: `dfb2f88` (Startseite mit Kernwerten und 30-Tage-Balken, PR 77). Audit 1 in [`../AUDIT.md`](../AUDIT.md) hat die Optik bewertet. Dieser Text bewertet die Story.

Messlatte ist Phillipps Auftrag vom selben Tag: eine Seite, die Projektierer, einen städtischen Netzplaner und ein Institut benutzen wollen, weil Tag, Monat und Markt zusammenkommen. Insights sind regelbasierte Sätze aus öffentlichen Zahlen. Änderungen an der bestehenden Seite bleiben vorsichtig. Der Rechenkern bleibt: Round-Trip 85 % (Spanne 80–90), Ladezustand 10–90 %, Preisnehmer, nur Day-Ahead. Euro nur bei ×1 und nur als Modellschätzung.

## Drei Befunde

1. **Im Herbst erzählt die Seite die Leere.** Vom 10. Oktober bis zum 8. November haben 25 von 30 Tagen unter 0,05 GWh Wind-Solar-Überschuss. Die Startseite macht daraus die große 25. Der November-Monat sagt denselben Befund und setzt dazu den Satz, das sei kein Urteil „null Speichernutzen“. Die Zahl, die den Nutzen trotzdem tragen würde, steht auf dieser Seite nicht.

2. **Die Day-Ahead-Spanne ist in diesen 25 trockenen Tagen nicht zusammengefallen.** Sie liegt zwischen 82,78 und 344,58 €/MWh (1. November und 29. Oktober). Die 71,62 €/MWh vom 25. Oktober gehören zu einem Überschusstag (9,6 GWh) und zählen hier nicht. Der weiteste Tag, der 29. Oktober, hat 0,0 GWh Überschuss und in der Viertelstunde 17:15 einen Preis von 574,28 €/MWh. Das Stundenmittel 17–18 Uhr liegt bei 559,63 €/MWh. Auf der Startseite ist dieser Tag einer von 25 grauen Strichen. Auf `/tag` steht der Preis als Spanne in der Ecke, die Kurve zeigt ihn nicht.

3. **Eine Voltplot-Karte bis zur Mittelspannung ist für Deutschland nicht belegt. Grobe Karten der Übertragungsnetzbetreiber sind es.** Art. 50 Abs. 4a der Verordnung (EU) 2019/943, geändert durch die Verordnung (EU) 2024/1747, verpflichtet die Übertragungsnetzbetreiber unmittelbar, verfügbare Anschlusskapazität mindestens monatlich zu veröffentlichen. TransnetBW tut das in MW-Klassen je 380-kV-Umspannwerk (Stand 05/2026), 50Hertz mit Karte und Liste (Stand 31.03.2026); in dieser Regelzone liegt Hamburg. Eine einheitliche, offene, maschinenlesbare Reihe bis zur Mittelspannung gibt es damit nicht. `/ort` rechnet Beispiele und verlinkt diese Karten nicht.

## Auftrag, Punkt für Punkt

Status gilt für die Live-Seite am 9. November 2026, nicht für diesen Text. `erfüllt` hieße: die Seite tut es heute, mit Zahl und Figur. `teilweise` heißt: ein Stück steht, der Auftrag ist offen. `fehlt` heißt: die Fläche ist nicht da.

### 1. Alle Sachen zusammenbringen — teilweise

Der eine Ort wäre eine Lesart, in der Markt, System, Flotte und Anschluss denselben Tag meinen. Heute sind es vier Flächen.

| Schicht | Wo sie vorkommt | Wo sie fehlt |
| --- | --- | --- |
| Markt: Preis, Spanne, Stunden unter null | `/tag` zeigt am 8. November die gerundete Spanne 206–322 €/MWh als Nebenzeile. Die Kennzahl dafür liegt in den Tagesreihen (Minimum, Maximum, Spanne, Stunden unter null). | Startseite: kein Preis. Keine Preiskurve. Keine Marktseite. November verweist auf den Oktober, ohne die Börse zu zeichnen. |
| System: Last, Wind und Sonne, Restlast, Überschuss | Start und Tag: Verbrauch, Wind+Sonne, Überschuss, Abendspitze 58,5 GW. Monat Oktober: Restlastkurve. | Die 58,5 GW sind Deutschland. Hamburg ist darin nicht getrennt. |
| Speicherflotte | Start: 4,64 GW / 8,14 GWh, Modell-Ladung 0,0 an dem Tag, 32,6 von 115,6 GWh in 30 Tagen. Tag: dieselbe Größe, „nichts zu laden“. Oktober: andere Referenz, 4,58 GW / 8 GWh, drei Fahrweisen. | Die zwei Flottenstände stehen nicht nebeneinander. Die November-Flotte wird nicht gerechnet. |
| Netz und Anschluss | `/ort`: zwei Perspektiven, Beispiel, Badge als Schätzung. Start sagt „Lokale Netzwirkung: nicht bewertet“. | Kein Sprung von der Abendspitze zum Anschluss. Die ÜNB-Klassenkarten sind nicht verlinkt. |

Man kann die vier Schichten an einem Abend zusammensuchen. Die Seite führt sie nicht als einen Satz.

### 2. Insights vom Tag, vom Monat, vom Markt — teilweise

Phillipp sagt AI-Insights. Die Grenze bleibt: keine Laufzeit-KI. Ein Insight ist ein Satz, den eine feste Regel aus öffentlichen Zahlen schreibt, mit Schwelle und Beispiel. Die Seite hat eine solche Regel schon, die Auffälligkeit: ein Wert unter den drei extremsten von 31 Tagen gewinnt die Überschrift. Am 8. November gewinnt der Windanteil (14,5 %). Die folgenden Sätze kann dieselbe Datenlage tragen. Auf der Seite stehen sie so nicht.

Schwellen, die unten vorkommen: Überschuss unter 0,05 GWh, Spanne ab 80 €/MWh, Minimum ab 100 €/MWh, Preis ab 400 €/MWh, Stunden unter null ab einer Viertelstunde (0,25 h), Flottenleistung unter 15 % der Abendspitze, sieben Tage in Folge mit Minimum ab 150 €/MWh.

1. **Trockenstrecke, Tag.** Regel: Überschuss unter 0,05 GWh, und das mindestens drei Tage hintereinander. Beispiel: „Sonntag, der 8. November, ist der 14. Tag in Folge ohne Überschuss.“ Die Seite sagt das. Sie sagt nicht, was der Tag sonst noch war.
2. **Hohes Minimum, Tag.** Regel: Überschuss unter 0,05 GWh, Spanne mindestens 80 €/MWh, Minimum mindestens 100 €/MWh, keine Viertelstunde unter null. Beispiel: „Am 8. November lag die Börse zwischen 206,09 und 321,50 €/MWh. Die Spanne ist 115,41 €/MWh, das Minimum bleibt über 200. Ein Ladefenster unter 200 €/MWh gab es nicht.“
3. **Preis-Spike auf leerem Tag.** Regel: Überschuss unter 0,05 GWh und Maximum mindestens 400 €/MWh. Beispiel: „Am 29. Oktober war der Überschuss 0,0 GWh. In der Viertelstunde 17:15 stand der Day-Ahead-Preis bei 574,28 €/MWh, fünf Viertelstunden lagen über 500. Das Stundenmittel 17–18 Uhr lag bei 559,63 €/MWh.“
4. **Negativpreis, Markt im Fenster.** Regel: Stunden unter null, gezählt als Viertelstunden mal 0,25, Schwelle 0,25 h. Beispiel: „Vom 10. Oktober bis zum 8. November lag der Preis 1,75 Stunden unter null, nur am 10. Oktober (0,25 h, Überschuss 15,0 GWh) und am 25. Oktober (1,5 h, Überschuss 9,6 GWh).“
5. **Gleiche Spanne, anderes Niveau.** Regel: zwei Tage, Spannen unterscheiden sich um höchstens 20 €/MWh, die Minima um mindestens 100 €/MWh. Beispiel: „Der 24. Oktober und der 8. November haben fast dieselbe Spanne, 111,31 und 115,41 €/MWh. Am 24. lag das Minimum bei 0,00, am 8. bei 206,09.“
6. **Flotte gegen Abendspitze, Tag.** Regel: Überschuss unter 0,05 GWh, Modell-Ladung 0, Flottenleistung unter 15 % der Abendspitze. Beispiel: „Am 8. November mussten andere Quellen um 17:15 Uhr 58,5 GW decken. Die Flotte hat 4,64 GW Leistung, das sind 7,9 % dieser Spitze. Im Überschuss-Modell war nichts geladen.“
7. **Preisniveau-Regime, Monat.** Regel: mindestens sieben Tage in Folge mit Tagesminimum ab 150 €/MWh. Beispiel: „Vom 28. Oktober bis zum 8. November, zwölf Tage, lag jedes Tagesminimum über 169 €/MWh.“
8. **Drei Ziele, ein Monat.** Regel: dieselbe Flotte ×1, drei Fahrweisen; der Satz erscheint, wenn die Marktfahrweise mehr als fünfmal so viel lädt wie die Spitzenfahrweise und die Spitze um weniger als 1 GW senkt. Beispiel: „Im Oktober bewegt die Marktfahrweise ×1 485,45 GWh und senkt die Spitze um 0,37 GW. Die Spitzenfahrweise senkt um 3,55 GW und bewegt 12,49 GWh. Die Überschuss-Fahrweise liegt dazwischen: 55,90 GWh und 2,24 GW.“
9. **Sättigung, Ausbau.** Regel: ×10 nimmt mindestens 99 % des Überschuss-Pools auf, ×1 nimmt unter 40 % auf. Beispiel: „In den 30 Tagen bis zum 8. November nimmt ×1 28 % des Überschusses auf, ×10 nimmt 100 %. Der zusätzliche Speicher sättigt diesen Pool. Er erzeugt keinen neuen Überschuss.“

### 3. Was mehr Speicher bringen würde — teilweise

Gerechnet wird das, auf `/monat/2026-10`, in GWh und GW, für ×1, ×2, ×5 und ×10 und für drei Fahrweisen. Die Startseite zeigt davon nur die Überschuss-Aufnahme (28 % / 75 % / 100 %). Der November hat die Rechnung nicht. Euro für die nationale Flotte stehen auch bei ×1 nicht auf diesen Seiten. Das ist die richtige Enthaltsamkeit beim Skalieren und eine Lücke bei der einen erlaubten Modellschätzung.

Dieselben Live-Zahlen, Oktober, Referenzspitze 64,41 GW, Flotte im Lauf 4,58 GW / 8 GWh:

| Fahrweise | ×1 | ×10 | Was der Faktor tut |
| --- | --- | --- | --- |
| Differenz aufnehmen | Ladung 55,90 GWh, Spitze −2,24 GW | Ladung 134,24 GWh, Spitze −7,91 GW (12,3 %) | Der Überschuss-Pool ist bei ×10 aufgebraucht. Die Spitze sinkt, und sie sinkt nicht auf das Zehnfache von 2,24 GW. |
| Spitze senken | Ladung 12,49 GWh, Spitze −3,55 GW | Ladung 492,80 GWh, Spitze −14,63 GW (22,7 %) | Mehr Leistung senkt die Spitze weiter. Der Zuwachs ist unterlinear: das Zehnfache von 3,55 GW wäre 35,5 GW. |
| Marktorientiert, Day-Ahead, Preisnehmer | Ladung 485,45 GWh, Spitze −0,37 GW | Ladung 4.854,54 GWh, Spitze 96,76 GW, das sind 32,35 GW über der Referenz | Die Energie wächst mit dem Faktor. Die Spitzenwirkung kippt. Bei ×5 steht die Spitze schon bei 73,86 GW, 9,45 GW über der Referenz. |

Das ist die Kannibalisierung, die der Preisnehmer nicht verhindert: die Preise bleiben dieselben, die große Flotte lädt in den relativ günstigsten Viertelstunden und wird damit selbst zur Lastspitze. Die neue Spitze bei ×10 liegt am 21. Oktober um 14:00 Uhr: beobachtete Restlast 50,96 GW plus 45,8 GW Ladeleistung (zehnmal 4,58 GW) ergeben 96,76 GW. Der Preis in dieser Viertelstunde war 201,29 €/MWh, relativ günstig an diesem Tag und kein niedriger Preis im absoluten Sinn. Ein Euro-Betrag, der mit ×5 oder ×10 mitwächst, würde das Gegenteil behaupten. Die Ladung 485,45 GWh der Marktfahrweise ×1 ist eine optimale Lösung, nicht die einzige: dieselbe Zielfunktion lässt auch etwa 496 GWh zu, die Spitze ändert sich dabei nicht. Die Seite zeigt die GW-Zahl, wenn man Faktor und Fahrweise umschaltet. Sie setzt die drei Zeilen nicht in ein Bild, und sie rechnet den November nicht.

### 4. LinkedIn-Wirkung — teilweise

Der eine Screen, den man weiterreichen würde, ist der erste Blick der Startseite: die 25 und die Balken, in denen 25 Tage als Lücke stehen. Das Bild ist schon ein Poster. Es sagt „nichts zu laden“. Ein Speicherplaner, ein Hamburger Netzplaner und jemand vom Fraunhofer-Institut leiten es weiter, wenn in demselben Rahmen der zweite Satz steht: der 29. Oktober, Überschuss 0,0 GWh, Viertelstunde 17:15 mit 574,28 €/MWh (Stundenmittel 17–18 Uhr: 559,63), und die Flotte von 4,64 GW gegen eine Abendspitze von 58,5 GW.

Diesen Rahmen bauen wir nicht als Share-Button und nicht als OG-Bild. Der erste Viewport ist die Weitergabe. Heute fehlt ihm der Preis.

### 5. Analytische Graphen, wenig Text — teilweise

Auf der Startseite ist der Schnitt aus Audit 1 da: die 25, der Tagesgraph mit der Annotation 58,5 GW, die 30-Tage-Balken mit Achse, Formel und Modell unter dem Graphen. Das bleibt.

Offen, auf den anderen Flächen und in der Saison:

- Die Balken auf `/tag` zeigen die Kennzahl, die den Tag gewonnen hat. Am 8. November ist das der Windanteil, nicht der Preis. Die 96 Börsenviertelstunden sind keine Linie.
- `/monat/2026-10` hat die echte Viertelstundenkurve. Sie beginnt nach den Sätzen zur Modellgrenze. `/monat/2026-11` hat keine Balken, weil jeder geladene Tag unter 0,05 GWh liegt. Der Satz daneben sagt, das sei kein Urteil „null Speichernutzen“, und lässt die Fläche leer.
- `/ort` erklärt den Beispielanschluss in Sätzen, bevor die Kurve der Auslastung den Befund trägt.

Wenig Text heißt: die Fußnote behält Quelle, Formel und Unsicherheit. Die Figur behält den Satz.

### 6. Ort und Netz, Voltplot als Vorbild — teilweise

[Voltplot Grid](https://www.voltplot.com/grid), gelesen am 9. November 2026, zeigt österreichische Umspannwerke und freie Einspeisekapazität. Die Seite selbst nennt die Pflicht: Betreiber veröffentlichen zulässige, verfügbare und gebuchte Kapazität, Speicher eingeschlossen, Aktualisierung vierteljährlich (§ 99 ElWG). Auf die veröffentlichte Zahl besteht kein Anschlussanspruch. Das ist das Vorbild für die Frage bis zur Mittelspannung. Es ist keine deutsche Datenquelle.

Für Deutschland, Primärquellen vom selben Tag:

- Art. 50 Abs. 4a der Verordnung (EU) 2019/943, eingefügt durch die Verordnung (EU) 2024/1747, gilt unmittelbar. Übertragungsnetzbetreiber veröffentlichen die für neue Anschlüsse verfügbare Kapazität mit hoher räumlicher Auflösung, mindestens monatlich, einschließlich beantragter Kapazität und flexibler Anschlüsse.
- [TransnetBW, Netzanschlusskarte](https://www.transnetbw.de/de/transparenz/netzzugang-und-entgelt/netzanschlusskarte), Stand 05/2026: je 380-kV-Umspannwerk verfügbare Einspeise- und Lastkapazität in Klassen, unter 500 MW, 500 bis 1.000 MW und darüber.
- [50Hertz, Netzanschluss](https://www.50hertz.com/de/Vertragspartner/Netzkunden/Netzanschluss), Einschätzung vom 31.03.2026: Karte und Liste der Rückspeise- und Lastkapazität und der Schaltfeldverfügbarkeit. Hamburg liegt in dieser Regelzone. Ob ein automatischer Download erlaubt ist, ist an den Nutzungsbedingungen noch offen.
- [§ 14d Abs. 4 Nr. 1 EnWG](https://www.gesetze-im-internet.de/enwg_2005/__14d.html) und [§ 14e EnWG](https://www.gesetze-im-internet.de/enwg_2005/__14e.html), Abruf 9.11.2026: die gemeinsame Plattform der Verteilnetzbetreiber stellt Netzkarten des Hoch- und Mittelspannungsnetzes mit Engpassregionen aus dem Netzausbauplan bereit. Das sind Regionen, keine Kapazitätswerte in MW.
- [§ 17 EnWG](https://www.gesetze-im-internet.de/enwg_2005/__17.html), Abruf 9.11.2026: Anschlussanspruch, Ablehnung bei Kapazitätsmangel mit Begründung, auf Verlangen die Ausbaumaßnahmen und Kosten. Flexible Anschlussvereinbarung in Absatz 2b. Keine Karte freier Kapazität.
- [§ 17c EnWG](https://www.gesetze-im-internet.de/enwg_2005/__17c.html), Abruf 9.11.2026: der Paragraf steht als „weggefallen“.
- [§ 23c EnWG](https://www.gesetze-im-internet.de/enwg_2005/__23c.html), Abruf 9.11.2026: jährliche Strukturdaten, Leitungslängen, installierte Umspannleistung, entnommene Arbeit, Zahl der Anschlüsse, die länger als drei oder sechs Monate offen waren. Keine freie Restkapazität je Standort.
- Stiftung Umweltenergierecht, Folien vom 17. Juni 2026 zum Referentenentwurf des Netzpakets (Stand der Übersicht: Referentenentwurf 17. April 2026, noch ohne Bundestagsbeschluss und ohne Bundesgesetzblatt): ein geplanter § 17c würde monatliche Karten der freien Kapazität auf den Umspannebenen Höchstspannung/Hochspannung und Hochspannung/Mittelspannung verlangen, plus ab 1. Januar 2028 eine unverbindliche Auskunft ab 135 kW. Der Entwurf nennt Art. 50 Abs. 4a als das, was er spiegeln soll. Er ist nicht die heutige Pflicht der Übertragungsnetzbetreiber.
- Bund, veröffentlicht und belegt: die Jahressumme 2024, [BNetzA 12.11.2025](https://www.bundesnetzagentur.de/1079644) und [SMARD](https://www.smard.de/page/home/topic-article/216804/218412/status-quo-der-batteriespeicheranfragen-2024). 9.710 Anfragen, rund 400 GW, rund 3.800 Zusagen, rund 25 GW. Kein Ort.

Fazit: grobe ÜNB-Karten in MW-Klassen ja, eine einheitliche offene maschinenlesbare Reihe bis zur Mittelspannung nein. `/ort` bleibt beim Beispiel und bei der Schätzung und verlinkt die Klassenkarten nicht. Eine nachgebaute Deutschlandkarte mit erfundenen Punktwerten bleibt der falsche Schritt. Status der Fläche: teilweise.

### 7. Ganzheitlich, und vorsichtig mit dem, was trägt — teilweise

Story, Konzept und Form sollen ein Stück sein. Heute ist die Form weiter als die Story. Der Hero mit der 25, der Tagesgraph, die Monatskurve im Oktober und das dunkle Blatt tragen. Daran wird nicht gezogen.

Was fehlt, ist der Bogen, der diese Figuren zu einem Satz macht: derselbe Tag als Überschuss, als Börse und als Abendspitze, derselbe Monat als drei Ziele, derselbe Anschluss als offene Kapazitätsfrage. Ein einzelner Layoutschnitt auf Start, Tag oder Ort erfüllt den Auftrag nicht.

## Was die Seite heute nicht kann

- Sie kann an einem Tag ohne Überschuss nicht sagen, ob der Speicher an der Börse trotzdem ein Fenster gehabt hätte. Sie druckt auf `/tag` die gerundete Spanne (am 8. November: 206–322 €/MWh) und zeichnet die 96 Viertelstunden nicht.
- Sie kann den November nicht simulieren. Peak- und Preisfahrweise gibt es als vorberechneten Lauf nur für Oktober 2026. Der Link „Monat ansehen“ vom 8. November landet auf einer Beobachtung ohne Modell.
- Sie kann die drei Oktober-Fahrweisen nicht in einem Satz gegenüberstellen. Wer die URL kennt, sieht sie. Die Startseite verweist in einer Fußnote darauf.
- Sie kann keinen Euro für die nationale Flotte zeigen, auch nicht bei ×1. Das ist auf `/monat` ausdrücklich so. Euro stehen auf `/ort` als Modellschätzung eines Beispielanschlusses.
- Sie kann keine lokale Netzwirkung bewerten. Der Satz steht auf der Startseite: „nicht bewertet“.
- Sie kann keine Abregelung in GWh nennen. Der Netztransparenz-Feed ist nicht angeschlossen.
- Sie kann einem Hamburger Netzplaner keine freie Kapazität in MW an einem konkreten Umspannwerk nennen und keine städtische Residuallast. 50Hertz veröffentlicht für die Regelzone, in der Hamburg liegt, Kapazitätsklassen (Stand 31.03.2026). Die Seite verlinkt sie nicht. Die Regelzone ist nicht die Stadt.
- Sie kann kein Intraday, keine Regelleistung und keine Preiswirkung von mehr Speichern rechnen. Mehr Speicher würde die Spanne in Wirklichkeit drücken. Eine lineare Euro-Skalierung mit ×2, ×5 oder ×10 wäre falsch und ist zu Recht nicht da.
- Sie hat keine Marktseite. Die Navigation ist Start, Tag, Monat, Ort, Methodik, Beiträge.

## 1. Drei Fragen je Zielgruppe

Stand der Antworten: Live-HTML am 9. November 2026, letzter vollständiger Tag Sonntag, 8. November.

| Zielgruppe | Frage, mit der sie kommt | Antwort heute, mit Zahl | Lücke |
| --- | --- | --- | --- |
| Speicherprojektierer | An wie vielen Tagen der letzten Wochen war Wind und Sonne über der Last, und wie viel hätte die heutige Flotte davon geladen? | Start: 25 von 30 Tagen ohne Überschuss. Summe 115,6 GWh, Modell ×1 lädt 32,6 GWh (28 %). Fünf Tage, jeder mit 6,5 GWh Modell-Ladung. | Die 25 Tage bleiben in dieser Rechnung bei 0,0 GWh. Eine zweite Lesart (Preis, Spitze) ist ein Satz in der Fußnote. |
| Speicherprojektierer | Was war der Day-Ahead-Preis an so einem leeren Tag, Stunde für Stunde? | `/tag/2026-11-08`: „206–322 €/MWh“, neben der Kennzahl 14,5 % Wind+Sonne. | Keine Preiskurve. Kein Satz, dass das Minimum bei 206 €/MWh lag und keine Viertelstunde negativ war. |
| Speicherprojektierer | Was bringt mehr Speicher, und was wäre der Erlös der Flotte? | Oktober, nur wer die Fahrweise umschaltet: ×1 Marktfahrweise lädt 485,45 GWh und senkt die Spitze um 0,37 GW. Überschuss-Fahrweise lädt 55,90 GWh und senkt um 2,24 GW. | Kein Euro, auch nicht bei ×1. November ohne diese Rechnung. Die zwei Fahrweisen stehen nicht nebeneinander. |
| Netzplaner, zum Beispiel Hamburg | Wie hoch war die Abendspitze, und hätte Speicher sie gesenkt? | Tag 8. November: 58,5 GW um 17:15, Verbrauch 62,1 GW, Wind+Sonne 3,5 GW. Überschuss-Modell an diesem Tag: nichts geladen, nichts abgegeben. Oktober, Spitzenfahrweise ×1: Senkung 3,55 GW auf 60,86 GW. | Die 58,5 GW sind Deutschland, nicht Hamburg. Die Spitzenfahrweise gilt für Oktober und eine andere Flottengröße (4,58 GW / 8 GWh, nicht die 4,64 GW / 8,14 GWh der Startseite). |
| Netzplaner | Wo im Netz ist Anschluss frei? | `/ort` trennt Projektierer und Netzbetreiber und rechnet Beispiele (Schnellladepark, Modellanker 110 kV). Badge bleibt Schätzung. | Keine verlinkte ÜNB-Klassenkarte. Keine MW-Zahl bis zur Mittelspannung. Siehe Frage 4. |
| Netzplaner | Belasten oder entlasten Speicher den Anschluss? | Ampel und Badge auf `/ort`, als Schätzung gekennzeichnet. Text: Netzdienlichkeit folgt aus Ort, Uhrzeit und Vertrag. | Kein Hamburger Lastgang, kein echtes Umspannwerk. |
| Institut | Kann ich die Zahl nachrechnen? | `/methodik`: Round-Trip 85 %, SoC 10–90 %, Preisnehmer, Day-Ahead, Formel des Überschusses, Quellen. | Dieselbe Disziplin fehlt für eine Preis-Kennzahl auf Start und Tag. Die Spanne 206–322 ist gerundet, die Reihe steckt nicht auf der Seite. |
| Institut | Was ändert sich, wenn die Flotte ×2, ×5, ×10 ist — an Energie und an der Spitze, je Fahrweise? | Oktober-Seite hat die vier Faktoren und drei Fahrweisen. Die Startseite zeigt die Überschuss-Aufnahme: ×1 28 %, ×5 75 %, ×10 100 %. | Die Startseite skaliert nur die Überschuss-Energie. Die Oktober-Marktfahrweise senkt die Spitze kaum, obwohl sie viel Energie bewegt. Dieser Gegensatz ist der Insight und steht auf keiner gemeinsamen Fläche. |
| Institut | Wie viele Stunden war der Preis negativ, und wie entwickelt sich das über die Monate? | Einzelne Tage können „niedrigster Preis“ als Auffälligkeit gewinnen. Im Fenster 10. Oktober bis 8. November sind es zwei Tage mit zusammen 1,75 Stunden unter null. | Keine Monatsreihe, kein Trend, keine eigene Marktseite. |

## 2. Saisonlücke

Das Überschuss-Modell lädt nur, wo Wind plus Sonne über der Last liegt, und auf der Tageskette nur vor 17 Uhr. Im geladenen Fenster trifft das auf fünf Tage zu. Die Seite zeigt die übrigen Tage als 0,0 GWh und, auf `/monat/2026-11`, als Satz ohne Balken: kein geladener Tag hat die Schwelle 0,05 GWh erreicht.

Dieselbe öffentliche Preisreihe, Gebotszone DE-LU, Viertelstunde, bleibt in diesen Tagen aussagekräftig. Drei Ankertage:

| Tag | Überschuss auf der Live-Seite | Day-Ahead min–max | Spanne | Stunden unter 0 |
| --- | --- | --- | --- | --- |
| Sa, 24.10., stärkster Überschuss | 61,1 GWh | 0,00–111,31 €/MWh | 111,31 | 0 |
| Do, 29.10., weiteste Spanne | 0,0 GWh | 229,70–574,28 €/MWh | 344,58 | 0 |
| So, 08.11., letzter vollständiger Tag | 0,0 GWh | 206,09–321,50 €/MWh | 115,41 | 0 |

Am 29. Oktober liegen fünf Viertelstunden über 500 €/MWh, gebündelt von 17:00 bis 18:15. Der Wert 574,28 €/MWh ist die Viertelstunde 17:15, nicht ein Stundenpreis. Die vier Viertelstunden 17:00, 17:15, 17:30 und 17:45 (537,50 · 574,28 · 573,72 · 553,01) mitteln sich auf 559,63 €/MWh. Das ist eine Abendspitze im Preis, an einem Tag, den die Überschuss-Zahl als leer führt.

Am 8. November liegen die fünf günstigsten Viertelstunden zwischen 10:30 und 15:00 (206,09 bis 208,46 €/MWh) und die fünf teuersten zwischen 17:45 und 20:00 (318,15 bis 321,50 €/MWh). Die Reihenfolge wäre für einen Zyklus zeitlich möglich. Der Überschuss-Kern lädt trotzdem nicht, weil Wind und Sonne nie über der Last lagen. Beides ist wahr und gehört auf dieselbe Seite.

Gegenrechnung Spanne 8. November: 321,50 − 206,09 = 115,41 €/MWh. Dieselbe Spanne steht in der SMARD-Viertelstundenreihe (Filter 4169, Gebiet DE), auf die Viertelstunde gleich an 15:00, 17:45, 14:00 und 20:00. Die Seite rundet auf 206–322 €/MWh. Die Rundung ist nachvollziehbar. Die Kurve fehlt.

Was die Spanne nicht ist: ein Erlös. Am 8. November liegen die relativ günstigsten Viertelstunden im Mittel bei 207,62 €/MWh. Wer dort lädt, kauft teuren Strom. Negative Preise gab es im ganzen Fenster nur am 10. Oktober (eine Viertelstunde, −0,01 €/MWh) und am 25. Oktober (1,5 Stunden). Beide Tage haben auch Überschuss. Ab dem 28. Oktober liegt jedes Tagesminimum über 169 €/MWh. Ab dem 29. Oktober bleibt es hoch, aber nicht durchgehend über 200: der 4. November hat 198,99 €/MWh, der 5. November 192,13 €/MWh. Das tiefste Minimum in diesen elf Tagen ist 192,13.

Der ehrliche Satz für den Herbst lautet deshalb: Überschuss und negative Preise sind weg, die Preisspanne ist geblieben, das Preisniveau ist hoch, die Abend-Residuallast ist mit 58,5 GW weit über der Flotte von 4,64 GW. Das Überschuss-Modell mit 0,0 GWh ist korrekt und unvollständig.

## 3. Was sich aus öffentlichen Reihen bündeln lässt

Alles hier ist aus der geladenen Seite oder aus der Preisreihe vom 9. November 2026 abzählbar. Keine neue Fahrweise, kein Sprachmodell.

- **Tägliche Spanne** max(p) − min(p), Einheit €/MWh, 30 Werte. Minimum über alle 30 Tage: 71,62 (25. Oktober, ein Überschusstag, 9,6 GWh). Minimum nur über die 25 trockenen Tage: 82,78 am 1. November. Median der 30 Tage: 139,02. Maximum 344,58 (29. Oktober, kein Überschuss). Energy-Charts zeichnet die Woche als Werkzeug mit Schalttafel. Eine Reihe „Spanne je Tag, daneben die Überschuss-Tage“ gibt es dort nicht als Satz.
- **Stunden unter null**, Zählung der Viertelstunden mal 0,25 h. Im Fenster 1,75 Stunden, nur an zwei Tagen. Das ist der Befund, den eine Marktseite tragen würde: der Herbst 2026 in diesem Fenster ist kein Negativpreis-Herbst.
- **Preisniveau**, Tagesminimum und Median. Die Spanne allein verwechselt einen Tag bei 0–111 €/MWh mit einem Tag bei 206–322 €/MWh. Beide Spannen liegen nahe beieinander (111 und 115). Die Minima nicht.
- **Restlastspitze gegen Flottenleistung**, schon auf der Seite, nur getrennt. 58,5 GW am 8. November gegen 4,64 GW Leistung und 8,14 GWh Nennenergie. Das ist ein Größenvergleich, keine Senkung. Die Senkung im Überschuss-Modell ist an diesem Tag 0.
- **Dieselbe Flotte, drei Ziele, ein Monat.** Oktober ×1, live nach Umschalten der Fahrweise: Differenz aufnehmen senkt die Spitze um 2,24 GW und bewegt 55,90 / 47,52 GWh. Spitze senken: 3,55 GW bei nur 12,49 / 10,61 GWh. Marktorientiert: 0,37 GW bei 485,45 / 412,64 GWh. Die 485,45 GWh sind eine optimale Lösung. Dieselbe Zielfunktion lässt auch rund 496 GWh zu. Die Spitze bleibt davon unberührt. Wer mehr Speicher will, bekommt je nach Ziel eine andere Antwort. Die Seite rechnet das und sagt es nicht in einem Bild. Bei der Marktfahrweise ×10 entsteht die neue Spitze nicht am Abend, sondern am 21. Oktober um 14:00 Uhr, Restlast 50,96 GW plus 45,8 GW Laden bei 201,29 €/MWh.
- **Trend über Monate.** Öffentlich ableitbar, auf der Seite nicht gebaut. Der November-Lauf fehlt, also endet die Simulation am 31. Oktober.

Unsicherheit, die an jeder dieser Zahlen hängen bleibt: Preisnehmer ohne Rückwirkung, eine Viertelstunde kann die Spanne dominieren, der 25. Oktober hat wegen der Zeitumstellung 100 Viertelstunden, die beobachtete Residuallast enthält Speicher, die schon am Netz sind. Zwei Flottenstände dürfen nicht vermischt werden: Startseite 4,64 GW / 8,14 GWh (Battery Charts, Stand 9. November 2026) und Oktober-Lauf 4,58 GW / 8 GWh.

## 4. Freie Netzanschlusskapazität in Deutschland

Geprüft am 9. November 2026, korrigiert am selben Abend nach der Nachrechnung. Ergebnis: **ÜNB-Karten in MW-Klassen ja, einheitliche offene Reihe bis zur Mittelspannung nein.**

| Quelle | Was dort steht | Was dort nicht steht |
| --- | --- | --- |
| [Voltplot Grid](https://www.voltplot.com/grid), Abruf 9.11.2026 | Österreich. Betreiber veröffentlichen zulässige, verfügbare und gebuchte Kapazität je Umspannwerk, Aktualisierung vierteljährlich, Speicher eingeschlossen (§ 99 ElWG, so die Seite). | Deutschland bis zur Mittelspannung. |
| Art. 50 Abs. 4a VO (EU) 2019/943, i.d.F. VO (EU) 2024/1747 | Unmittelbare Pflicht der ÜNB: verfügbare Anschlusskapazität, mindestens monatlich, hohe räumliche Auflösung. | Eine Zahl je Mittelspannungsstation. |
| [TransnetBW Netzanschlusskarte](https://www.transnetbw.de/de/transparenz/netzzugang-und-entgelt/netzanschlusskarte), Stand 05/2026 | Einspeise- und Lastkapazität je 380-kV-Umspannwerk, in MW-Klassen. | Ein offener Punktwert, eine Schnittstelle für die ganze Republik. |
| [50Hertz Netzanschluss](https://www.50hertz.com/de/Vertragspartner/Netzkunden/Netzanschluss), Stand 31.03.2026 | Karte und Liste, Rückspeise- und Lastkapazität, Schaltfelder. Regelzone mit Hamburg. | Geklärte Lizenz für einen automatischen Download. Das ist offen. |
| [§ 14d Abs. 4 Nr. 1](https://www.gesetze-im-internet.de/enwg_2005/__14d.html) und [§ 14e EnWG](https://www.gesetze-im-internet.de/enwg_2005/__14e.html) | Netzkarten mit Engpassregionen auf der VNB-Plattform. | Kapazitätswerte in MW. |
| [BNetzA-Presse, 12.11.2025](https://www.bundesnetzagentur.de/1079644), Seite am 9.11.2026 gelesen | 2024: 9.710 Anschlussanfragen ab Mittelspannung, rund 400 GW und 661 GWh beantragt. Rund 3.800 Zusagen, rund 25 GW und 46 GWh. Bestand in derselben Mitteilung: 921 Speicher, rund 2,3 GW und 3,2 GWh. Hausspeicher ausgenommen. 2025 folgt später. | Kein Ort, keine freie Restkapazität, kein Umspannwerk. |
| [SMARD, gleicher Sachstand, 12.11.2025](https://www.smard.de/page/home/topic-article/216804/218412/status-quo-der-batteriespeicheranfragen-2024) | Dieselben Summen, plus der Hinweis, dass Projekte mehrfach an verschiedenen Orten angefragt werden. | Keine Karte freier Kapazität. |
| [BNetzA, Stromspeicher](https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Speicher/artikel.html), gelesen 9.11.2026 | Speicher brauchen Kapazität für Bezug und Einspeisung. Das Verfahren wählt der Netzbetreiber. MaStR-Auswertung der Seite, Stand 15.10.2025: rund 2,4 GW / 3,2 GWh in Betrieb, Planungen rund 5,0 GW / 10,4 GWh. | Keine Live-Karte. |
| freeGon, Reiner Lemoine Institut, Projektseite gelesen 9.11.2026 | Forschungsvorhaben März bis November 2025, freie Kapazität im Hoch- und Höchstspannungsnetz aus offenen Daten schätzen. | Kein veröffentlichtes amtliches Register, das diese Prüfung als Quelle tragen könnte. |
| Energie-Atlas Bayern, Startseite 9.11.2026 | Kein Einstieg in eine Kapazitätskarte im ersten Blick. Der Pressepfad von 2021 auf eine Mittelspannungskarte für EEG-Anlagen bis 750 kW antwortet nicht mehr unter der damals genannten Adresse. | Keine belegte, aktuelle, bundesweite Reihe. |
| MaStR | Bestehende und gemeldete Anlagen, Orte, Leistung. Die Karte auf `/ort` nutzt diese Familie von Daten für Projekte, nicht für Restkapazität. | „Noch frei“ ist aus dem Register nicht ablesbar. |

Einzelne Verteilnetzbetreiber betreiben eigene Prüffenster, teils mit Anmeldung (öffentlich beschrieben für Mitnetz Strom und LEW, Stand der Fachmeldung August 2025). Das ist kein gemeinsamer offener Datensatz bis zur Mittelspannung. SpeicherPilot kann die ÜNB-Klassenkarten verlinken, sobald die Lizenz das hergibt. Eine erfundene Deutschlandkarte mit Punktwerten bleibt der falsche Award.

## 5. Roter Faden

Die Navigation verspricht Start → Tag → Monat → Ort → Methodik. Ein Marktglied fehlt.

| Seite | Was sie heute erzählt | Wo der Faden reißt |
| --- | --- | --- |
| Start | 30 Tage Überschuss, dann der letzte Tag als Last und Wind+Sonne, dann die Modell-Aufnahme in Prozent. | Der Preis des Fensters kommt nicht vor. Die Fußnote verweist auf den Monatslauf. |
| Tag | Eine Auffälligkeit, hier am 8. November der Windanteil 14,5 %, Platz 1 von 31. Darunter die Residuallast mit 58,5 GW. Preis als Zahl. | Die Balken sind der Windanteil, nicht der Preis. Unter 0,05 GWh steht in der Fußnote. |
| Monat | Oktober: drei Fahrweisen, vier Faktoren, echte Viertelstunden, keine Euro. November: Beobachtung, jeder geladene Tag 0 GWh, Hinweis auf Oktober. | Der aktuelle Monat hat die Simulation nicht. Die Start-Fußnote zeigt auf eine Rechnung, die für gestern nicht existiert. |
| Ort | Zwei Perspektiven, Beispiel, Modellschätzung in Euro bei der kleinen Anlage, Badge als Schätzung. | Kein Sprung von der deutschen Abendspitze zum Anschluss. Keine freie Kapazität. |
| Methodik | Jede Annahme nachschlagbar. | Sie erklärt den Kern. Sie ersetzt die fehlende Marktfigur nicht. |
| Beiträge | Lesen, abseits der Kette. | Nicht das fehlende Marktglied. |

Der Faden, der trägt, sobald der Überschuss aussetzt: **derselbe Tag in drei öffentlichen Zahlen** — Überschuss (oft null), Day-Ahead-Niveau und -Spanne, Abend-Residuallast gegen die Flotte. Danach der Monat als Vergleich der drei schon gerechneten Ziele. Danach der Ort als Anschluss, mit der offenen Kapazitätsfrage im Satz. Die Methodik bleibt das Blatt zum Nachrechnen.

## 6. Award-Benchmark

Aufgenommen 9. November 2026, 1440×900, außer den beiden blockierten Seiten. Bilder in [`screens/`](screens/).

| Seite | Erster Blick | Übernehmen | Nicht kopieren |
| --- | --- | --- | --- |
| [Our World in Data](https://ourworldindata.org/grapher/electricity-prod-source-stacked?country=~DEU), Fläche Deutschland | Der Titel ist der Befund, die Fläche hat eine Achse in TWh, eine Quelle, ein Land. | Eine Figur, die den Satz ist. Achse, Einheit, wenig Worte. | 35 Jahre und den Länder-Konfigurator. Cookie-Leiste. |
| [Energy-Charts, Woche 46/2026](https://energy-charts.info/charts/price_spot_market/chart.htm?l=de&c=DE&interval=week) | Last und Day-Ahead in einem Fenster, zwei Achsen, Quelle in der Fußzeile. Die Preislinie ist sofort da. | Die Preislinie neben Last oder Residuallast. Quelle klein darunter. | Die rechte Schalttafel. Das ist das Werkzeug, aus dem wir den Satz bauen, nicht die Seite, die wir werden. |
| [The Pudding](https://pudding.cool/), Index und [eine Geschichte](https://pudding.cool/2026/11/pi) | Eine Veröffentlichung, ein Gedanke, eine Figur. Der Index ist ein Stapel solcher Geschichten. | Ein Satz, dann die Figur. Fußnote für die Methode. | Die Länge eines Essays, die Spielerei, das Englische. Phillipp will weniger erklärenden Text. |
| [Voltplot Grid](https://www.voltplot.com/grid) | Österreich als Karte, frei oder voll an der Station. | Die Frage des Netzplaners ernst nehmen. Für Deutschland auf die vorhandenen ÜNB-Klassenkarten verweisen und die Lücke bis zur Mittelspannung benennen. | Die Karte nachbauen. Die österreichische Pflicht ist nicht die deutsche Reihe. |
| Electricity Maps, Financial Times | Am 9. November 2026 aus dieser Umgebung blockiert (Cloudflare). Kein Bild, keine Benotung nach Anmutung. | Aus dem bekannten öffentlichen Produkt und aus Audit 1: eine große Zahl, die Methode einen Klick entfernt, eine Annotation auf der Kurve. | Weltkarte, Paywall, Nachrichtenlage. |

Die preisgekrönten Seiten gewinnen den ersten Blick mit einer Datenfigur. SpeicherPilot gewinnt ihn mit der 25 und einem Balken, der die 25 leeren Tage als Lücke zeigt. Das ist schon eine Figur. Sie wird zur Award-Figur, wenn die zweite Reihe — der Preis — in demselben Fenster liegt und der leere Überschuss nicht mehr der einzige Satz ist.

![Start, 1440, dunkel, 9.11.2026](screens/live-start-1440-dark.png)

![Tag 8.11.2026, Preis als Zahl, Balken sind der Windanteil](screens/live-tag-1440-dark.png)

![Our World in Data, Strom nach Quelle, Deutschland](screens/owid-stacked-de.png)

![Energy-Charts, Börsenpreis Woche 46/2026](screens/energy-charts-preis.png)

![The Pudding, eine Figur pro Geschichte](screens/pudding-pi.png)

![Voltplot, freie Kapazität in Österreich](screens/voltplot-at.png)

## Daten, Abruf, Lizenz

Alle Preiswerte in diesem Text stammen aus einem Abruf am 9. November 2026.

- Energy-Charts `GET /v2/price?bzn=DE-LU&start=2026-10-10&end=2026-11-08`. Antwortfeld `generated_at`: 2026-11-09T21:27:37+01:00. `license`: „CC BY 4.0 from Bundesnetzagentur | SMARD.de“. `unit`: EUR/MWh. `resolution`: PT15M. 2.884 Punkte. Der Einzeltag 29. Oktober erneut 21:32 Uhr, der 8. November 21:26 Uhr, dieselben Extremwerte.
- SMARD, Filter 4169, Gebiet DE, Viertelstunde, Datei `4169_DE_quarterhour_1793574000000.json`, gelesen am selben Abend. Für den 8. November: Minimum 206,09, Maximum 321,50, und die vier geprüften Uhrzeiten decken sich mit Energy-Charts.
- [SMARD, Datennutzung](https://www.smard.de/home/datennutzung), gelesen 9.11.2026: Marktdaten unter CC BY 4.0, Namensnennung „Bundesnetzagentur | SMARD.de“. Dieselbe Seite schreibt, die Lizenz der Großhandelspreise werde im Festlegungsverfahren HEDWIG geprüft. Die Zahlen hier tragen deshalb die Namensnennung und diesen offenen Hinweis. EPEX SPOT wurde nicht abgefragt. Deren Marktdaten sind ein kostenpflichtiges Produkt mit eigener Nutzungsfreigabe.
- Seitenkennzahlen (25 Tage, 115,6 GWh, 32,6 GWh, 58,5 GW, 4,64 GW / 8,14 GWh, Oktober-Fahrweisen) aus dem Live-HTML am selben Abend, nicht neu summiert. Die Überschuss-Definition bleibt die der Methodik: Σ max(0, Wind+Sonne−Last) mal eine Viertelstunde.

## Was bleibt

Die 25, der Tagesgraph mit der Annotation, der Oktober-Lauf mit drei Fahrweisen, `/ort` mit getrennten Perspektiven, die Methodik, das Verbot linearer Euro-Skalierung, der Badge als Schätzung. Der Kern wird nicht umgeschrieben. Die leere Saison braucht eine zweite Figur aus Daten, die schon öffentlich sind.
