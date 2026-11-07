# Build-Provenance (`public/build-provenance.json`)

Das Skript `scripts/generate-build-provenance.mjs` läuft am Anfang und Ende von `npm run build` (siehe `package.json`).

## Felder

| Feld | Bedeutung |
|------|-----------|
| `commit` | `git rev-parse HEAD` zum Zeitpunkt des Laufs |
| `buildId` | UTC-Zeitstempel oder `BUILD_ID` |
| `dirty` | `true`, wenn `git status --porcelain` noch geänderte Pfade sieht (nach Ausschlussliste) |
| `dirtyPaths` | optional: die Porcelain-Zeilen, die `dirty` ausgelöst haben |
| `ci` | gesetzt wenn `VERCEL` oder `CI` in der Umgebung |

## Ausschlüsse im dirty-Check

`artifacts/`, `test-results/`, `*.report.html`, `public/build-provenance.json`, `lib/buildProvenance.generated.ts` — letztere werden vom Build selbst geschrieben.

## Vercel-Hinweis (Metadaten, kein Maskieren)

Auf Vercel kann die **zweite** Provenance-Generierung nach `next build` trotzdem `dirty: true` melden, wenn der Build andere **getrackte** Dateien verändert (z. B. durch Hooks, Font-Caching, oder Lockfile-Updates). Dann stehen die Ursachen in `dirtyPaths` im **lokal erzeugten** JSON; das ist ein Befund des CI-Arbeitsverzeichnisses, keine automatische Freigabe.

Lokal (sauberer App-Code-Checkout, nur Build-Artefakte unten) ist `dirty` nach abgeschlossenem `npm run build` in der Regel `false`.

Abnahme bindet weiterhin: Repo-HEAD = `build-provenance.json` = UI-Marker `#speicherpilot-build-provenance`.
