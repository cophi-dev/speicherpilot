"use client";

import Link from "next/link";
import { Suspense, useMemo, type CSSProperties } from "react";

import { RangLeiste } from "@/components/home/RangLeiste";
import { FleetScrollRestore } from "@/components/home/FleetScrollRestore";
import { KnotenTagLink } from "@/components/knoten/KnotenTagLink";
import { TagesvorlageModelBox } from "@/components/home/TagesvorlageModelBox";
import { TagDayNav } from "@/components/home/TagDayNav";
import { TagSystemChapter } from "@/components/home/TagSystemChapter";
import { TagChapter } from "@/components/home/TagChapter";
import { TagSoGerechnet, type TagFleetSoGerechnetExtra } from "@/components/home/TagSoGerechnet";
import { formatDeGw, insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { tagSurplusLine } from "@/lib/kopfTagCopy";
import type { AuffaelligkeitResult } from "@/lib/auffaelligkeit";
import { kopfMetric, type TagesKennzahlRecord, weekdayLabelDe } from "@/lib/auffaelligkeit";
import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { weekdayShort, formatBerlinDayLabel } from "@/lib/dayRingStory";
import { barValue, kopfHero } from "@/lib/kopfHero";
import { formatQuantity } from "@/lib/formatQuantity";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { nationalFleetMonthAvailable, type NationalFleetFactor, type NationalFleetStrategyUi } from "@/lib/nationalMonthFleetModel";
import { MarktInsightsBlock } from "@/components/home/MarktInsightsBlock";
import { StartKarteSektion } from "@/components/home/StartKarteSektion";
import type { StartKartePreviewData } from "@/lib/bessKarte3d/types";
import type { MarktInsight } from "@/lib/marktInsights";
import { formatPreisSpanne, type PreisTick } from "@/lib/preisFenster";
import { SITE_MAIN_NAV } from "@/lib/siteNav";
import type { StartHeroV2Model } from "@/lib/startHeroV2";
import type { ResidualDay } from "@/lib/windSolarResidual";

function kopfDataStand(dayKey: string, todayKey: string, liveStand: string): string {
  if (dayKey === prevBerlinDateKey(todayKey)) {
    return "06:00";
  }
  return liveStand;
}

function PreisSpanneValue({ value }: { value: string }) {
  const parts = value.split(" bis ");
  if (parts.length !== 2) {
    return <p className="v4-preis-value num">{value}</p>;
  }
  return (
    <p className="v4-preis-value num">
      <span className="v4-preis-chunk">{parts[0]}</span>
      {" bis "}
      <span className="v4-preis-chunk">{parts[1]}</span>
    </p>
  );
}

export function AuffaelligkeitKopf({
  dayKey,
  todayKey,
  dataStand,
  result,
  records,
  kickerPrefix = "Gestern",
  hideTagLink = false,
  leitfrage,
  startHero = null,
  isStartSurface = false,
}: {
  dayKey: string;
  todayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  kickerPrefix?: string;
  hideTagLink?: boolean;
  leitfrage?: string;
  startHero?: StartHeroV2Model | null;
  isStartSurface?: boolean;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  const winner = result.kind === "metric" ? kopfMetric(records, dayKey) : null;
  const metricKey = result.kind === "metric" ? result.key : null;
  const stand = kopfDataStand(dayKey, todayKey, dataStand);
  const kicker = `${kickerPrefix} · ${weekdayShort(dayKey, "de")}, ${formatBerlinDayLabel(dayKey)} · Datenstand ${stand}`;
  const dayLabel = formatBerlinDayLabel(dayKey);
  const isTagPage = kickerPrefix === "Tag";
  const isYesterday = dayKey === prevBerlinDateKey(todayKey);

  const seriePresentation = useMemo(() => {
    if (result.kind !== "serie" || !record) {
      return null;
    }
    const index = records.findIndex((r) => r.dateKey === dayKey);
    const lastSurplus = [...records.slice(0, index + 1)].reverse().find((d) => d.surplusGwh >= 0.05);
    const slice = records.slice(Math.max(0, index - 30), index + 1);
    const bars = slice.map((r) => ({
      dateKey: r.dateKey,
      value: r.surplusGwh >= 0.05 ? r.surplusGwh : 0,
      highlight: r.dateKey === dayKey,
      record: false,
      zero: r.surplusGwh < 0.05,
    }));
    const baseSubline = lastSurplus
      ? `Zuletzt lagen Wind und Sonne am ${weekdayLabelDe(lastSurplus.dateKey)} bundesweit über dem Verbrauch.`
      : "Wind und Sonne blieben unter dem Verbrauch.";
    const peakContext =
      !isStartSurface && record.eveningPeakGw != null && record.eveningPeakAt
        ? insertDisplayUnitNbsp(
            ` Die Abendspitze der Restlast (ab 17 Uhr) erreichte ${formatDeGw(record.eveningPeakGw, 1)} (${record.eveningPeakAt} Uhr). Speicher fahren in diesem Regime über Preis-Spreads und gegen Lastspitzen, nicht aus nationalem EE-Überschuss.`,
          )
        : "";
    return {
      h1: `${record.dryStreak}. Tag in Folge ohne Überschuss`,
      subline: `${baseSubline}${peakContext}`,
      hero: {
        value: String(record.dryStreak),
        unit: "Tage",
        kernLabel: "ohne Überschuss",
      },
      bars,
    };
  }, [dayKey, isStartSurface, record, records, result.kind]);

  const metricHero =
    record && winner && metricKey === winner.key && !seriePresentation ? kopfHero(record, winner) : null;

  const hero = useMemo(() => {
    if (seriePresentation) {
      return seriePresentation.hero;
    }
    return metricHero;
  }, [metricHero, seriePresentation]);

  const bars = useMemo(() => {
    if (seriePresentation) {
      return seriePresentation.bars;
    }
    if (!metricKey) {
      return [];
    }
    const idx = records.findIndex((r) => r.dateKey === dayKey);
    if (idx < 0) {
      return [];
    }
    const slice = records.slice(Math.max(0, idx - 30), idx + 1);
    return slice.map((r) => {
      const value = barValue(r, metricKey);
      const highlight = r.dateKey === dayKey;
      const w = kopfMetric(records, r.dateKey);
      const recordBar = w?.rank === 1 && w.key === metricKey && !highlight;
      return { dateKey: r.dateKey, value, highlight, record: recordBar };
    });
  }, [dayKey, metricKey, records, seriePresentation]);

  const rawKopfH1 = seriePresentation?.h1 ?? result.kopfH1;
  const rawKopfSubline = seriePresentation?.subline ?? result.kopfSubline;
  const kopfSubline = useMemo(() => {
    if (!isStartSurface || !record || record.surplusGwh >= 0.05 || result.kind !== "metric") {
      return rawKopfSubline;
    }
    const noSurplusSentence =
      record.dryStreak >= 2
        ? `Kein Überschuss, ${record.dryStreak}. Tag in Folge.`
        : "Kein Überschuss aus Wind und Sonne.";
    if (metricKey === "evening_peak_gw" && (record.peakCutGw ?? 0) < 0.05 && result.subline) {
      const trimmed = rawKopfSubline.replace(result.subline, "").trim();
      return trimmed ? `${trimmed} ${noSurplusSentence}` : noSurplusSentence;
    }
    if (!rawKopfSubline.includes("Überschuss")) {
      return rawKopfSubline ? `${rawKopfSubline} ${noSurplusSentence}` : noSurplusSentence;
    }
    return rawKopfSubline;
  }, [isStartSurface, metricKey, rawKopfSubline, record, result.kind, result.subline]);
  const kopfH1 = isTagPage
    ? `${weekdayShort(dayKey, "de")}, ${dayLabel} — ${rawKopfH1}`
    : rawKopfH1;

  const priceSpreadLabel = isTagPage
    ? `Spanne am ${dayLabel}`
    : isYesterday
      ? "Spanne gestern"
      : `Spanne am ${dayLabel}`;
  const priceDayLabel = isTagPage
    ? `Börsenpreis am ${dayLabel}`
    : isYesterday
      ? "Börsenpreis gestern"
      : `Börsenpreis am ${dayLabel}`;

  const priceLine =
    record?.pmin != null && record.pmax != null && metricKey !== "spread"
      ? {
          label: priceDayLabel,
          value: formatPreisSpanne(record.pmin, record.pmax),
        }
      : metricKey === "spread" && record?.spread != null
        ? {
            label: priceSpreadLabel,
            value: formatPreisSpanne(record.pmin ?? 0, record.pmax ?? 0),
          }
        : null;

  const methodikLink = (
    <Link href="/methodik#auffaelligkeit" className="v4-text-link">
      Wie die Auffälligkeit gewählt wird
    </Link>
  );

  const rangMobileSummary = useMemo(() => {
    if (!isTagPage || !metricHero || metricKey !== "evening_peak_gw" || record?.eveningPeakGw == null) {
      return undefined;
    }
    const rank = metricHero.rankLabel?.match(/Platz (\d+)/)?.[1];
    const platz = rank ? `Platz ${rank}` : metricHero.rankLabel;
    return `Abendspitze Restlast · 31 Tage · gestern ${formatDeGw(record.eveningPeakGw, 1)} (${platz})`;
  }, [isTagPage, metricHero, metricKey, record?.eveningPeakGw]);

  const useStartHeroV2 = isStartSurface && Boolean(startHero);
  const startLeitfrage = useStartHeroV2 ? startHero!.question : leitfrage;

  return (
    <section
      className={
        isTagPage
          ? "v4-kopf v4-kopf--tag"
          : useStartHeroV2
            ? "v4-kopf v4-kopf--start"
            : "v4-kopf"
      }
      aria-labelledby="auffaelligkeit-h1"
    >
      <div className="v4-kopf-inner v4-content">
        <p className="v4-kicker num">{kicker}</p>
        {startLeitfrage ? (
          <p id="tages-leitfrage" className="v4-leitfrage">
            {startLeitfrage}
          </p>
        ) : null}
        {useStartHeroV2 && startHero ? (
          <>
            <h1 id="auffaelligkeit-h1" className="v4-h1">
              {startHero.answerSentence}
            </h1>
            <div className="v4-kopf-hero">
              <div className="v4-kopf-zahl">
                {startHero.bigNumber ? (
                  <p
                    className="v4-riesenzahl num"
                    aria-hidden="true"
                    style={
                      {
                        "--v4-ries-ch": String(
                          startHero.bigNumber.value.length +
                            Math.ceil(startHero.bigNumber.unit.length * 0.45),
                        ),
                      } as CSSProperties
                    }
                  >
                    {startHero.bigNumber.value}
                    <span className="v4-riesenzahl-unit">{startHero.bigNumber.unit}</span>
                  </p>
                ) : null}
                <div className="v4-kern-row">
                  <span>{startHero.kernLine}</span>
                </div>
                <p className="v4-subline v4-start-context">{startHero.contextLine}</p>
                <div className="v4-kopf-links">
                  {!hideTagLink ? (
                    <Link href={`/tag/${dayKey}`} className="v4-text-link">
                      Tag ansehen →
                    </Link>
                  ) : null}
                  <Link href="/methodik#quellen" className="v4-text-link">
                    Methodik
                  </Link>
                </div>
              </div>
              {bars.length > 0 ? (
                <RangLeiste
                  bars={bars}
                  metricLabel={seriePresentation ? "Überschuss je Tag" : hero?.kernLabel ?? "31-Tage-Verlauf"}
                  rankLabel={seriePresentation ? "31 Tage · Überschuss je Tag" : metricHero?.rankLabel ?? undefined}
                />
              ) : null}
            </div>
          </>
        ) : isTagPage ? (
          <>
            <h1 id="auffaelligkeit-h1" className="v4-h1">
              {kopfH1}
            </h1>
            {hero ? (
              <div className="v4-kopf-hero">
                <div className="v4-kopf-zahl">
                  <p
                    className="v4-riesenzahl num"
                    aria-hidden="true"
                    style={
                      {
                        "--v4-ries-ch": String(hero.value.length + Math.ceil(hero.unit.length * 0.45)),
                      } as CSSProperties
                    }
                  >
                    {hero.value}
                    <span className="v4-riesenzahl-unit">{hero.unit}</span>
                  </p>
                  <div className="v4-kern-row">
                    <span>{hero.kernLabel}</span>
                    {metricHero?.rankLabel ? <span>{metricHero.rankLabel}</span> : null}
                  </div>
                </div>
                <RangLeiste
                  bars={bars}
                  metricLabel={hero.kernLabel}
                  rankLabel={seriePresentation ? "Überschuss je Tag" : undefined}
                />
              </div>
            ) : null}
            {priceLine ? (
              <div className="v4-preis-block">
                <p className="v4-preis-label num">{priceLine.label}</p>
                <PreisSpanneValue value={priceLine.value} />
              </div>
            ) : null}
            {kopfSubline ? <p className="v4-subline">{kopfSubline}</p> : null}
            <div className="v4-kopf-links">
              {methodikLink}
            </div>
          </>
        ) : (
          <>
            <div className="v4-kopf-intro">
              <h1 id="auffaelligkeit-h1" className="v4-h1">
                {kopfH1}
              </h1>
              {kopfSubline ? (
                <div className="v4-kopf-subgrid">
                  <p className="v4-subline">{kopfSubline}</p>
                  {priceLine ? (
                    <div className="v4-preis-block">
                      <p className="v4-preis-label num">{priceLine.label}</p>
                      <PreisSpanneValue value={priceLine.value} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {hero ? (
              <div className="v4-kopf-hero">
                <div className="v4-kopf-zahl">
                  <p
                    className="v4-riesenzahl num"
                    aria-hidden="true"
                    style={
                      {
                        "--v4-ries-ch": String(hero.value.length + Math.ceil(hero.unit.length * 0.45)),
                      } as CSSProperties
                    }
                  >
                    {hero.value}
                    <span className="v4-riesenzahl-unit">{hero.unit}</span>
                  </p>
                  <div className="v4-kern-row">
                    <span>{hero.kernLabel}</span>
                    {metricHero?.rankLabel ? <span>{metricHero.rankLabel}</span> : null}
                  </div>
                  <div className="v4-kopf-links">
                    {!hideTagLink ? (
                      <Link href={`/tag/${dayKey}`} className="v4-text-link">
                        Tag ansehen →
                      </Link>
                    ) : null}
                    {methodikLink}
                  </div>
                </div>
                <RangLeiste
                  bars={bars}
                  metricLabel={hero.kernLabel}
                  rankLabel={seriePresentation ? "Überschuss je Tag" : metricHero?.rankLabel ?? undefined}
                  mobileSummary={rangMobileSummary}
                />
              </div>
            ) : (
              <div className="v4-kopf-links v4-kopf-links-standalone">
                {!hideTagLink ? (
                  <Link href={`/tag/${dayKey}`} className="v4-text-link">
                    Tag ansehen →
                  </Link>
                ) : null}
                {methodikLink}
              </div>
            )}
          </>
        )}
        {isStartSurface ? (
          <p className="v4-footnote v4-kopf-footnote">
            Als messbarer Überschuss gilt 0,05 GWh oder mehr.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function TagPageV4({
  dayKey,
  todayKey,
  lastCompleteDayKey,
  dataStand,
  result,
  records,
  day,
  lastSurplusKey,
  dayOverview,
  fleetPowerGw,
  fleetEnergyGwh,
  fleetFactor,
  fleetStrategy,
  fleetDayNoWindSolarSurplus,
  preisTag = [],
  marktInsights = [],
  fleetSoGerechnet = null,
  startHero = null,
  startKarte = null,
  leitfrage,
  isStartSurface = false,
  children,
}: {
  dayKey: string;
  todayKey: string;
  lastCompleteDayKey: string;
  dataStand: string;
  result: AuffaelligkeitResult;
  records: TagesKennzahlRecord[];
  day: ResidualDay;
  lastSurplusKey: string | null;
  dayOverview: OverviewEvaluation | null;
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  fleetFactor?: NationalFleetFactor;
  fleetStrategy?: NationalFleetStrategyUi;
  fleetDayNoWindSolarSurplus?: boolean;
  preisTag?: PreisTick[];
  marktInsights?: MarktInsight[];
  simulatorTeaser?: import("@/lib/simulatorTeaser.types").Eps70TeaserUi | null;
  fleetSoGerechnet?: TagFleetSoGerechnetExtra | null;
  startHero?: StartHeroV2Model | null;
  startKarte?: StartKartePreviewData | null;
  leitfrage?: string;
  isStartSurface?: boolean;
  children?: React.ReactNode;
}) {
  const record = records.find((r) => r.dateKey === dayKey);
  if (!record) {
    return null;
  }
  const simulatorHref =
    SITE_MAIN_NAV.find((item) => item.label === "Simulator")?.href ?? "/kompromiss";
  return (
    <div className={isStartSurface ? "v4-start" : "v4-start is-tag-page"}>
      <Suspense fallback={null}>
        <FleetScrollRestore />
      </Suspense>
      {isStartSurface ? null : (
        <TagDayNav
          dayKey={dayKey}
          lastCompleteDayKey={lastCompleteDayKey}
          fleetFactor={fleetFactor}
          fleetStrategy={fleetStrategy}
        />
      )}
      <AuffaelligkeitKopf
        dayKey={dayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        result={result}
        records={records}
        kickerPrefix={isStartSurface ? "Gestern" : "Tag"}
        hideTagLink={!isStartSurface}
        leitfrage={leitfrage}
        startHero={isStartSurface ? startHero : null}
        isStartSurface={isStartSurface}
      />
      {isStartSurface ? (
        <>
          <div id="tagesverlauf">
            <TagChapter
              day={day}
              peakGw={record.eveningPeakGw ?? null}
              peakAt={record.eveningPeakAt ?? null}
              useTagDateHeading
              prices={preisTag}
              powerGw={fleetPowerGw}
              energyGwh={fleetEnergyGwh}
              surplusGwh={record.surplusGwh}
            />
          </div>
          {startKarte ? <StartKarteSektion data={startKarte} /> : null}
          <nav
            className="v4-content v4-start-links"
            aria-label="Weitere Ansichten"
            data-testid="start-linkzeile"
          >
            <Link href={`/tag/${lastCompleteDayKey}`} className="v4-text-link">
              Ganzer Tag
            </Link>
            <span className="v4-start-links-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/kompromiss" className="v4-text-link">
              Kompromiss
            </Link>
            <span className="v4-start-links-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/knoten" className="v4-text-link">
              Knoten
            </Link>
            <span className="v4-start-links-sep" aria-hidden="true">
              ·
            </span>
            <Link href={simulatorHref} className="v4-text-link">
              Simulator
            </Link>
            <span className="v4-start-links-sep" aria-hidden="true">
              ·
            </span>
            <Link
              href={marktInsights[0]?.methodikHref ?? "/methodik#insights"}
              className="v4-text-link"
            >
              Methodik
            </Link>
          </nav>
          <p className="v4-content v4-start-footnote num" data-testid="start-quellen-fussnote">
            Quelle: Energy-Charts / SMARD, CC BY 4.0 ·{" "}
            <Link
              href="/methodik#quellen"
              className="v4-text-link"
              aria-label="Methodik und Quellen"
            >
              Methodik
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          <div id="tagesverlauf">
            <TagChapter
              day={day}
              peakGw={record.eveningPeakGw ?? null}
              peakAt={record.eveningPeakAt ?? null}
              useTagDateHeading
              prices={preisTag}
              powerGw={fleetPowerGw}
              energyGwh={fleetEnergyGwh}
              surplusGwh={record.surplusGwh}
            />
          </div>
          <KnotenTagLink dayKey={dayKey} />
          <TagSystemChapter
            dayKey={dayKey}
            record={record}
            dayOverview={dayOverview}
            fleetPowerGw={fleetPowerGw}
            fleetEnergyGwh={fleetEnergyGwh}
            fleetDayNoWindSolarSurplus={fleetDayNoWindSolarSurplus}
            fleetFactor={fleetFactor}
            fleetStrategy={fleetStrategy}
            fleetSoGerechnet={fleetSoGerechnet}
          />
          {children}
          <TagSoGerechnet
            day={day}
            lastSurplusKey={lastSurplusKey}
            surplusLine={tagSurplusLine(record.surplusGwh ?? 0)}
            peakGw={record.eveningPeakGw ?? null}
            peakAt={record.eveningPeakAt ?? null}
            showFleetMonthBelow={nationalFleetMonthAvailable(dayKey.slice(0, 7)) && Boolean(children)}
            fleetStrategyBelow={fleetStrategy ?? null}
            priceLine={
              record.pmin != null && record.pmax != null
                ? formatPreisSpanne(record.pmin, record.pmax)
                : null
            }
            prices={preisTag}
            powerGw={fleetPowerGw}
            energyGwh={fleetEnergyGwh}
            dateLabel={formatBerlinDayLabel(dayKey)}
            surplusGwh={record.surplusGwh ?? 0}
            fleetExtra={fleetSoGerechnet}
          />
          <TagesvorlageModelBox />
          {marktInsights.length > 0 ? (
            <MarktInsightsBlock insights={marktInsights} layout="tag" />
          ) : null}
        </>
      )}
    </div>
  );
}
