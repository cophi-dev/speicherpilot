# Design-Audit 16.11 — P1-Nachzug (lokale Messung)

Stand: 2026-11-16, Production-Build lokal (`pnpm build` + `pnpm start`), Lighthouse mobile (Simulated Moto G Power, 4× CPU throttle).

## Lighthouse LCP (mobil)

| Route | Audit 16.11 (vorher) | Nach PR (lab) |
|-------|----------------------|---------------|
| `/` | 4,9–5,3 s | **2,3 s** (Performance 94, nach Head-Theme-Fix) |
| `/monat` (2026-10) | 3,7 s | **2,7 s** (Performance 68) |

Rohdaten: `lighthouse-home-mobile-after.json`, `lighthouse-monat-mobile-after.json`.

## Screenshots

`screens/` — 1280× und 390×, hell+dunkel:

- `home-1280-light.png`, `home-1280-dark.png`, `home-390-light.png`, `home-390-dark.png`
- `methodik-1280-light.png`, `methodik-1280-dark.png`, `methodik-390-light.png`, `methodik-390-dark.png`

## Änderungen (Kurz)

1. **Hero-Graph `/`:** y-Achse aus Daten (`messerHeroAxis` + `niceAxis`), Test `messerHeroAxis.test.ts`.
2. **LCP `/` + `/monat`:** H1 serverseitig; Theme-Init als synchrones Inline-`<script>` in `<head>` (`lib/themeInitInline.ts`), Test `rootLayoutThemeScript.test.ts`. Screenshot `home-390-dark-stored-localStorage.png` (dark in localStorage, erster Paint).
3. **Raster `/`:** `--page-max` / `--page-gutter` wie übrige Seiten.
4. **`ENTWURF` auf `/methodik`:** Dark-Mode-Kontrast für `chipEntwurf` (Simulator-Legal-Box).