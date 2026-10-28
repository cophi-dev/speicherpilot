# SpeicherPilot

**battery storage & grid connection planner**

Public briefing for Germany’s battery storage (BESS) and the grid around it. The live page shows how much power the country is generating and using right now, how that balance moves through the day, and what a storage fleet could absorb or cover. Figures that look like money are model estimates with the assumptions written next to them.

Live site: [https://www.speicherpilot.app](https://www.speicherpilot.app)

## What it does

- **Live snapshot** — domestic generation, demand, and net position (generation − load) for the latest Energy-Charts quarter-hour where generation is actually published.
- **Day, week, and month profile** — quarter-hour structural surplus and deficit, fleet state of charge, and an optional simulated BESS on the same series.
- **Annual model estimate** — a P90 “balanced” size from the trailing year, plus a simplified throughput economics figure. This is deterministic. It is not an LLM narrative and not a forecast or a quote.
- **Project map** — public storage projects in Germany (MaStR-derived snapshot, with an optional live overlay).
- **Example presets** — generic nameplate packs for sizing experiments. They are not a vendor catalog.

A later step will add a site calculator and a grid-connection check. Those routes are not in this build.

## Data sources

| Source | Used for |
|--------|----------|
| [Energy-Charts](https://api.energy-charts.info) / Fraunhofer ISE | `total_power` (generation, load, residual load, renewable share) and `installed_power` (battery fleet) |
| [Netztransparenz](https://www.netztransparenz.de) | Optional designated curtailment and redispatch prices when API credentials are configured |
| [Marktstammdatenregister (MaStR)](https://www.marktstammdatenregister.de) | Storage-project locations in the map snapshot (`npm run data:mastr`) |
| [SimBench](https://simbench.de) `1-MV-semiurb--0-no_sw`, ODbL 1.0 | Precomputed teaching-grid scenarios on `/netz` (`npm run data:netz`, Python, not part of the Next build) |

Energy-Charts often publishes load one or two quarter-hours before generation. The live card waits for a timestamp where generation is numeric. If generation is missing entirely, the card shows “no data” instead of 0 GW and a deficit equal to load.

## Methodology

- **Live net position:** domestic generation minus load at one shared quarter-hour. Domestic generation is the sum of plant series, excluding load, residual load, renewable-share percentages, cross-border trading, and pumped-storage consumption. Alignment lives in `lib/realtimeSystemSnapshot.ts`.
- **Profile net:** sum of (generation − load) over published quarter-hours in the selected Berlin window. Slots without residual load are dropped, so a load-only tail does not enter the chart.
- **Simulated storage:** greedy quarter-hour walk. Structural surplus charges up to power and energy limits; deficit discharges. Curtailment, when present, adds charge opportunity and does not rewrite the published net trace. See `doc/product-intent.md`.
- **Annual size:** P90 of modeled daily energy and power over the trailing year (`computeLogicalBessRecommendation`).
- **Euro figures:** `computeEconomics` throughput model — nameplate MWh × full-cycle equivalents/day × 365 × round-trip efficiency × a blended €/MWh spread, minus an OPEX fraction of CAPEX. The public annual block states those assumptions. It is not dispatch revenue and not observed cashflow.

## Limitations

- Not a forecast, a grid-connection study, or investment advice.
- Generation and load are national aggregates, not a specific substation.
- The economics model scales linearly with nameplate energy. A national P90 size produces a national-scale euro figure. Read it only with the assumption list.
- Netztransparenz data is absent unless credentials are set, so curtailment is often missing.
- MaStR coverage depends on the checked-in snapshot.
- The interface is still mixed German/English. A full English UI is a later step. Dates follow the selected language.

## Local development

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The homepage runs with no environment variables.

Optional `.env.local` keys (never commit them; `.env*` is gitignored):

- `NEXT_PUBLIC_SITE_URL` — canonical origin for metadata
- `NETZTRANSPARENZ_CLIENT_ID` / `NETZTRANSPARENZ_CLIENT_SECRET` — curtailment and redispatch
- `AI_PROVIDER`, `AI_MODEL`, `XAI_API_KEY` or `OPENAI_API_KEY` — assessment chat, daily story, news curation
- `MORNING_X_POST_ENABLED=1` plus `TWITTER_*` or `X_*` — manual X post only (see below)

## Tests

```bash
npm test
npm run lint
```

Jest covers the live-snapshot alignment (`lib/realtimeSystemSnapshot.test.ts`, `lib/energyChartsApi.test.ts`), the annual model copy, and date labels. Playwright is a dependency of the manual morning script, not of CI.

## Morning post to X

`npm run morning:x` can draft a chart screenshot and post it with `twitter-api-v2`. Nothing in this repository’s CI, GitHub Actions, or Vercel config invokes it (there is no `vercel.json` cron and no workflow). The script refuses to post unless `MORNING_X_POST_ENABLED=1` is set in the environment for that manual run. `--dry-run` still writes a local preview without posting.

## Docs

KPI definitions: [doc/product-intent.md](doc/product-intent.md).
