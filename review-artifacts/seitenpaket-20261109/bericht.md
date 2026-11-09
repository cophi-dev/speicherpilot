# Nutzerfeedback-Paket 09.11.2026 — Bericht

## 1) Text — gestrichen / verschoben

| Seite | Vorher (Kurz) | Nachher / Ort |
|-------|----------------|---------------|
| Start · SystemChapter | Langer Absatz zu Spitzen/Preis/Netz/Starts oben | Kurzzeile oben; Volltext unter `<details>` „Modellgrenzen und 30-Tage-Details“ |
| Start · SystemChapter | getrennte „Details“-Fold | zusammengeführt mit Modellgrenzen |
| Tag · Serie-Kopf | Langer Dry-Streak-Hinweis inkl. Monatsmodell | Kurz: „nur Überschuss-Kennzahl“ |
| Tag · TagSystemChapter | langer Erklär-Block ohne Überschuss + Monatslauf-Hinweis inline | Monatslauf in `<details>` „Ergänzungen“; Preis mobil in Disclosure |
| Tag · NationalFleetDayChapter (Desktop) | langer Subline-Paragraph | ein Satz + Link; Volltext nur in Disclosure |
| Monat · NationalFleetMonthChapter | doppelter Lang-Subline (Desktop + disclosure gleich) | Desktop: ein Satz; Grenzen in Disclosure |
| Monat · NationalFleetMonthChapter | langer Titel | „Last, Spitzen und Speicherwirkung im Monat“ |
| Monat · MonatPageV4 Beobachtungsgraph | langer Subline-Block | eine Zeile; Klarstellung in `<details>` |
| Ort · Teaser Start/Tag | zwei Sätze Netz-/Deutschland-Bezug | je eine Zeile |
| Ort · OrtServerShell Lead | zwei Sätze Projektierer/Netzbetreiber | eine Zeile |
| Ort · Grossspeicher netz | Modellschätzung-Ring inline | `<details>` unter Hero |

Fachliche Grenzen (Modellschätzung, Price Taker, Day-Ahead, lokale Netzwirkung, Datenquelle) bleiben in Disclosures, Fußnoten (`v4-fleet-chart-footnote`, StartDayPanel-Disclosure, Methodik-Links) und `/methodik`.

## 2) Performance (prod-ähnlich: `pnpm build` + `next start`)

**Methode:** `fetch()` HTML auf `127.0.0.1:3098`, 1 Durchlauf je Route, Zeit bis vollständiger Body (Proxy für Server-Antwortzeit + SSR). Vorher = `main` ohne Paket; Nachher = dieser Branch. Zusätzlich: kein separater Client-Fetch der Fleet-Zeitreihe beim ersten Render (Serien-Payload serverseitig in RSC-Props; `skipHydrationFetch` im Chart).

| Route | Vorher ms | Nachher ms | Δ |
|-------|-----------|------------|---|
| `/tag/2026-10-29?faktor=1` | 2252 | 1960 | −292 (~13 %) |
| `/monat/2026-10?faktor=1` (spitze nachher) | 1318 | 989 | −329 (~25 %) |

**Ursache (belegt im Code):**

- `/tag`: `loadGermanyView` baut kein 30-Tage-`overviews`-Bundle mehr und kein `surplusDay`-Energy-Flow-Walk.
- `/tag`: ein Bundle-Load für Fleet-Slot + Flag (statt doppelter Pfad).
- `/monat`: `bars` einmal in `page.tsx`, an `MonatPageV4` durchgereicht (kein doppeltes `buildMonatGrid`).
- Fleet-Chart: Initialdaten aus `fleet-month-bundle.json` (echte Viertelstunden) im SSR-Pfad, API erst bei Szenario-Wechsel.

Energy-Charts-Abrufe und ~2,7 MB Bundle-Parse bleiben dominierend; Cache-Hinweis „items over 2MB“ in Server-Logs unverändert.

## 3) Monatsgraph Last/Spitzen

- Zeitreihen-Chart **vor** Marginal-Benefit und SoC-Streifen; größere Restlast-Panels (`is-month-prominent`, CSS).
- Daten: weiterhin `data/national-fleet/2026-10/fleet-month-bundle.json` (2980 QH), kein schematischer Balkenersatz.
- Interaktion: Hover/Touch-Tooltip mit exakten Werten; `role="application"` + Pfeiltasten/Home/End auf Chart.
- Faktoren: ×1, ×2, ×5, ×10 per URL (bestehende Pill-Links). **Keine freie MW/MWh-Eingabe:** würde Beobachtungsflotte (Battery Charts) und skalierte Modellflotte vermischen; Faktor-Logik ist auf diskrete Vielfache kalibriert — siehe `/methodik#grossspeicher`.
- Euro: keine Euro-Ausgabe im Monatsfleet-UI; Unit-Tests `nationalFleetSeriesPayload.test.ts` + `beispieltage` (×1 only).

## 4) Tests & Build

- `pnpm test`: grün (inkl. neuer `lib/nationalFleetSeriesPayload.test.ts`).
- `pnpm build`: grün.

## 5) Screenshots

Unter `review-artifacts/seitenpaket-20261109/screens/` — Start, Tag, Monat (×1 und ×5), 375/1280, dark/light. `manifest.json` enthält Head-SHA nach Merge-Commit.

