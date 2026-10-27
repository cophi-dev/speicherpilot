"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GlossaryTip } from "@/components/GlossaryTip";
import { ModelChip } from "@/components/day-ring/ModelChip";
import { useLanguage, type AppLanguage } from "@/components/language-context";
import { ScenarioChart } from "@/components/szenarien/ScenarioChart";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  CORE_TO_OPTIMIZER,
  formatInputNumber,
  limitValueText,
  monthName,
  parseDecimal,
  queryFromRaw,
  rawFromQuery,
  roundToThousands,
  scenarioCopy,
  scenarioSeries,
  validateRaw,
  type FcaRaw,
} from "@/lib/fcaScenarios";
import { fcaTableSchema, type FcaForm, type FcaTable, type FcaYearKey } from "@/lib/fcaTableSchema";

const LOAD_ERROR = "Die Rechentabelle konnte nicht geladen werden. Bitte Seite neu laden.";

const MISSING: Array<{ id: string; tip?: "n-1" | "baukostenzuschuss" | "leistungspreis" | "fca" | "statisch-dynamisch"; tip2?: "leistungspreis"; de: string; en: string }> = [
  {
    id: "netz",
    tip: "n-1",
    de: "Netzseite fehlt ganz. Die Grenze ist eine Eingabe, keine Netzberechnung. Ein Netzmodell ist nur ein Konzept.",
    en: "The grid side is missing. The limit is an input, not a grid calculation. A grid model is only a concept.",
  },
  {
    id: "bkz",
    tip: "baukostenzuschuss",
    tip2: "leistungspreis",
    de: "Baukostenzuschuss und Leistungspreis fehlen. Ob eine Grenze Kosten senkt, rechnet das Modell nicht.",
    en: "Construction-cost contribution and demand charge are missing. The model does not calculate whether a limit lowers cost.",
  },
  {
    id: "agnes",
    de: "Netzentgelte fehlen. AgNes ist ein Entwurf, Stand 27.10.2026. Nicht beschlossen. Kein Tenor, kein Preis, kein Stichtag.",
    en: "Grid fees are missing. AgNes is a draft, as of 27 October 2026. Not decided. No operative part, no price, no cutoff date.",
  },
  {
    id: "haftung",
    tip: "statisch-dynamisch",
    de: "Haftung und Technik der Grenze fehlen. § 17 Abs. 2b Satz 3 Nr. 4 und 5 rechnet das Modell nicht.",
    en: "Liability and the technology of the limit are missing. The model does not calculate section 17 (2b), sentence 3, items 4 and 5.",
  },
  {
    id: "preis",
    de: "Preisnehmer. Ein großer Speicher verändert die Preise. Das Modell tut so, als wäre er klein.",
    en: "Price taker. A large battery moves prices. The model pretends it is small.",
  },
  {
    id: "vorschau",
    de: "Perfekte Vorschau, nur Day-Ahead. Intraday, Regelleistung, Unsicherheit und Verschleiß fehlen.",
    en: "Perfect foresight, day-ahead only. Intraday, balancing power, uncertainty and wear are missing.",
  },
  {
    id: "annahmen",
    de: "Feste Annahmen: Wirkungsgrad 85 %, Ladezustand 10–90 %, Start 50 %, dieselbe Grenze für Bezug und Einspeisung.",
    en: "Fixed assumptions: 85% efficiency, state of charge 10–90%, start at 50%, the same limit for withdrawal and feed-in.",
  },
  {
    id: "wartezeit",
    de: "Verzögerung ist eine Annahme. Wie lange ein Anschluss real dauert, steht hier nicht.",
    en: "Delay is an assumption. How long a connection really takes is not stated here.",
  },
  {
    id: "zeitwert",
    de: "Kein Zeitwert. Kein Diskontieren, keine Finanzierungskosten.",
    en: "No time value. No discounting, no financing cost.",
  },
];

export function SzenarienRechner({ table: given }: { table?: FcaTable | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [raw, setRaw] = useState<FcaRaw>(() => rawFromQuery(params, language));
  const [fetched, setFetched] = useState<FcaTable | null>(null);
  const [failedFetch, setFailedFetch] = useState(false);
  const table = given !== undefined ? given : fetched;
  const failed = given === null || (given === undefined && failedFetch);
  const validated = useMemo(() => validateRaw(raw), [raw]);
  const series = useMemo(() => (table && validated.inputs ? scenarioSeries(table, validated.inputs) : null), [table, validated.inputs]);
  const copy = series && validated.inputs ? scenarioCopy(validated.inputs, series, language) : null;
  const [live, setLive] = useState(copy?.result ?? "");
  const queryKey = params.toString();
  const urlTimer = useRef<number | null>(null);

  useEffect(() => {
    if (given !== undefined) {
      return;
    }
    let cancel = false;
    fetch("/fca/fca-table.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("load");
        }
        return response.json();
      })
      .then((body: unknown) => {
        const parsed = fcaTableSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("schema");
        }
        if (!cancel) {
          setFetched(parsed.data);
        }
      })
      .catch(() => {
        if (!cancel) {
          setFailedFetch(true);
        }
      });
    return () => {
      cancel = true;
    };
  }, [given]);

  useEffect(() => {
    const fieldErrors = [validated.errors.limit, validated.errors.power, validated.errors.ratio, validated.errors.delay, validated.errors.energy]
      .filter((item, index, list) => item && list.indexOf(item) === index)
      .join(" ");
    const sentence = copy?.result ?? (fieldErrors || (failed ? LOAD_ERROR : ""));
    const handle = window.setTimeout(() => setLive(sentence), 150);
    return () => window.clearTimeout(handle);
  }, [copy?.result, validated.errors, failed]);

  function commit(next: FcaRaw) {
    setRaw(next);
    const query = queryFromRaw(next);
    if (query === queryKey) {
      return;
    }
    if (urlTimer.current !== null) {
      window.clearTimeout(urlTimer.current);
    }
    urlTimer.current = window.setTimeout(() => {
      router.replace(`${pathname}?${query}`, { scroll: false });
    }, 150);
  }

  function patch(partial: Partial<FcaRaw>) {
    commit({ ...raw, ...partial });
  }

  const power = parseDecimal(raw.power);
  const limit = parseDecimal(raw.limit);
  const percent = power && power > 0 && limit !== null ? Math.round((limit / power) * 100) : 50;
  const sliderPercent = Math.min(100, Math.max(0, percent));
  const valueText = power && power > 0 && limit !== null && limit >= 0 ? limitValueText(limit, power, language) : tx("Grenze nicht gesetzt", "Limit not set");
  const errors = validated.errors;
  const showResult = Boolean(copy && series && validated.inputs);
  const assumptionError = Boolean(errors.power || errors.energy || errors.ratio);
  const [assumptionsHeld, setAssumptionsHeld] = useState(false);
  const assumptionsOpen = assumptionError || assumptionsHeld;
  const frontErrors = [errors.power, errors.energy, errors.ratio, errors.limit, errors.delay].filter(
    (item, index, list): item is string => Boolean(item) && list.indexOf(item) === index
  );
  const hero = failed
    ? LOAD_ERROR
    : copy?.hero ?? tx("Szenarien rechnen für einen Speicher an einem Netzknoten.", "Run scenarios for one battery at one grid node.");

  return (
    <div className="szenarien">
      <section className="day-hero szen-hero" aria-labelledby="szen-title">
        <div className="day-hero-inner">
          <p className="day-kicker">
            {tx("Szenarien rechnen", "Run scenarios")} <ModelChip label={tx("Prototyp", "Prototype")} />
          </p>
          <h1 id="szen-title">{hero}</h1>
          <p className="szen-disclaimer">
            {copy?.disclaimer ??
              tx(
                "Das ist eine Modellrechnung. Es ist keine Prüfung des Netzanschlusses und keine Aussage, ob der Netzknoten den Speicher aufnehmen kann. Das beurteilt der Netzbetreiber.",
                "This is a model calculation. It is not a check of the grid connection and not a statement about whether the node can take the battery. The grid operator decides that."
              )}
          </p>
        </div>
      </section>
      <div className="day-paper">
        <div className="day-hero-inner szen-body">
          <form
            className="szen-form"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <LimitField
              raw={raw}
              language={language}
              error={errors.limit}
              sliderPercent={sliderPercent}
              shownPercent={percent}
              valueText={valueText}
              onLimit={(value) => patch({ limit: value })}
              onPercent={(nextPercent) => {
                if (power === null || power <= 0) {
                  return;
                }
                const next = (power * nextPercent) / 100;
                patch({ limit: formatInputNumber(next, language) });
              }}
            />
            <fieldset className="szen-field">
              <legend>
                {tx("Form der Grenze", "Shape of the limit")} <GlossaryTip id="statisch-dynamisch" language={language} />
              </legend>
              <div className="szen-choices" role="radiogroup" aria-label={tx("Form der Grenze", "Shape of the limit")}>
                {(
                  [
                    ["fest", tx("fest, ganztägig", "fixed, all day")],
                    ["abend", tx("nur Abendfenster 17–21 Uhr", "evening window only, 17:00–21:00")],
                    ["mittag", tx("nur Mittagsfenster 10–16 Uhr", "midday window only, 10:00–16:00")],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="szen-choice">
                    <input type="radio" name="form" value={id} checked={raw.form === id} onChange={() => patch({ form: id as FcaForm })} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <NumberField
              id="szen-delay"
              label={tx("Verzögerung", "Delay")}
              suffix={tx("Monate", "months")}
              value={raw.delay}
              error={errors.delay}
              min={0}
              max={48}
              onChange={(value) => patch({ delay: value })}
            />
          </form>

          <p className="szen-assumption-line">
            {assumptionLine(raw, language)} {tx("Beispielgröße, nicht die echten Werte von Bollingstedt.", "Example size, not the real Bollingstedt figures.")}
          </p>
          <details
            id="szen-assumptions"
            className="szen-fold"
            open={assumptionsOpen}
            onToggle={(event) => {
              if (!assumptionError) {
                setAssumptionsHeld(event.currentTarget.open);
              }
            }}
          >
            <summary
              onClick={(event) => {
                if (assumptionError) {
                  event.preventDefault();
                }
              }}
            >
              {tx("Annahmen ändern", "Change assumptions")}
            </summary>
            <div className="szen-assumptions">
              <NumberField
                id="szen-power"
                label={tx("Speicherleistung", "Battery power")}
                suffix="MW"
                value={raw.power}
                error={errors.power}
                describedBy={errors.ratio ? "szen-ratio-error" : undefined}
                onChange={(value) => patch({ power: value })}
              />
              <NumberField
                id="szen-energy"
                label={tx("Kapazität", "Capacity")}
                suffix="MWh"
                value={raw.energy}
                error={errors.energy && errors.energy !== errors.power ? errors.energy : undefined}
                describedBy={
                  errors.power && errors.energy === errors.power ? "szen-power-error" : errors.ratio ? "szen-ratio-error" : undefined
                }
                onChange={(value) => patch({ energy: value })}
              />
              {errors.ratio ? (
                <p id="szen-ratio-error" className="szen-error" role="alert">
                  {errors.ratio}
                </p>
              ) : null}
              <label className="szen-field" htmlFor="szen-start">
                <span>{tx("Startmonat", "Start month")}</span>
                <select id="szen-start" value={raw.startMonth} onChange={(event) => patch({ startMonth: Number(event.target.value) })}>
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {monthName(index + 1, language)}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="szen-field">
                <legend>{tx("Referenzpreisjahr", "Reference price year")}</legend>
                <div className="szen-choices">
                  {(
                    [
                      ["12m", tx("letzte 12 Monate (bis 26.10.2026)", "last 12 months (to 26 Oct 2026)")],
                      ["2025", tx("Kalenderjahr 2025", "calendar year 2025")],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="szen-choice">
                      <input type="radio" name="jahr" value={id} checked={raw.year === id} onChange={() => patch({ year: id as FcaYearKey })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <ul className="szen-fixed">
                <li>{tx("Wirkungsgrad 85 % hin und zurück, je Richtung die Wurzel daraus.", "85% round trip, the square root in each direction.")}</li>
                <li>{tx("Der Speicher startet jeden Tag bei 50 % und endet nicht darunter. Ladezustand 10–90 %.", "The battery starts each day at 50% and does not end below that. State of charge 10–90%.")}</li>
                <li>{tx("Nur Day-Ahead. Betrachtungszeitraum 36 Monate. Die Grenze gilt für Bezug und Einspeisung gleich.", "Day-ahead only. The view covers 36 months. The limit is the same for withdrawal and feed-in.")}</li>
                <li>{tx("Negative Preise sind erlaubt. Laden bei einem negativen Preis bringt im Modell Erlös.", "Negative prices are allowed. Charging at a negative price earns revenue in the model.")}</li>
                <li>{tx("2025: bis 30.09.2025 stündliche Preise, je vier Viertelstunden gleich, danach Viertelstunden.", "2025: hourly prices until 30 Sep 2025, four equal quarter-hours, then quarter-hours.")}</li>
              </ul>
            </div>
          </details>

          {frontErrors.length > 0 ? (
            <div className="szen-front-errors">
              {frontErrors.map((text) => (
                <p key={text} className="szen-error szen-front-error">
                  {text}
                </p>
              ))}
            </div>
          ) : null}
          <p className="szen-result">{showResult && copy ? copy.result : null}</p>
          <div className="sr-only" aria-live="polite">
            {live}
          </div>

          {failed ? (
            <p className="szen-calm" role="status">
              {LOAD_ERROR}
            </p>
          ) : null}

          {!failed && !showResult ? (
            <p className="szen-calm" role="status">
              {tx("Für diese Eingabe gibt es keine Rechnung. Die Hinweise stehen am Feld.", "There is no calculation for this input. The notes are on the field.")}
            </p>
          ) : null}

          {showResult && copy && series && validated.inputs ? (
            <>
              <div className="szen-cards">
                <article className="szen-card szen-card-a">
                  <h2>{tx("Anschluss voll", "Full connection")}</h2>
                  <p className="szen-figure">
                    <span className="szen-figure-num">100</span>
                    <span className="szen-unit">{"\u00A0%"}</span>
                  </p>
                  <p>{copy.cardA}</p>
                </article>
                <article className="szen-card szen-card-b">
                  <h2>
                    {tx("flexible Anschlussvereinbarung", "flexible connection agreement")} <GlossaryTip id="fca" language={language} />
                  </h2>
                  <p className="szen-figure">
                    <span className="szen-figure-num">{formatQuantity(Math.round(series.remainPct), language, 0)}</span>
                    <span className="szen-unit">{"\u00A0%"}</span>
                  </p>
                  <p>{copy.cardB}</p>
                </article>
                <article className="szen-card szen-card-c">
                  <h2>{tx("verzögerter Anschluss", "delayed connection")}</h2>
                  <p className="szen-figure">
                    <span className="szen-figure-num">{formatQuantity(validated.inputs.delayMonths, language, 0)}</span>
                    <span className="szen-unit">
                      {"\u00A0"}
                      {validated.inputs.delayMonths === 1 ? tx("Monat", "month") : tx("Monate", "months")}
                    </span>
                  </p>
                  <p>{copy.cardC}</p>
                </article>
              </div>
              <ScenarioChart
                percentA={series.percentA}
                percentB={series.percentB}
                percentC={series.percentC}
                breakevenMonth={series.breakevenMonth}
                label={copy.chart}
                caption={tx(
                  "Prozent eines Jahres Modellerlös von A, über 36 Monate. A durchgezogen, B gestrichelt, C gepunktet.",
                  "Percent of one year of A’s model revenue, over 36 months. A solid, B dashed, C dotted."
                )}
                neverText={
                  series.cumulativeB.every((value) => Math.abs(value) < 1e-4) && series.cumulativeC.every((value) => Math.abs(value) < 1e-4)
                    ? tx("B und C erlösen nichts. Kein Gleichstand.", "B and C earn nothing. No crossover.")
                    : Math.abs(series.lossPct) < 1e-6 && validated.inputs.delayMonths > 0
                      ? copy.edges.at(-1) ?? null
                      : null
                }
                missText={tx("nicht innerhalb von 36 Monaten", "not within 36 months")}
                markLabel={tx("Gleichstand", "Crossover")}
              />
              <details className="szen-fold">
                <summary>{tx("Tabelle, 36 Monate", "Table, 36 months")}</summary>
                <div className="szen-table-wrap">
                  <table className="szen-table">
                    <caption>{tx("Kumulierter Modellerlös in Prozent eines Jahres von A.", "Cumulative model revenue as a percent of one year of A.")}</caption>
                    <thead>
                      <tr>
                        <th>{tx("Monat", "Month")}</th>
                        <th>A</th>
                        <th>B</th>
                        <th>C</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.percentA.slice(1).map((value, index) => (
                        <tr key={index + 1}>
                          <th>{index + 1}</th>
                          <td>{formatQuantity(value, language, 0)}{"\u00A0%"}</td>
                          <td>{formatQuantity(series.percentB[index + 1] ?? 0, language, 0)}{"\u00A0%"}</td>
                          <td>{formatQuantity(series.percentC[index + 1] ?? 0, language, 0)}{"\u00A0%"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className="szen-fold">
                <summary>
                  {tx("Euro, Modellschätzung", "Euro, model estimate")} <GlossaryTip id="modellschaetzung" language={language} />
                </summary>
                <div className="szen-euro">
                  <p>
                    {tx(
                      "Das ist die obere Modellgrenze mit perfekter Preisvorschau und mehreren Zyklen. Es ist nicht dasselbe Modell wie bei den Beispieltagen und kein Jahreserlös.",
                      "This is the upper model bound with perfect foresight and several cycles. It is not the same model as the example days and it is not an annual revenue."
                    )}
                  </p>
                  <p>
                    {tx(
                      `Vergleich nur am Beispielspeicher 103,5 MW / 238,5 MWh, letzte 12 Monate, volle Leistung. Die direkte Rechnung ergibt ${formatQuantity(EXAMPLE_OPT, language, 0)} €, Modellschätzung, obere Modellgrenze. Der vorsichtige Kern der Beispieltage ergibt ${formatQuantity(roundToThousands(EXAMPLE_CORE), language, 0)} €, Modellschätzung. Der Optimierer liegt ${formatQuantity(CORE_TO_OPTIMIZER, language, 2)}-mal darüber. Das gilt nur für dieses Beispiel und ist kein Umrechnungsfaktor für Ihre Eingabe.`,
                      `Comparison only for the example battery of 103.5 MW / 238.5 MWh, the last 12 months, full power. The direct calculation is ${formatQuantity(EXAMPLE_OPT, language, 0)} €, a model estimate, the upper model bound. The cautious core of the example days is ${formatQuantity(roundToThousands(EXAMPLE_CORE), language, 0)} €, a model estimate. The optimiser sits ${formatQuantity(CORE_TO_OPTIMIZER, language, 2)} times above it. That holds only for this example and is not a conversion factor for your input.`
                    )}
                  </p>
                  <p>
                    {tx(
                      "Jahr A in der Tabelle ist nicht diese direkte Summe. Die Tabelle interpoliert und rundet auf Tausend. Für den Beispielspeicher wird daraus 9.689.000 €, Modellschätzung. Der Abstand ist der Interpolationsfehler.",
                      "Year A in the table is not that direct sum. The table interpolates and rounds to thousands. For the example battery that becomes €9,689,000, a model estimate. The gap is the interpolation error."
                    )}
                  </p>
                  <EuroTable language={language} series={series} />
                </div>
              </details>
            </>
          ) : null}

          <section className="szen-missing" aria-labelledby="szen-missing-title">
            <h2 id="szen-missing-title">{tx("Was hier fehlt", "What is missing here")}</h2>
            <p className="szen-missing-lead">
              <GlossaryTip id="n-1" language={language} />{" "}
              {tx("Netzseite fehlt.", "The grid side is missing.")}{" "}
              <GlossaryTip id="baukostenzuschuss" language={language} /> <GlossaryTip id="leistungspreis" language={language} />{" "}
              {tx(
                "Baukostenzuschuss, Leistungspreis und Netzentgelte fehlen. AgNes ist ein Entwurf, Stand 27.10.2026.",
                "Construction-cost contribution, demand charge and grid fees are missing. AgNes is a draft, as of 27 October 2026."
              )}{" "}
              <GlossaryTip id="statisch-dynamisch" language={language} />
            </p>
            <details className="szen-fold">
              <summary>{tx("Alle Lücken", "Every gap")}</summary>
              <ul>
                {MISSING.map((item) => (
                  <li key={item.id}>
                    {item.tip ? <GlossaryTip id={item.tip} language={language} /> : null}
                    {item.tip2 ? <GlossaryTip id={item.tip2} language={language} /> : null} {tx(item.de, item.en)}
                  </li>
                ))}
              </ul>
            </details>
          </section>
          <p className="szen-method">
            <a href="/methodik#szenarien">{tx("So ist gerechnet", "How this is calculated")}</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_OPT = 9_712_347;
const EXAMPLE_CORE = 3_778_603;

function euro(value: number, language: AppLanguage): string {
  return `${formatQuantity(roundToThousands(value), language, 0)} €, Modellschätzung, obere Modellgrenze`;
}

function EuroTable({ language, series }: { language: AppLanguage; series: NonNullable<ReturnType<typeof scenarioSeries>> }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const rows = [
    [tx("Jahr A, Anschluss voll", "Year A, full connection"), series.yearAEur],
    [tx("Jahr B, mit Grenze", "Year B, with limit"), series.yearBEur],
    [tx("Verlust durch die Grenze, ein Jahr", "Loss from the limit, one year"), series.yearAEur - series.yearBEur],
    [tx("Kosten der Verzögerung", "Cost of the delay"), series.delayEur],
  ] as const;
  return (
    <div className="szen-table-wrap">
      <table className="szen-table">
        <caption>{tx("Euro nur als Modellschätzung und obere Modellgrenze, gerundet auf Tausend.", "Euro only as a model estimate and upper model bound, rounded to thousands.")}</caption>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{euro(value, language)}</td>
            </tr>
          ))}
          {series.monthlyAEur.map((value, index) => (
            <tr key={monthName(index + 1, language)}>
              <th>{monthName(index + 1, language)}</th>
              <td>
                A {euro(value, language)} · B {euro(series.monthlyBEur[index] ?? 0, language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function assumptionLine(raw: FcaRaw, language: AppLanguage): string {
  const year = raw.year === "2025" ? (language === "de" ? "Kalenderjahr 2025" : "calendar year 2025") : language === "de" ? "letzte 12 Monate" : "last 12 months";
  return `${raw.power} MW, ${raw.energy} MWh, ${language === "de" ? "Start" : "start"} ${monthName(raw.startMonth, language)}, ${year}.`;
}

function LimitField({
  raw,
  language,
  error,
  sliderPercent,
  shownPercent,
  valueText,
  onLimit,
  onPercent,
}: {
  raw: FcaRaw;
  language: AppLanguage;
  error?: string;
  sliderPercent: number;
  shownPercent: number;
  valueText: string;
  onLimit: (value: string) => void;
  onPercent: (percent: number) => void;
}) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const errorId = error ? "szen-limit-error" : undefined;
  return (
    <div className="szen-field">
      <label htmlFor="szen-limit">
        {tx("Netzgrenze", "Grid limit")} <GlossaryTip id="netzgrenze" language={language} />
      </label>
      <div className="szen-limit-row">
        <input
          id="szen-limit-range"
          className="szen-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sliderPercent}
          aria-valuetext={valueText}
          aria-describedby={errorId}
          aria-label={tx("Netzgrenze in Prozent der Leistung", "Grid limit as a percent of power")}
          onChange={(event) => onPercent(Number(event.target.value))}
        />
        <span className="szen-percent">{shownPercent}{"\u00A0%"}</span>
        <input
          id="szen-limit"
          className="szen-input"
          inputMode="decimal"
          value={raw.limit}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onLimit(event.target.value)}
        />
        <span>MW</span>
      </div>
      {error ? (
        <p id="szen-limit-error" className="szen-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NumberField({
  id,
  label,
  suffix,
  value,
  error,
  describedBy,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  error?: string;
  describedBy?: string;
  min?: number;
  max?: number;
  onChange: (value: string) => void;
}) {
  const errorId = error ? `${id}-error` : describedBy;
  return (
    <div className="szen-field">
      <label htmlFor={id}>{label}</label>
      <div className="szen-inline">
        <input
          id={id}
          className="szen-input"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{suffix}</span>
      </div>
      {error ? (
        <p id={`${id}-error`} className="szen-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SzenarienPending({ language = "de" }: { language?: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  return (
    <div className="szenarien">
      <section className="day-hero szen-hero">
        <div className="day-hero-inner">
          <p className="day-kicker">{tx("Szenarien rechnen", "Run scenarios")}</p>
          <h1>{tx("Szenarien rechnen für einen Speicher an einem Netzknoten.", "Run scenarios for one battery at one grid node.")}</h1>
        </div>
      </section>
    </div>
  );
}
