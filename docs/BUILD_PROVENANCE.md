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

Im Repository gibt es **keine** getrackte `vercel.json` (Root-`README.md`). Wenn `dirtyPaths` dort trotzdem `vercel.json` nennen, ist die **konkrete Erzeugungskette ohne greifbaren Build-Beleg in diesem Repo nicht verifiziert** — bitte den jeweiligen CI-Lauf (`dirtyPaths` vollständig, ggf. `git diff` nach Build) protokollieren, statt die Ursache zu raten.

Lokal reproduzierbar (Stand Run-19-Branch): nach sauberem Commit und `npm run build` bleibt `dirty: false`, ohne `vercel.json` in `dirtyPaths` (siehe `public/build-provenance.json` am Abnahme-SHA).

Auf Vercel kann die **zweite** Provenance-Generierung nach `next build` trotzdem `dirty: true` melden, wenn der Build andere **getrackte** Dateien verändert. Dann gelten nur die **tatsächlich gelisteten** `dirtyPaths` — keine automatische Freigabe.

Lokal (sauberer App-Code-Checkout, nur Build-Artefakte unten) ist `dirty` nach abgeschlossenem `npm run build` in der Regel `false`.

Abnahme bindet weiterhin: Repo-HEAD = `build-provenance.json` = UI-Marker `#speicherpilot-build-provenance`.
