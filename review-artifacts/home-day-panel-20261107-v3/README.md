# Homepage day panel — Fachabnahme Run 2 Nachzug (v3)

- **Branch:** `cursor/homepage-daily-stats-panel-9391`
- **Bezugstag:** 2026-11-06 (strict 96/96)
- **Panel 375×closed disclosure:** siehe `screens/manifest.json` (`panel375DarkHeightOk`)

## Dateien

| Pfad | Inhalt |
|------|--------|
| `snapshot.json` | KPIs, `fleetProvenance`, `powerFetchNote`, Disclosure-Texte |
| `screens/*.png` | 375/1280, dark/light, Panel + Chart, Disclosure offen |
| `screens/manifest.json` | Höhenmessung geschlossenes Panel @ 375 |

## Checks (Run 2 Restpunkte)

1. **Vorlauf:** Lückenlose Berlin-Kalendertage Simulationsstart → Bezugstag; ganz fehlender Tag → Modell nicht verfügbar (`lib/homeDayPanel.prelude.test.ts`, `berlinDayCompleteness.test.ts`).
2. **Flotte:** Fallback mit Label „gespeicherter Stand (Fallback)“ + Datum in Disclosure (`fleetStandLabelDe`, `fleetProvenance: committed-snapshot`).
3. **Layout:** ≤360px Panelhöhe @375 geschlossen; kein doppeltes Modell-Heading.
