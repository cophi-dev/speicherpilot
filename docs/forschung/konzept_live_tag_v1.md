# SpeicherPilot · Live-Tag („heute“) · Forschungskonzept v1
Stand 14.11.2026, 16:45 MEZ · Entwurf, nichts gebaut, kein GO · nur öffentliche Quellen · Graphen: `live_tag_v1/` · Rechnungen: `live_tag_v1/graphs.py`, Abrufe `live_tag_v1/*.json`, Messlog `live_tag_v1/poll_log.txt`

**Auslöser:** Phillipp, 14.11. 16:26: „Ich würde auf der Seite auch gerne Daten zum laufenden Tag bekommen.“

## Forschungsfrage
> **Was kann /tag zum laufenden Tag zeigen, ohne dass vorläufige Daten eine falsche Geschichte erzählen, und wie viel Speicher-Aussage ist am selben Tag schon belastbar?**

Wer fragt: Leser, die morgens oder mittags „wie läuft es heute?“ wissen wollen (Netzplaner, Entwickler, LinkedIn-Publikum nach einem Post). Entschieden wird, ob /tag einen Live-Modus bekommt und in welchem Umfang.

## Ist-Zustand im Code (main 53bc8dd, 14.11.)
- `/tag` und `/live` leiten per **308 (permanentRedirect)** auf den letzten vollständigen Tag. Heute 16:30: `/tag/2026-11-14` → `/tag/2026-11-13`.
- Vollständigkeit: `auditBerlinPowerDay` verlangt exakt 92/96/100 Viertelstunden mit Last, Wind, Solar und Erzeugung. Danach darf der Tag in den Roll-Snapshot (`TAG_SNAPSHOT_LIVE_TAIL_DAYS = 3`: heute, gestern und vorgestern bleiben live geladen, ältere Tage kommen eingefroren aus dem Snapshot).
- Cache: `unstable_cache` 1800 s. Fehl-Ladungen werden nicht eingefroren (`assertGermanyViewTagIsrCacheable`, Fix 11.11). `dailySeriesCache` hält den letzten guten Abruf im Prozess. /monat nutzt seit #107 eingefrorene Tage plus den angefangenen Monat.
- Antwort der Seite heute: `cache-control: private, no-store`, `x-vercel-cache: MISS`, /tag/2026-11-13 in 1,0–4,5 s. **Die Seite rendert also schon heute pro Aufruf.** Die 1800 s gelten nur für den Daten-Cache.
- Es gibt fertige, aber **nicht eingebundene** Live-Bausteine: `lib/liveBoard.ts`, `lib/loadLiveBoard.ts` (SMARD-Viertelstunden, Day-Ahead, Energy-Charts `/v2/signal`), `components/live/HomeLiveBlock.tsx`, `components/home/HeuteHero.tsx`.

## Gemessen am 14.11.2026, 16:27–16:34 MEZ
| Quelle | letzte Viertelstunde mit Wert (Beginn) | Ende dieser ¼ h | Verzug zum Abruf |
|---|---|---|---|
| Energy-Charts `total_power` · Last | 14:45 | 15:00 | **88 min** |
| Energy-Charts `total_power` · Wind, Solar, Restlast | 14:30 | 14:45 | **103 min** |
| Energy-Charts `public_power` | 14:30 | 14:45 | 103 min |
| SMARD Viertelstunde 410/4067/4068 (Last, Wind on, Solar) | 15:30 (Solar ab 16:33 bis 15:45) | 15:45 | **43 min** |
| Day-Ahead DE-LU (Energy-Charts `price`, `generated_at` 16:23; SMARD 4169) | So 15.11. 23:45 | So 24:00 | **heute und morgen komplett bekannt** |

**Takt der Aktualisierung (Messlog alle 5 min, 16:28–16:49):** Energy-Charts liefert in Schüben. Zwischen 16:38 und 16:43 sprangen Wind und Solar von 14:30 auf 15:15 (drei Viertelstunden auf einmal), die Last von 14:45 auf 15:45. Der Verzug pendelt also zwischen **~45 und ~115 min** (Wind/Solar: 73 min direkt nach dem Schub, 114 min kurz davor). SMARD rückt je Viertelstunde nach (~43 min). Antwortzeiten der APIs: 0,75–1,25 s. Bei Energy-Charts kommt die Last eine Viertelstunde vor Wind und Solar. Die letzte Zeile ist deshalb halb leer und muss abgeschnitten werden.

## Hypothesen (widerlegbar)
- **H1 Verzug:** Ist-Daten laufen 1,5–2 h hinter der Uhr (Energy-Charts) bzw. ~45 min (SMARD). *Widerlegt, wenn* Energy-Charts im Messlog regelmäßig unter 60 min liegt. **Heute:** 88–103 min bzw. 43 min, gestützt (ein Nachmittag, Wochentage noch offen).
- **H2 Vorläufig ≠ falsch, aber laut:** Die letzten 2–3 Stunden enthalten Ausreißer, die ein Laie als Ereignis liest. *Widerlegt, wenn* die Rohreihe glatt ist. **Heute:** Die Last fällt bei Energy-Charts in 6 Viertelstunden (12:45–13:15, 13:45–14:15) um 9–14 GW und springt dann zurück. SMARD zeigt Einbrüche zu anderen Zeitpunkten (12:45, 13:45, 14:30). Die Restlast fällt dadurch auf −4,2 GW: **ein Schein-„Überschuss“ am 20. Tag ohne Überschuss.** Gestützt und kritisch. **Nachkorrektur, 22 min später gemessen (Abruf 16:49):** 16 Werte von heute haben sich geändert. Die Last um 13:45 und 14:00 stieg um +9,7 bzw. +8,8 GW, die um 14:30 und 14:45 fiel um −8,2 bzw. −7,0 GW. Einbrüche wandern also, und ein Wertefilter allein reicht nicht.
- **H3 Preis-Fahrplan ist keine Prognose:** Der Day-Ahead-Preis des ganzen Tages steht seit gestern ~13 Uhr fest. Die Markt-Fahrweise der Referenzflotte ×1 lässt sich deshalb für 00–24 Uhr fest rechnen. Nur Überschuss- und Spitzen-Fahrweise brauchen die Restlast und damit eine echte Prognose. *Widerlegt, wenn* der veröffentlichte Preis nachträglich geändert wird (selten, Marktkopplungsabbruch).
- **H4 Kosten:** Ein Live-Modus mit 15-min-Daten-Cache erhöht die Vercel-Last kaum, weil die Seite schon pro Aufruf rendert. Neu sind nur ~96 zusätzliche API-Abrufe am Tag (je ~10 KB). *Widerlegt, wenn* `/tag/heute` den 30-Tage-Rang bei jedem Aufruf neu rechnet (so wie es bei /monat vor #107 war).

## Kernantworten, je ein Graph
1. **Bis wann gibt es Daten?** Ist-Werte reichen um 16:27 bis 14:45 (Energy-Charts) bzw. 15:45 (SMARD). Der Preis steht schon bis morgen 24 Uhr fest. Ein Live-Tag ist deshalb **„Preis ganzer Tag + Netz bis vor ~2 h“**, kein Echtzeit-Ticker.
   *Graph `g1_datenstand.png`:* waagerechte Balken je Quelle, x = Uhrzeit Sa 00 bis So 24, rote Linie = Abruf. **In 5 s:** Ist-Daten enden vor der roten Linie, der Preis reicht weit darüber hinaus.
2. **Was ein Live-Tag zeigen kann:** Restlast bis „Stand hh:mm“ als durchgezogene Linie, danach eine graue Fläche „noch keine Ist-Daten“. Darunter der Day-Ahead-Preis für 00–24 Uhr und der Markt-Fahrplan der Referenzflotte ×1, der feststeht, weil der Preis feststeht. Die Überschuss- und Spitzen-Fahrweise wird erst nach Tagesende gezeigt oder für den Rest des Tages klar als Prognose markiert. Heute (Modell, ×1, volle Voraussicht auf DA) sind es zwei Zyklen: Laden nachts 02:45–05 Uhr (~178 €/MWh), Entladen 07–08:30 (bis 240), dann Laden 11:15–12:45 (145–148), Entladen 17–18:30 (bis 267). Das Laden ab 23:15 ist der Modellrand (zurück auf 50 % SoC).
   *Graph `g2_live_mockup.png`:* oben Restlast in GW mit „Stand 14:45“, unten der Preis in €/MWh und der ×1-Fahrplan in GW (laden/entladen). **In 5 s:** links Ist-Daten, rechts Lücke, der Preis läuft durch.
3. **Ohne Plausibilitätsfilter lügt der Live-Tag.** Die heutige Vollständigkeitsprüfung zählt nur Viertelstunden und prüft nicht, ob Werte plausibel sind. Die Einbrüche um 12:45–14:15 würden als negativer Restlast-Wert durchgehen. Regel im Test: Wert > 6 GW unter dem letzten plausiblen Wert ⇒ „vorläufig“, ausblenden, gepunktet überbrücken. Sie trifft die 6 Einbrüche des ersten Abrufs. Der zweite Abruf zeigt aber neue Einbrüche (14:15–14:45). Deshalb gilt zusätzlich eine **Vorläufigkeitszone**: Die letzten 3 h vor „Stand“ werden dünn gestrichelt gezeigt, und aus ihnen wird nichts berechnet.
   *Graph `g3_vorlaeufig.png`:* Last 09–16 Uhr: Energy-Charts um 16:27 und um 16:49 sowie SMARD, die Ausreißer rot umkreist. **In 5 s:** Bis 12:30 decken sich alle Kurven, danach springen sie, und dieselbe Reihe sieht 22 min später anders aus.

## Empfehlung
**Ein „läuft“-Modus für den heutigen Tag, aber ohne Rang, ohne Auffälligkeit und ohne Überschuss-Aussage, solange der Tag nicht vollständig ist.** Gezeigt werden: Restlast bis „Stand hh:mm“, der Preis für den ganzen Tag (dazu morgen ab ~13 Uhr), der Markt-Fahrplan ×1 als „Fahrplan aus dem Day-Ahead-Preis (Modell)“, und ein Hinweis: „Werte der letzten Stunden sind vorläufig, der Tag wird morgen früh endgültig.“ Energy-Charts bleibt die Quelle (gleiche Definition wie der Rest der Seite). SMARD mischen wir nicht dazu, weil es eine andere Last-Definition hat (ohne Eigenverbrauch, MWh je ¼ h) und das Niveau sonst um ~3–6 GW springt.

## Bauumfang für sites (nach GO, ein Branch)
1. `/tag/{heute}` nicht mehr umleiten, sondern im Modus `laufend` rendern. Alle Umleitungen auf den letzten vollständigen Tag von **308 auf 307** umstellen, denn eine permanente Umleitung für heute lernen Crawler und Link-Vorschauen (LinkedIn, X) als dauerhaft.
2. Daten heute: Energy-Charts `total_power` nur für heute, 900 s Daten-Cache, letzte Zeile abschneiden, wenn Wind oder Solar fehlen. Der Rest kommt weiter aus dem Roll-Snapshot, kein 30-Tage-Neuladen je Aufruf.
3. Vorläufigkeit in zwei Stufen: (a) Zone = letzte 3 h vor „Stand“, dünn gestrichelt, ohne Kennzahlen. (b) Filter `liveDayPlausibility` (Last-Einbruch > 6 GW unter dem letzten plausiblen Wert ⇒ ausblenden). Als Test-Fixtures dienen beide Abrufe vom 14.11. (`live_tag_v1/tp_today.json`, `tp_today_2.json`).
4. Kopf: Chip „läuft · Stand hh:mm MEZ“ (Ende der letzten plausiblen ¼ h), daneben „vorläufig“. Keine Auffälligkeit, kein Rang, kein „Tage ohne Überschuss“ für heute.
5. Preis-Panel: Day-Ahead 00–24 Uhr, dazu ab Veröffentlichung „morgen“ (Link auf `/tag/{morgen}` nur als Preisvorschau, sonst keine Seite für morgen). Markt-Fahrplan ×1 mit Fußnote: Preisnehmer, 85 %, SoC 10–90 %, Rückkehr auf 50 % um 24 Uhr ist ein Modellrand.
6. Überschuss- und Spitzen-Fahrweise erst nach Tagesende. Bis dahin der Satz: „rechnen wir, wenn der Tag komplett ist“.
7. Wiederverwenden statt neu bauen: `lib/liveBoard.ts` und `HomeLiveBlock` prüfen, nicht doppelt anlegen.
8. Abnahme: Mobil 390 px, ein Screenshot um 10, 14 und 20 Uhr. `/tag` ohne Datum führt weiter auf den letzten vollständigen Tag, bis Phillipp den Live-Modus abgenommen hat (Umbau ⇒ kein Selbst-Merge).

## Risiken
- **Vorläufige Ausreißer** (H2): Ohne Filter entstehen Schein-Ereignisse genau dort, wo Leser hinschauen.
- **Nachkorrekturen:** Am selben Tag binnen 22 min bis ±9,7 GW in der Last (gemessen, siehe H2). Frühere Tage werden nachträglich leicht revidiert. Für den 13.11. zeigt die Seite (Datenstand 06:00) eine Abendspitze von 37,2 GW, der Abruf um 16:28 ergibt 37,4 GW. Für heute müssen die Zahlen deshalb ausdrücklich „vorläufig“ heißen, und nichts darf aus dem laufenden Tag in Posts oder Ränge wandern.
- **Kosten Vercel:** Die Seite ist schon dynamisch, ein Live-Modus ändert daran nichts. Risiko nur, falls die Auffälligkeitsrechnung (31 Tage) für heute mitläuft, deshalb aus.
- **API-Ausfall** (Energy-Charts gibt 404 ohne start/end): Fällt der Abruf aus, wird der letzte gute Abruf mit „Stand“ angezeigt. Ist er älter als 2 h, zeigt die Seite „Daten verzögert“ (Mechanik gibt es schon in `dailySeriesCache`).
- **Sommerzeit-/Wintertage** mit 92/100 Viertelstunden: Die x-Achse ist heute fest 00–24, das muss bleiben.

## Expertenreview
**A · BESS-Entwickler:** *Härteste Gegenfrage:* „Ein Fahrplan mit voller Voraussicht auf Day-Ahead ist trivial, was lerne ich daraus?“ *Antwort:* Er zeigt live, wann am Preis geladen und entladen wird (heute zwei Zyklen, Entladen 07–08:30 und 17–18:30 Uhr), und das ist die Frage, die Leser wirklich stellen. Er heißt deshalb „Fahrplan aus Day-Ahead“, nicht „Erlös“. Euro nur ×1 und als Modellschätzung (heute ≈ 0,64 Mio € für die Referenzflotte, ohne Intraday, Regelenergie und Netzentgelte). *Gegenrechnung:* Das Mittagsladen trifft das Tagestief (144,93 €/MWh um 12:15) und das Abendentladen das Tageshoch (267,45 €/MWh um 17:30), also plausibel.
**B · VNB-Netzplaner:** *Härteste Gegenfrage:* „Vorläufige Last, die um 12 GW einbricht, ist ein Messdatenproblem. Warum zeigt ihr das überhaupt?“ *Antwort:* Wir zeigen es nicht, sondern filtern es und sagen das offen („vorläufig“). Die Gegenprobe mit SMARD zeigt Einbrüche zu anderen Zeitpunkten, das spricht für eine Lieferlücke und nicht für ein physikalisches Ereignis. Bundesweite Restlast ist kein Netzengpass. Der Live-Tag behauptet nichts Örtliches. *Offen:* ob die Einbrüche bis morgen früh korrigiert sind. Ein Abruf des 14.11. am So 15.11. gegen 07:00 würde das zeigen (nicht als Routine angelegt).

## Offene Frage an Phillipp (eine, mit Empfehlung)
Live-Modus so bauen: Ist bis „Stand“, Preis ganzer Tag, Markt-Fahrplan ×1, keine Ränge für heute? **Empfehlung: ja, und /tag ohne Datum zeigt erst nach deiner Abnahme heute statt gestern.**
