# Launch Run10 — Monatsmodell Run9 im Produkt

## Head
Branch: `cursor/launch-monatsmodell-run10-2686` (nach Push)

## Prüf-URLs (Default: ×1, Differenz aufnehmen)

| Seite | URL |
|-------|-----|
| Monat Modell | `/monat/2026-10?faktor=1&fahrweise=ueberschuss` |
| Monat Spitze | `/monat/2026-10?faktor=1&fahrweise=spitze` |
| Monat Markt | `/monat/2026-10?faktor=10&fahrweise=markt` |
| Tag Ausschnitt | `/tag/2026-10-29?faktor=1&fahrweise=ueberschuss` |
| Methodik | `/methodik#grossspeicher` |

## Daten
- `data/national-fleet/2026-10/fleet-month-bundle.json` (Run9, 2980 qh, 12 Läufe)
- `data/national-fleet/2026-10/manifest.json` — Input-SHA256, DST 100 qh 25.10.
- Spiegel-Export: dieses Verzeichnis `fleet-month-bundle.json`

## Tests
- `lib/nationalMonthFleetModel.test.ts` — SoC-Vorzeichen alle 12, DST
- Volle Suite grün (565+ Tests)

## Offen / Grenzen
- Nur Oktober 2026 vollständiges Monatsmodell; andere Monate weiter nur Tages-/Überschuss-Ansicht
- Kein MIP im Browser; keine EUR-Skalierung ×2/×5/×10
- Screenshots/Lighthouse: nach Merge lokal oder CI — in diesem Commit-Paket noch nachzureichen falls Server nicht gelaufen

## Nicht enthalten
- Kein Video/LinkedIn, kein Prod-Deploy, PR70 unberührt
