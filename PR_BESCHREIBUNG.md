# PR-Beschreibung: Kartensektion auf der Startseite + kürzere `/` (neon/start-karte)

## Plan
Startseite unter dem Hero kürzen (Phillipp 13:19 via speicherpilot, „way too much“) und eine Kartensektion darunter setzen. `/tag/<datum>` bleibt inhaltlich gleich, nur die doppelte Nummerierung 01/02 wird korrigiert. Zahlen der Karte kommen aus demselben Snapshot wie `/netzbetreiber`.

## Umsetzung
1. Neue Sektion direkt unter dem Tages-Urteil: Kopf „Wo stehen die {GW} GW Großspeicher?“, Unterzeile mit Speicher-/Standortzahl und MaStR-Stand, CTA „Zur Karte“ → `/netzbetreiber`.
2. Desktop: 3D-Startansicht (`DEFAULT_CAMERA_3D` nach #158). Sobald die Sektion sichtbar ist (IntersectionObserver), spielt sie den Zubau über die Jahre einmal automatisch ab (wie „▶ Abspielen“ auf /netzbetreiber, 120 ms je Monat) und bleibt im Endstand. `prefers-reduced-motion`: sofort Endstand. Mobil (<768): Kreis-Karte als Standbild, kein Autoplay, kein interaktives 3D.
3. Auf `/` darunter genau ein Markt-Insight (erster aus `buildMarktInsights`), nur Link „Methodik“; Linkzeile „Ganzer Tag · Kompromiss · Knoten · Simulator“ ohne Zahlen; eine Quellen-Fußnote (Energy-Charts / SMARD, CC BY 4.0, Methodik).
4. Von `/` entfernt (bleibt auf `/tag`): TagChapter, TagSystemChapter, Fleet-Slot, So-gerechnet-Details, übrige Insights, Teaser mit Zahlen.
5. `/tag`: „01 · Der Tag“ und „02 · Das System“ nur noch in den Kapiteln; `TagSoGerechnet` wiederholt die Nummern nicht mehr.

## Tests
`npm test`: 237 Suites / 1008 Tests grün, nur bekannter `launchAbnahme` EACCES. `npx next build` grün.
