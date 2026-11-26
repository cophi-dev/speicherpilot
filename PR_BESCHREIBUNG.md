# PR-Beschreibung: Kartensektion auf der Startseite + kürzere `/` + Mobil-3D (neon/start-karte)

agy-ausnahme: agy 2x gescheitert (Sandbox, dann 429). R2 von sites gebaut.

## Plan
Startseite unter dem Hero kürzen und eine Kartensektion darunter setzen. `/tag/<datum>` bleibt inhaltlich gleich, nur die doppelte Nummerierung 01/02 wird korrigiert. Zahlen der Karte kommen aus demselben Snapshot wie `/netzbetreiber`. Phillipp-GO 26.11 14:29 (t432u): unter 768 rendert `/netzbetreiber` die 3D-Karte (Commit 4d2ee623, hier übernommen). Die Startseiten-Sektion bleibt mobil ein Standbild ohne Autoplay.

## R2 (design ZURÜCK + speicherpilot-Fachprüfung)
1. 390: Riesenzahl „31 Tage“ und die Links „Tag ansehen / Wie die Auffälligkeit gewählt wird“ sind wieder sichtbar (vorher `display: none` unter 480 px). Reihenfolge: Untertitel direkt unter der Headline, danach Börsenpreis. Rang-Leiste verdichtet.
2. Insight-Zeile unter der Karte gestrichen; Methodik steht in der Linkzeile. Schwelle „0,05 GWh“ als Fußnote am Hero.
3. Kreiskarte 390: nur Hamburg, Berlin, München, Labels so gesetzt, dass sie gerendert mindestens 11 px haben. Die ganze Karte ist ein Link auf `/netzbetreiber` (Trefferfläche ≥ 44 px).
4. Satz zur Karte (MUSS Fachprüfung): „Wo 2025 am meisten EE-Strom abgeregelt wurde, stehen nicht automatisch die meisten Speicher.“ Unterzeile unverändert aus dem Snapshot.
5. Skip-Link „Zum Inhalt“ nur noch bei `:focus-visible`. `/netzbetreiber` mobil: `touch-action: none` nur auf der Canvas, außerhalb `pan-y`.

## Tests
Gezielte Suites zur Startkarte und 3D-Canvas grün. `npm test` / `npx next build` siehe Commit-Nachricht.
