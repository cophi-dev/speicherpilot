import { GlossaryTip } from "@/components/GlossaryTip";
import { FLOWER_BERGEDORF, flowerHoursAtFullPower } from "@/lib/flowerBergedorf";
import { formatQuantity } from "@/lib/formatQuantity";
import type { Perspective } from "@/lib/perspective";

export function FlowerReference({ language, view }: { language: "de" | "en"; view: Perspective }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const hours = flowerHoursAtFullPower();
  const facts = FLOWER_BERGEDORF;
  return (
    <div className="flex flex-col gap-4">
      <article className="rounded-md border border-border-strong bg-card p-4 md:p-5">
        <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Öffentliche Referenz", "Public reference")}</p>
        <h2 className="mt-1 text-xl font-medium">{language === "de" ? facts.nameDe : facts.nameEn}</h2>
        <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
          {tx(
            "Nur veröffentlichte Eckdaten von Flower und pv magazine. Keine Spannung, kein Netzanschlusspunkt, kein Erlös und kein Preis. Beides steht in den Quellen nicht.",
            "Only the figures Flower and pv magazine published. No voltage, no connection point, no revenue and no price. The sources do not state them."
          )}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Leistung", "Power")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(facts.powerMw, language, 0)} MW</dd>
          </div>
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Inhalt", "Energy")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(facts.energyMwh, language, 0)} MWh</dd>
          </div>
          <div className="border border-border p-3">
            <dt className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{tx("Volle Leistung", "Full power")}</dt>
            <dd className="num mt-1 text-2xl">{formatQuantity(hours, language, 0)} h</dd>
            <dd className="mt-1 text-sm text-foreground">
              {tx("400 MWh geteilt durch 100 MW. Das ist die Rechnung aus den beiden veröffentlichten Zahlen.", "400 MWh divided by 100 MW. That is the two published figures divided.")}
            </dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-1 text-sm">
          <li>{tx("Ort: Hamburg-Bergedorf. Baubeginn 9. September 2026.", "Place: Hamburg-Bergedorf. Construction started 9 September 2026.")}</li>
          <li>{tx("Betrieb geplant Ende 2028.", "Operation planned for the end of 2028.")}</li>
          <li className="flex flex-wrap items-center gap-2">
            {tx("Vermarktung: ENGIE über ein Flexibility Purchase Agreement.", "Marketing: ENGIE under a Flexibility Purchase Agreement.")}
            <GlossaryTip id="fpa" language={language} />
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
        </p>
      </article>

      {view === "projekt" ? (
        <article className="rounded-md border border-border bg-card p-4 md:p-5">
          <h2 className="text-lg font-medium">{tx("Was dieser Rechner hier nicht ausrechnet", "What this calculator does not compute here")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              "Ein Speicher vor dem Zähler hat keine Standortlast. Größe und Stunden bei voller Leistung stehen oben, weil sie veröffentlicht sind. Eine Rückzahlung bräuchte den Preis aus dem Vertrag mit ENGIE. Den kennen wir nicht, deshalb steht hier kein Euro.",
              "A front-of-meter battery has no site load. Size and hours at full power are above because they were published. A payback would need the price in the ENGIE contract. We do not have it, so there is no euro figure here."
            )}
          </p>
        </article>
      ) : (
        <article className="rounded-md border border-border bg-card p-4 md:p-5">
          <h2 className="text-lg font-medium">{tx("Frage an den Netzbetreiber", "Question for the grid operator")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx(
              "Ohne Standortlast kann der Speicher laden, während das Netz schon voll ist. Dieses Werkzeug rechnet das nur mit einem Lastprofil. Für Flower gibt es keins in den Quellen, deshalb keine Kilowatt-Spitze und keine Anschlussgrenze.",
              "Without a site load, the battery can charge while the grid is already full. This tool only computes that with a load profile. The sources give none for Flower, so there is no kilowatt peak and no connection limit."
            )}
          </p>
          <p className="mt-3 text-sm">
            {tx(
              "Für Flower ist keine Anschlussgrenze veröffentlicht. Die 80 % im übrigen Rechner sind eine Modellannahme und gelten hier nicht als Anschluss von Flower.",
              "No connection limit is published for Flower. The 80% used elsewhere in this calculator is a model assumption and is not Flower’s connection."
            )}
          </p>
          <a className="mt-3 inline-block text-sm underline underline-offset-[3px]" href="/methodik#anschluss">
            {tx("Methodik zur flexiblen Vereinbarung", "Method for the flexible agreement")}
          </a>
        </article>
      )}
    </div>
  );
}
