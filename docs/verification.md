# Verifikation in CI (Paket A)

Deterministische Checks für Pull Requests und einen Production-Smoke nach Deploy. Kein Auto-Merge; rote Jobs dokumentieren reale Befunde auf `main`.

## Workflows

| Workflow | Trigger | Zweck |
|----------|---------|--------|
| [`.github/workflows/verify.yml`](../.github/workflows/verify.yml) | `pull_request` → `main` | Links, Sitemap, Performance-Budgets, PR-Screenshots |
| [`.github/workflows/smoke.yml`](../.github/workflows/smoke.yml) | `deployment_status` success (Production) | Playwright-Rundgang über Sitemap-Routen |

## Basis-URL

1. **Vercel-Preview** des PRs, wenn erreichbar (nicht geschützt).
2. Sonst **`pnpm build && pnpm start -p 3099`** (lokaler Production-Build).

`VERIFY_BASE_URL` steuert alle Skripte.

## Checks

### Links & Anker (`scripts/verify/crawl-links.mjs`)

- Start: `/sitemap.xml` + `/`
- BFS über interne `href`s
- Intern: HTTP 2xx/3xx
- Fragment-Anker: Ziel-`id` muss existieren
- Externe Links: nur Warnungen im Report

### Sitemap ↔ Routen (`scripts/verify/check-sitemap.mjs`)

- Jede Sitemap-URL: Status 200, kanonische Hosts laut [`verify/sitemap.exceptions.json`](../verify/sitemap.exceptions.json)
- Jede indexierbare Route aus [`scripts/verify/enumerate-indexable-routes.ts`](../scripts/verify/enumerate-indexable-routes.ts) muss in der Sitemap stehen — **Ausnahmen nur in der Config**
- Auf `main` fehlen typischerweise `/tag/*`, `/monat/*`, `/beitraege/*` → **erwartetes ROT**, nicht wegkonfigurieren

### Performance (`scripts/verify/check-performance.mjs`)

Budgets in [`verify/performance-budgets.json`](../verify/performance-budgets.json):

- Mobil (Lighthouse 12.6, CPU-Throttling 4×)
- **LCP ≤ 2,5 s**
- **Transfer ≤ 1,5 MiB** (`total-byte-weight`)

Stichproben je Seitentyp: Start, Tag, Monat (inkl. `/monat/2026-11`), Beiträge, statische Seiten.

**Bekannter Ausreißer:** `/monat/2026-11` — Server-HTML schnell, Lighthouse-LCP hoch wegen Client-Hydration, Charts und großer JSON-Payloads (Paket B, nicht hier gefixt). Der Report listet schwere JS-Chunks und Daten-Requests.

### PR-Screenshots (`scripts/verify/pr-screenshots.mjs`)

- Geänderte Routen aus Git-Diff
- Viewports **1280** und **390**, Hell/Dunkel (`speicherpilot-theme`)
- Artefakt `verify-screenshots`; PR-Kommentar via `post-pr-comment.mjs`
- **Video** nur bei Diff in Client-/Interaktions-Dateien

### Production-Smoke (`scripts/verify/smoke-production.mjs`)

- Sitemap-Routen + Klicks auf Links/Buttons (begrenzt)
- Konsole (`error`), 4xx/5xx
- Bei Fehler: GitHub-Issue, kein Auto-Fix

## Lokal ausführen

```bash
pnpm build
pnpm start -p 3099 &
export VERIFY_BASE_URL=http://127.0.0.1:3099
export VERIFY_ARTIFACT_DIR=.verify-artifacts
pnpm verify
```

Einzelchecks: `pnpm verify:links`, `verify:sitemap`, `verify:perf`, `verify:shots`.

## Artefakte

Unter `.verify-artifacts/` (CI: hochgeladen als `verify-artifacts` und `verify-screenshots`):

- `links-report.json`, `sitemap-report.json`, `performance-report.json`
- `lighthouse/*.json`
- `screenshots/*.png`, optional `screenshots/video/`
- `verify-summary.json`, `GITHUB_STEP_SUMMARY.md`