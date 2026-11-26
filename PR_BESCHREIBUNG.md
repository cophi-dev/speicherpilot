# PR-Beschreibung: 3D-Karte auf `/netzbetreiber` nahtlos in die Seite (`neon/karte-nahtlos`)

## Zusammenfassung (5 Zeilen)
1. Desktop (≥ 768 px): 3D-Karte, Bedienhinweis, Kamerasteuerung, Standortliste, Filterleiste und Zeitachse sitzen kastenlos und ruhig im SpeicherPilot-Stil (`/tag`, `/monat`) direkt auf dem Seitengrund.
2. Hinweiszeile und Kamera-/Zoom-Buttons (`⟲ ⟳ 3D | + − ⌂`) bilden nun eine einzige rahmenlose Fußzeile unter dem Canvas (`role="toolbar"`), wodurch die schwebende 6-Button-Leiste und die Überlappung mit Süddeutschland bei 1024 px entfallen.
3. Filterleiste ohne Pillen-Kapseln (Unterstreichungs-Tabs für `√(Netto-MW)`/`√(MWh)` und Einspeisung, Inline-Toggle mit Akzentpunkt für EE-Redispatch, offene Checkbox, Unterstreichungs-Select); Standortliste als ruhige Haarlinien-Liste ohne Kacheln.
4. Mobil (< 768 px) bleibt exakt unverändert wie #157 live (flache 2D-Kreis-Karte + Kopfzahl, 390-px-Pixelvergleich gegen `main`: 1 Subpixel Abweichung auf 6,87 Mio. Pixel; WebKit/iOS-Durchgang grün).
5. Offen: Keine offenen Blocker; `launchAbnahme.test.ts` schlägt wie bekannt nur an `/opt/cursor/artifacts` (`EACCES`) fehl, sonst alle Tests, `next build` und Browser-Abnahme (390/768/1024/1280) ohne Befund.

---

## Plan (vor Umsetzung)

### Befund auf `origin/main` (Desktop 1280 px & 1024 px)
- Die Hero-3D-Karte saß bereits randlos auf dem Seitengrund, mehrere umliegende Bereiche wirkten jedoch noch wie ein Prototyp bzw. eine Admin-Toolbar:
  1. **Kamerasteuerung & Hinweiszeile:** 6 runde Glass-Buttons in schwebender L-Formation rechts unten (`⟲ ⟳ 3D` + `+ − ⌂`) sowie ein Hinweis-Overlay, das bei 1024 px direkt über Süddeutschland lag.
  2. **Filterleiste (`.karteControls`):** 999-px-Pillen-Kapseln, schwere schwarze Pillen-Blöcke, in eine Pillen-Box gesperrte Checkbox (`nur NB-geprüft`), breites Pillen-Select und versehentliche doppelte Anführungszeichen (`"√(Netto-MW)"` / `"√(MWh)"`).
  3. **Standortwahl & „Größte Lokationen“ (`.detailCard`):** Pillen-Select links und 4 umrahmte Pillen-Kacheln rechts statt einer ruhigen Liste im Seitenstil.
  4. **Zeitachse (`.timelineBox`):** Schwerer schwarzer Abspielen-Block und grober nativer Range-Slider über der feinen Kurve.

---

## Was sich optisch geändert hat
1. **Randlose 3D-Bühne & ruhige Fußzeile (`BessKarteCanvas3d.tsx`, `bess-netzbetreiber.module.css`):** Die schwebende 6-Kreise-Leiste und das Hinweis-Overlay auf dem Canvas wurden durch eine einzelne ruhige Fußzeile direkt unter dem Canvas ersetzt (Hinweis links, rahmenlose Ghost-Controls `⟲ ⟳ 3D | + − ⌂` rechts als `role="toolbar"`). Kein Überlappen mit Baden-Württemberg/Bayern bei 1024 px, Hero-Karte + Steuerung passen bei 1280×900 und 1024×900 sauber über den Falz.
2. **Filterleiste im SpeicherPilot-Editorial-Stil (`BessKarte3d.client.tsx`, `bess-netzbetreiber.module.css`):** Alle Pillen-Kapseln und Kasten-Rahmen auf Desktop entfernt. `Säulenhöhe` und `Einspeisung` nutzen flache Unterstreichungs-Tabs (ohne versehentliche Anführungszeichen an `√(Netto-MW)` / `√(MWh)`), `EE-Redispatch 2025` einen ruhigen Inline-Toggle mit warmem Akzentpunkt (`--v4-warm`), `nur NB-geprüft` eine offene Checkbox und `Netzbetreiber` ein Unterstreichungs-Select. Bei 1280 px liegen alle 5 Filtergruppen ruhig in einer Zeile.
3. **Standortwahl & „Größte Lokationen“ ohne Kacheln (`BessKarteDetails.tsx`, `bess-netzbetreiber.module.css`):** Randlos unter der Karte mit feiner oberer Haarlinie, schlankem Unterstreichungs-Select links und einer zweispaltigen Haarlinien-Liste (ab 1024 px; einspaltig bei 768 px) ohne Kachel-Rahmen oder graue Flächen rechts. Ausgewählte Lokationsdetails sind in einen eigenen Grid-Wrapper (`.detailSelected`) gefasst, damit sie nicht in die linke Spalte umbrechen.
4. **Zeitachse harmonisiert (`bess-netzbetreiber.module.css`):** Feine obere Haarlinie, zurückhaltender `Abspielen`-Button mit feiner Kontur im Stil von `/monat` und schlanker Range-Slider (`2px`-Spur + runder `--v4-warm`-Thumb passend zu `THUMB_HALF = 8`).
5. **Sauberer Nicht-Hero-Fallback & Zugänglichkeit:** Auch außerhalb von `.karteHero` zeigen Desktop-Ansichten (≥ 768 px) keine Prototyp-Kästen mehr; Text auf der Bühne (`4,62 GW`, BKG-Zeile) bleibt markierbar, Hover/Motion/Forced-Colors sind sauber über Media-Queries gekapselt.

## Was bewusst gleich blieb
- **Mobil (`< 768 px`):** Exakt wie #157 live — flache 2D-Kreis-Karte (`BessKarteMobile2d`), Kopfzahl (`heroZahlMobile`), Rahmen und Abstände. Alle neuen CSS-Regeln sind strikt auf `@media (min-width: 768px)` begrenzt.
- **Inhalte, Zahlen, Logik & Daten:** Alle Zahlen (`4,62 GW`, 575 Speicher, 550 Lokationen), K4, BKG-Zeile, Kernerkenntnisse, „Mehr Daten“, Filterlogik sowie sämtliche Daten-Dateien (`data/bess-karte-3d/`, `data/bess-netzbetreiber/`) blieben unverändert.
- **Randlose Hero-Bühne:** Die bestehende Hero-Komposition (`4,62 GW` oben links über der Nordsee, Höhenlegende + BKG-Zeile unten links) wurde vollständig erhalten.

---

## Abnahme & Nachweise
- **Tests:** `npm test` — 235 von 237 Suites / 1002 Tests grün (`lib/seo/datenDownloads.test.ts` im Einzellauf 10/10 grün; einziger Fehler ist der bekannte `lib/launchAbnahme.test.ts` mit `EACCES` auf `/opt/cursor/artifacts`).
- **Build:** `npx next build` grün (Compile, TypeScript, 49/49 statische Seiten).
- **Überlauf & Konsole (Production-Server `127.0.0.1:3018`):** `document.body.scrollWidth === window.innerWidth` bei `390`, `768`, `1024`, `1280` px; keine App-JS-Fehler in der Konsole.
- **Mobil 390 px & WebKit/iOS:** Pixelvergleich gegen `main` (780 × 8810 px, 6.871.800 Pixel): 1 Subpixel Differenz (identisches Layout, Kreis-Karte aktiv, kein 3D-Canvas). WebKit/iPhone-Durchgang (390×844): `scrollWidth = 390`, Kreis-Karte und `4,62 GW` unverändert sichtbar.
- **Screenshots im Repo (`docs/screens-karte-nahtlos/`):**
  - `netzbetreiber-1280-full.png` (Desktop 1280 ganze Seite)
  - `netzbetreiber-1280-karte.png` (Desktop 1280 Kartenausschnitt)
  - `netzbetreiber-1024-karte.png` (Desktop 1024 Kartenausschnitt)
  - `netzbetreiber-390-viewport.png` (Mobil 390 Viewport mit flacher Kreis-Karte)
