# Run15 — Haupttexte vorher/nachher (Perspektive)

Nur Copy an Einstiegspunkten; keine neue Route, kein LinkedIn-Post im Repo.

| Route | Stelle | Vorher (Kern) | Nachher (Kern) |
|-------|--------|---------------|----------------|
| `/` | `startPointe` Subline (Trockenperiode) | „nichts zum Laden“ | Überschuss-Kennzahl vs. Peak-/Preisfahrweisen im Monatslauf |
| `/` | `SystemChapter` | nur „% des Überschusses“ | Subline: nur Überschuss-Lade-Modell, keine Netz-/Start-/Abregel-Wirkung |
| `/tag/*` | Hero `tagSurplusLine` | „Kein Überschuss.“ | Schwelle 0,05 GWh, kein vollständiges Nutzenbild |
| `/tag/*` | Trockenperiode `AuffaelligkeitKopf` | „nichts zum Laden“ | nur Überschuss-Kennzahl |
| `/tag/*` | `NationalFleetDayChapter` | Min-Peak vs. Überschuss lang | Monatslauf/Fahrweisen auch ohne Tages-Überschuss |
| `/tag/*` | Chart Null-Hinweis | Überschuss nicht geladen | Lastverschiebung/SoC trotzdem möglich |
| `/monat/*` | `monatPointe` H1 | „ohne Überschuss“ | „unter der Überschuss-Schwelle“ + Hinweis ≠ voller Nutzen |
| `/monat/*` | Modellflotte H2 | „hätte fahren können“ | drei Fahrweisen benannt |
| `/monat/*` | Beobachtung Subline | nur Datenherkunft | Überschuss-Kennzahl ≠ Peak/Preis/Abregelung |
| `/monat/2026-11` | `NationalFleetMonthUnavailable` | nur „kein Monatslauf“ | kein Null-Nutzen-Urteil |

Methodik/Doku-Ergänzungen (keine Haupttexte): `MethodikGrenzenSection`, `MONATS_MODELL_DATENWEG.md`.

## 29.10. — Peak ohne Überschuss (grafisch + rechnerisch in vorhandener UI)

| Zugang | Was sichtbar ist |
|--------|------------------|
| `/tag/2026-10-29?faktor=1&fahrweise=spitze` | Hinweis-Box „Peaknutzen ohne Wind-Solar-Überschuss“, KPIs (0 GWh Überschuss, 6,94/5,90 GWh, Verlustkette 1,04 GWh, 64,41→60,86 GW), Chart R/R′/c/d/SoC, Viertelstunden-Tabelle |
| `/monat/2026-10?faktor=1&fahrweise=spitze` (Fuß „Spitze“) | Link „29.10., ×1, Spitze senken“ mit gleicher Parameterwahl |

Bundle unverändert `7ec0acf4…`; Werte gegen unabhängigen Befund 07.11 (96 Intervalle, kein positiver Wind-Solar-Überschuss).
