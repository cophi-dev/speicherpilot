# Run 19 — Mobile Lücke-Zeitachse & Kleinkorrekturen

Gebündelt auf PR #73 / Branch `cursor/launch-run18-kpi-raster-2686`. Kein Modell, kein Bundle.

## Lücke-Chart (Tag · 01)

**Befund (375/390, hydratisiert):** Zeitlabels 00–24 lagen auf Shell-Volbreite; SVG-Plot beginnt bei `padding-left: 36px` → optischer Versatz von Gitter/Marker (~30 px) und „18:15“ wirkte zu spät.

**Ursache (3-fach):**

1. Mobil: HTML-Achse außerhalb der SVG-Plotbreite (ersetzt durch Achsentext im SVG).
2. Standardtag 96 qh: Kurven auf Slot-Index, Gitter auf `h/24` — Spitzenmarker wich optisch ab.
3. **DST (100/92 qh):** reine Wanduhr-Skala ließ doppelte Herbststunde zeitlich **zurücklaufen** (überlappende X).

**Fix (Run 20):** Intervallbeginn `index×15/(N×15)`; Tick **24** = Mitternacht (1.0), nicht 23:45; Tests mit UTC-Artefakten `dst-timestamps.json` / `national-day-2026-10-25.json`.

## Weitere Layouts

| Ort | Fix |
|-----|-----|
| Start | mehr Abstand Subline → große Zahl (mobil) |
| Start Subline | `weekdayLabelDe` endet mit `.` — kein zweiter Punkt danach |
| Monat Kopf | „ist nicht“ statt `≠` |
| Monat Flotte | Desktop `margin-top` Steuerung nach Absatz |

## Abnahme

`node scripts/launch-run19-hydrated-abnahme.mjs` — nur **hydratisiert** (`networkidle`), Store `launch-run19-design-fix-20261107`.

## Provenance / `vercel.json`

Im Repo existiert keine `vercel.json`. `dirtyPaths` mit diesem Namen in älteren Runs stammen aus CI-Arbeitsbaum, nicht aus App-Konfiguration — siehe `docs/BUILD_PROVENANCE.md`.
