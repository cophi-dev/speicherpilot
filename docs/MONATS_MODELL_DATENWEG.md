# Monatsmodell — begrenzter Daten- und Rechenweg

## Was heute existiert

| Schritt | Artefakt | Status |
|--------|-----------|--------|
| Run9-Zeitreihen (12 Läufe × 2980 Viertelstunden) | `data/national-fleet/2026-10/fleet-month-bundle.json` | **fest im Repo**, SHA in `manifest.json` (`7ec0acf4…`) |
| Import aus Run9-CSV-Ordner | `scripts/build-national-month-fleet-bundle.mjs` | reproduzierbar mit `RUN9_FLEET_ROOT` (lokaler Ordner, **kein** Agent-Store nötig) |
| Bundle validieren (Bytes/SHA/12×2980) | `scripts/validate-national-month-fleet-bundle.mjs` | öffentlich, nur Repo |
| CLI validate/rebuild | `scripts/repro-national-month-fleet.mjs validate` bzw. `rebuild` | rebuild nur mit vollständigem CSV-Satz |
| Beobachtungs-Fallback (Monatsgraph unten) | `data/month-observation/2026-10-auffaelligkeit.json` | eingefrorener Stand für Oktober 2026 |
| Fixture-Herkunft Auffälligkeit | `lib/__fixtures__/auffaelligkeit-records.json` + `scripts/build-auffaelligkeit-fixture.ts` (falls vorhanden) | öffentlich im Repo |
| Rendering ohne Live-API | `loadMonatPageData`, `/api/national-fleet/series` | Modellflotte + Client-Chart aus Bundle |

## Was noch fehlt (ehrlich)

- Kein automatischer **Monatsrechner** für beliebige volle Monate außerhalb des Agent-Stores — nur Import vorberechneter Läufe.
- Kein MIP/Optimierer in der Render-Pipeline (bewusst).
- November 2026 und andere Monate: **kein Modellmonat**, nur Beobachtung bzw. Hinweis `NationalFleetMonthUnavailable`.
- Öffentlicher Rebuild weiterer Monate erfordert externe Rechenartefakte (wie Run9) + erneuten `build-national-month-fleet-bundle`-Lauf mit neuem `monthKey`.

## Grenznutzen in der UI

- `bundle.marginal` beschreibt nur die **Überschuss**-Strategie (Surplus-Pool zwischen ×1/×2/×5/×10).
- **Spitze** und **Markt**: stufenweise Vergleiche aus `bundle.summary` (Ladeenergie / Peakreduktion), nicht aus `bundle.marginal`.
- Markt: UI warnt, wenn höhere Ausbaustufe die Peakreduktion gegenüber ×1 **nicht** verbessert — kein fälschlicher Grenznutzen aus Surplus-Marginal.

## Oktober als Referenz

- Einziger `nationalFleetMonthAvailable`-Monat: `2026-10`.
- Datenbundle unverändert zu Run9-Abnahme (12 Strategien, 2980 Intervalle).
