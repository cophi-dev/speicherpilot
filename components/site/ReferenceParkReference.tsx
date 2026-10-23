import { GlossaryTip } from "@/components/GlossaryTip";
import { formatQuantity } from "@/lib/formatQuantity";
import type { Perspective } from "@/lib/perspective";
import { REFERENCE_PARK, referenceParkCRate, referenceParkHoursAtFullPower } from "@/lib/referencePark";

export function ReferenceParkReference({ language, view }: { language: "de" | "en"; view: Perspective }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const facts = REFERENCE_PARK;
  const hours = referenceParkHoursAtFullPower();
  const cRate = referenceParkCRate();
  return (
    <div className="flex flex-col gap-4">
      <article className="rounded-md border border-border-strong bg-card p-4 md:p-5">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Öffentliche Referenz", "Public reference")}</p>
        <h2 className="mt-1 text-xl font-medium">{language === "de" ? facts.nameDe : facts.nameEn}</h2>
        <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
          {tx(
            `${facts.project}, ${facts.placeDe}, ${facts.districtDe} (${facts.state}). Hochspannung (${facts.voltageKv} kV), Anschluss bei ${facts.gridOperator}. In Betrieb seit 2025 (MaStR: 13.03.2025).`,
            `${facts.project}, ${facts.placeEn}, ${facts.districtEn} (${facts.state}). High voltage (${facts.voltageKv} kV), connected to ${facts.gridOperator}. In operation since 2025 (MaStR: 13 March 2025).`
          )}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Leistung", "Power")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(facts.powerMw, language, 1)} MW</dd>
          </div>
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Inhalt", "Energy")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(facts.energyMwh, language, 1)} MWh</dd>
            <dd className="mt-1 text-sm text-foreground">{tx(`Die Betreiber-Meldung nennt ${facts.operatorEnergyMwh} MWh.`, `The operator’s release says ${facts.operatorEnergyMwh} MWh.`)}</dd>
          </div>
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Volle Leistung", "Full power")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(hours, language, 1)} h</dd>
            <dd className="mt-1 text-sm text-foreground">
              {tx(
                `C-Rate ${formatQuantity(cRate, language, 2)}. Beides ist aus den veröffentlichten Zahlen gerechnet.`,
                `C-rate ${formatQuantity(cRate, language, 2)}. Both figures are the published numbers divided.`
              )}
            </dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-1 text-sm">
          <li>{tx(`Betreiber ${facts.operator}. Eigentümer ${facts.owner} seit 25.08.2026.`, `Operator ${facts.operator}. Owner ${facts.owner} since 25 August 2026.`)}</li>
          <li className="flex flex-wrap items-center gap-2">
            {tx("Bezug und Einspeisung sind dynamisch begrenzt. Die Grenzwerte sind nicht veröffentlicht.", "Withdrawal and feed-in are limited dynamically. The limits are not published.")}
            <GlossaryTip id="fca" language={language} />
          </li>
          <li className="flex flex-wrap items-center gap-2">
            {tx("Speicher vor dem Zähler, ohne Standortlast.", "Storage in front of the meter, with no site load.")}
            <GlossaryTip id="front-of-meter" language={language} />
          </li>
        </ul>
        <p className="mt-3 text-sm">
          {facts.sources.map((source) => (
            <a key={source.href} className="mr-4 inline-block underline underline-offset-[3px]" href={source.href}>
              {source.publisher}
            </a>
          ))}
          <a className="mr-4 inline-block underline underline-offset-[3px]" href={facts.dashboardHref}>
            {tx("echte Fahrweise beim Betreiber", "real operation at the operator")}
          </a>
        </p>
      </article>

      {view === "projekt" ? (
        <article className="rounded-md border border-border bg-card p-4 md:p-5">
          <h2 className="text-lg font-medium">{tx("Was dieser Rechner hier nicht ausrechnet", "What this calculator does not compute here")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              "Ein Speicher vor dem Zähler hat keine Standortlast. Größe und Stunden bei voller Leistung stehen oben, weil sie veröffentlicht sind. Einen Erlös nennen die Quellen nicht, deshalb steht hier keiner.",
              "A front-of-meter battery has no site load. Size and hours at full power are above because they were published. The sources do not state a revenue, so none is shown here."
            )}
          </p>
        </article>
      ) : (
        <article className="rounded-md border border-border bg-card p-4 md:p-5">
          <h2 className="text-lg font-medium">{tx("Anschluss", "Connection")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              "Hochspannung (110 kV), Anschluss bei SH Netz. Bezug und Einspeisung sind dynamisch begrenzt. Die Grenzwerte sind nicht veröffentlicht.",
              "High voltage (110 kV), connected to SH Netz. Withdrawal and feed-in are limited dynamically. The limits are not published."
            )}
          </p>
          <a className="mt-3 inline-block text-sm underline underline-offset-[3px]" href="/methodik#modelltag">
            {tx("Methodik zum Modelltag", "Method for the model day")}
          </a>
        </article>
      )}
    </div>
  );
}
