"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ModelChip } from "@/components/day-ring/ModelChip";
import { useLanguage } from "@/components/language-context";
import { SiteSimulator } from "@/components/site/SiteSimulator";
import {
  ladeparkConnectionKw,
  ladeparkMaxKw,
  planLadepark,
  type LadeparkCategory,
} from "@/lib/ladepark";
import { formatQuantity, formatYears } from "@/lib/formatQuantity";
import { sitePath } from "@/lib/perspective";
import { storyFromPlan } from "@/lib/siteConnectionDay";

const CORE =
  "Netzdienlich ist keine Eigenschaft der Batterie. Es ergibt sich aus Ort, Uhrzeit und Vertrag.";

const CATEGORIES: { id: LadeparkCategory; label: string }[] = [
  { id: 4, label: "S" },
  { id: 8, label: "M" },
  { id: 12, label: "L" },
  { id: 16, label: "XL" },
];

export function OrtProjektLadepark() {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const [category, setCategory] = useState<LadeparkCategory>(4);
  const [limitKw, setLimitKw] = useState(() => ladeparkConnectionKw(4));
  const economics = useMemo(() => planLadepark(category), [category]);
  const { plan, stromNev, paybackYears, paybackSpan, stromNevSpan, arbitrageSpan } = economics;
  const story = useMemo(
    () => storyFromPlan(plan, limitKw, plan.assumptions.roundTripEfficiency),
    [plan, limitKw],
  );

  return (
    <>
      <div className="ort-ladepark-intro day-paper">
        <div className="day-hero-inner">
          <h2 className="v4-h2">{tx("Größe wählen", "Choose size")}</h2>
          <p className="v4-subline">
            {tx("Beispieldaten · ", "Example data · ")}
            <ModelChip label={tx("Modellschätzung", "Model estimate")} />
          </p>
          <div
            className="ort-size-segment v4-tab-bar site-toggle"
            role="radiogroup"
            aria-label={tx("Hub-Größe (Deutschlandnetz)", "Hub size (Deutschlandnetz)")}
          >
            {CATEGORIES.map(({ id, label }) => {
              const mwLabel = formatQuantity(ladeparkMaxKw(id) / 1000, language, 1);
              const aria = `${label} · ${mwLabel} MW`;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={category === id}
                  aria-label={aria}
                  className={category === id ? "is-active" : undefined}
                  onClick={() => {
                    setCategory(id);
                    setLimitKw(ladeparkConnectionKw(id));
                  }}
                >
                  <span className="ort-size-segment-label">{label}</span>
                  <span className="ort-size-segment-mw" aria-hidden="true">
                    · {mwLabel} MW
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <SiteSimulator
        view="projekt"
        story={story}
        language={language}
        limitKw={limitKw}
        onLimitKwChange={setLimitKw}
        notes={[
          tx(
            "Speicher am Anschlusspunkt — Größe, Grenze, Netzwirkung.",
            "Storage at the connection point — size, limit, grid effect.",
          ),
        ]}
      />
      <section className="day-paper" aria-labelledby="ort-ladepark-econ">
        <div className="day-hero-inner">
          <h3 id="ort-ladepark-econ">{tx("Wirtschaftlichkeit · Modellschätzung", "Economics · model estimate")}</h3>
          <dl className="site-stats ort-ladepark-kpi">
            <div>
              <dt>{tx("Amortisation", "Payback")}</dt>
              <dd className="ort-kpi-value">
                {paybackYears != null ? (
                  <>
                    ≈ {formatYears(paybackYears, language)}{" "}
                    {tx("Jahre", "years")}
                    <span className="ort-kpi-span">
                      {tx("Pauschale Unsicherheit ±30 %:", "Flat uncertainty ±30%:")}{" "}
                      {formatYears(paybackSpan.low ?? paybackYears, language)}–
                      {formatYears(paybackSpan.high ?? paybackYears, language)} {tx("Jahre", "years")}
                    </span>
                    {paybackYears > 15 ? (
                      <span className="ort-kpi-note">
                        {tx(
                          "Amortisiert sich im Modell nicht innerhalb der angenommenen Lebensdauer von 15 Jahren (Modellschätzung).",
                          "Does not pay back within the assumed 15-year lifetime in this model (model estimate).",
                        )}
                      </span>
                    ) : null}
                  </>
                ) : (
                  tx(
                    "— · keine positive Jahreswirkung (Netzentgelt plus Arbitrage minus Opex ≤ 0)",
                    "— · no positive annual effect (grid fees plus arbitrage minus opex ≤ 0)",
                  )
                )}
              </dd>
            </div>
            <div>
              <dt>{tx("Benutzungsdauer", "Utilisation hours")}</dt>
              <dd className="ort-kpi-value ort-kpi-nowrap">
                <span className="num">
                  {formatQuantity(stromNev.before.utilisationHours, language, 0)} h →{" "}
                  {formatQuantity(stromNev.after.utilisationHours, language, 0)} h
                </span>
                {stromNev.bandChanged ? ` · ${tx("Tarifbereich wechselt", "tariff band changes")}` : null}
              </dd>
            </div>
            <div>
              <dt>{tx("Netzentgelt-Ersparnis (Peak-Shaving)", "Grid fee savings (peak shaving)")}</dt>
              <dd className="ort-kpi-value">
                ≈ {formatQuantity(stromNev.savingsEur, language, 0)} €/{tx("Jahr", "year")}
                <span className="ort-kpi-span">
                  {tx("Pauschale Unsicherheit ±30 %:", "Flat uncertainty ±30%:")}{" "}
                  {formatQuantity(stromNevSpan.low, language, 0)}–{formatQuantity(stromNevSpan.high, language, 0)} €
                </span>
              </dd>
            </div>
            <div>
              <dt>{tx("Arbitrage Day-ahead", "Day-ahead arbitrage")}</dt>
              <dd className="ort-kpi-value">
                ≈ {formatQuantity(economics.arbitrageEur, language, 0)} €/{tx("Jahr", "year")}
                <span className="ort-kpi-span">
                  {tx("Pauschale Unsicherheit ±30 %:", "Flat uncertainty ±30%:")}{" "}
                  {formatQuantity(arbitrageSpan.low, language, 0)}–{formatQuantity(arbitrageSpan.high, language, 0)} €
                </span>
              </dd>
            </div>
          </dl>
          <p className="site-quiet">
            {tx(
              "Unter 2.500 h ist der Leistungspreis niedrig. Kappen allein trägt wenig, der Speicher verdient zusätzlich mit Preisverschiebung.",
              "Below 2,500 h the demand charge is low. Peak shaving alone does little; the battery also earns from price shifting.",
            )}
          </p>
          <p className="v4-subline">
            {CORE}{" "}
            <Link href={sitePath("netz", "land")}>
              {tx("Wie das Netz denselben Speicher sieht → Netzsicht", "How the grid sees the same storage → grid view")}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
