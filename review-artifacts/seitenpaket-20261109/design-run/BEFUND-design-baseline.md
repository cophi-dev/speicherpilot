# Run23 — Seitenpaket PR #76 Head 50634c3 — visuelle Belege

Preview: https://besorge-git-cursor-nutzerfeedback-paket-0935-cophidevs-projects.vercel.app  
Head laut Vercel-Meta: `50634c303b8eb9c28b53429f4cfd57f0f003b81c`  
Messzeit: 09.11.2026 ~19:04–19:12 Europe/Berlin  
Methode: Playwright Chromium, prefers-color-scheme light/dark, SSO via vorhandene Vercel-Session. Kein Code geändert.

## Vorhandene Screens (vor Perf-Lauf)
`/workspace/career/speicherpilot/seitenpaket-20261109/screens/`
- monat-2026-10-f1-1280-light.png (1280×5189)
- monat-2026-10-f1-375-light.png (375×7027)
- monat-2026-10-f5-1280-light.png (1280×5241)
- start-1280-light.png (1280×3152)
- start-375-light.png (375×3546)
- tag-2026-10-29-f1-375-light.png (375×4159)
Hinweis speicherpilot: UI nach Perf-Lauf unverändert, Monatsgraph lädt clientseitig nach first paint — deshalb Live-Preview geprüft.

## Neue Belege
Ablage: `/workspace/career/speicherpilot/design-review/run23-seitenpaket/`  
Vollreport: `report.json`, `report-extra.json`, `tabs-final.json`, `probe.py`

### End-Crops (für visuelle Bewertung)
1. `END-01-graph-ladezustand-375-dark.png` — Platzhaltertext, **keine** feste Höhe
2. `END-02-graph-geladen-375-dark.png`
3. `END-03-graph-geladen-1280-light.png`
4. `END-04-graph-x1-1280-light.png`
5. `END-05-graph-x10-1280-light.png`
6. `END-06-tooltip-375-dark.png` — per Pfeiltasten (Tap allein zeigt nur Hint)
7. `END-07-start-375-light-top.png`
8. `END-08-factor-x10-50ms-1280-light.png` — ~50 ms nach Klick ×10, Caption noch ×1-Werte

### Full-Page (Reveal zuerst)
start / monat-2026-10 / tag-2026-10-29 × {375,1280} × {light,dark}  
z. B. `monat-2026-10-375-dark.png`, `start-1280-light.png`, …

## 1) Monatsgraph Ladezustand / Platzhalter / CLS

**Kein Skeleton mit fester Höhe.** Vor dem Client-Hydrate steht nur Text „Zeitreihen-Chart wird geladen …“; die Folgeabschnitte („Weitere Monats-Kennzahlen …“) liegen direkt darunter. Beleg: `END-01-…`, `crop-graph-loading-before-375-dark.png`.

Höhen-Poll 375 dark (unthrottled):
| t | wrapH | scrollH | mainH |
|---|------:|--------:|------:|
| ~34 ms | null | 1063 | 720 |
| ~343 ms | null (Controls da) | 6233 | 5923 |
| ~791 ms | **709** | 6939 | 6629 |

1280 light:
| t | wrapH | scrollH |
|---|------:|--------:|
| 0 | null | 4658 |
| ~530 ms | **508** | 5163 |

Mit 2,5 s JS-Chunk-Delay: nach 9 s weiterhin **kein** `.v4-fleet-ts-wrap` (Chart kommt nicht).

**CLS (PerformanceObserver layout-shift, ohne recent input):**
- monat 1280 light/dark: **0,929** (Quellen: MAIN#inhalt, FOOTER) — klar über 0,25
- loading delayed 375 dark: 0,073
- start alle: 0
- tag 1280 light: 0,023; sonst tag/monat 375: 0
- poll 375 dark (nach domcontentloaded): 0 (Shift teils vor Observer-Fenster)

**Befund:** Layout-Sprung beim nachträglichen Einsetzen des ~508–709 px hohen Charts. Platzhalter reserviert diese Höhe nicht.

## 2) Faktoren ×1/×2/×5/×10

Tap-Ziele Fleet-Pills 375/1280: Höhe **44–46 px**, Breite ≥47 → ≥44 OK.

Höhen Graph-Container (wrap):
- 1280: ×1/×2 = 508 px; ×5/×10 = 538 px (+30, Caption/Legende). Interactive-Plot konstant 426 px.
- 375: ×1 = 709; ×2/×5/×10 = 739 (+30). Interactive konstant 448 px.

Y-Achsen-Beschriftung ändert sich mit Faktor (Beispiel Speicherleistung: ×1 `0,0–4,8 GW` → ×10 `0,0–13,7 GW`; SoC ×1 `0,8–7,2 GWh` → ×10 `8,0–70,3 GWh`). Plot-Höhe springt nicht; Wrap-Höhe leicht durch Zusatzzeile Legende („×1 mit Speicher (Vergleich)“ ab ×2).

~50 ms nach Klick ×10: **kein Leerzustand**, Kurven bleiben; Caption/KPI noch **stale ×1** (62,16 GW / 2,24 GW / 3,5 %), settled dann 7,91 GW / 12,3 %. Beleg `END-08`.

## 3) Tooltip / Fokus / Pfeiltasten

- 1280 Hover: Tooltip mit ISO-Zeit + GW/GWh, **im Viewport** (y≈248, h≈21, overflows=false). `monat-tooltip-hover-1280-light.png`
- 375 Tap auf Chart-Mitte: Tooltip bleibt Hint „Tippen oder Zeiger…“ — **kein Datenpunkt**. `monat-tooltip-tap-375-dark.png` / `crop-tooltip-tap2-…`
- 375 Pfeiltasten auf `.v4-fleet-ts-interactive`: Daten-Tooltip, im Viewport (h=63). `END-06`
- Fokusring an Fleet-Pill: `outline` sichtbar (`monat-focus-arrow-1280-light.png`); ArrowRight auf Pill hat Fokus nicht auf ×2 verschoben (weiter ×1 active).
- Day-Hit-Links im Chart zuvor gemessen **28×199 px** (Breite < 44).

## 4) Tag-/Monat-Tabs

Client-Nav (expect_navigation), grob bis networkidle:
- 375: Tag ~3,0 s; Monat ~5,9 s; Start ~3,3 s
- 1280: Tag ~2,9 s; Monat ~3,6 s; Start ~2,5 s

Während/direkt nach Wechsel auf `/tag` und `/monat`: kurz **kein h1**, `scrollHeight` ≈ Viewport (812/900) — Inhalt wirkt leer, danach Hydration. Sprung der Seitenhöhe ja (z. B. Start 3546 ↔ Tag/Monat Zwischenzustand 812). Cold-Goto auf konkrete Daten-URLs (`/tag/2026-10-29`, `/monat/2026-10`) ~2–3 s, h1 danach vorhanden.

## 5) Overflow

Alle 12 Full-Page-Kombis: `scrollWidth <= clientWidth` → **kein horizontaler Overflow** (gemessen).

## 6) Text < 12 px

Mehrfach **11 px**: Chapter-Nums (`01 · …`, `MODELLFLOTTE · …`), Fleet-Ticks (`1.`/`8.`/…, `00:00`), `v4-rang-caption`, `MODELL`-Tag. Farbe muted dark `#9EA3A9` bzw. light `#42474D`.

## 7) Kontrast Stichproben (berechnet, nicht AXE)

- `#9EA3A9` auf `#0B0D0F`: **7,66:1** (≥4,5)
- `#42474D` auf `#F6F6F3`: **8,66:1**
- Brand-muted `#6B7076` auf `#F6F6F3`: **4,61:1** (knapp)
- Accent light `#E86A3A` auf `#F6F6F3`: **2,96:1** (nur groß/dekorativ OK; nicht für Fließtext)
Automatischer Sampler an Captions/Summaries/Footnotes: keine Ratio < 4,5 gemeldet (bg-walk). Überlappungen: **nicht gemessen** → kein „keine Überlappung“-Claim.

## 8) Disclosures

375 dark open/closed: Modellannahmen, Weitere Monats-Kennzahlen, SoC-Spielraum, Klarstellung Beobachtungsgraph. Summaries 14–16 px; optisch aufgeräumt (Text hinter Summary). Dateien `disclosure-*-375-dark.png`.

## Auffälligkeiten (kurz, ohne Schönreden)

1. **CLS ~0,93** Monat 1280 beim clientseitigen Chart-Insert; Platzhalter ohne fixe Höhe (`END-01`).
2. Faktorwechsel: ~50 ms **stale KPIs**, kein Blank; Wrap +30 px durch Legende ×1-Vergleich.
3. **Tap** aktiviert Daten-Tooltip nicht; Pfeiltasten/Hover schon.
4. Chart-Day-Links Breite **28 px** (<44).
5. Tab-Wechsel `/tag`/`/monat` ~3–6 s; Zwischenzustand ohne h1 / Seitenhöhe ≈ Viewport.
6. Viele Labels **11 px**.
7. Kein horizontaler Overflow in den 12 Full-Pages.
