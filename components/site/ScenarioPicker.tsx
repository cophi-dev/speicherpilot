import type { Perspective, ScenarioId } from "@/lib/perspective";

type Language = "de" | "en";

const ITEMS: {
  id: ScenarioId;
  titleDe: string;
  titleEn: string;
  badgeDe: string;
  badgeEn: string;
  projektDe: string;
  projektEn: string;
  netzDe: string;
  netzEn: string;
}[] = [
  {
    id: "supermarkt",
    titleDe: "Supermarkt",
    titleEn: "Supermarket",
    badgeDe: "BEISPIELDATEN",
    badgeEn: "EXAMPLE DATA",
    projektDe: "Fiktiv, hinter dem Zähler: Abendspitze kappen und die Rückzahlung lesen.",
    projektEn: "Fictional, behind the meter: cut the evening peak and read the payback.",
    netzDe: "Fiktiv, hinter dem Zähler: bleibt der Anschluss unter der Grenze?",
    netzEn: "Fictional, behind the meter: does the connection stay within its limit?",
  },
  {
    id: "quartier",
    titleDe: "Quartier",
    titleEn: "Neighbourhood",
    badgeDe: "BEISPIELDATEN",
    badgeEn: "EXAMPLE DATA",
    projektDe: "Fiktiv, 150 Haushalte: Größe des Speichers an der Station und Rückzahlung.",
    projektEn: "Fictional, 150 households: battery size at the substation, and payback.",
    netzDe: "Fiktiv: hält die Ortsnetzstation ihre Planleistung, oder braucht sie einen größeren Trafo?",
    netzEn: "Fictional: does the distribution substation stay within its planning rating, or does it need a larger transformer?",
  },
  {
    id: "grossspeicher",
    titleDe: "Großspeicher",
    titleEn: "Grid-scale storage",
    badgeDe: "ÖFFENTLICHE ECKDATEN",
    badgeEn: "PUBLIC FIGURES",
    projektDe: "Flower, Bergedorf: öffentliche Eckdaten. Kein Euro, der Vertrag ist nicht veröffentlicht.",
    projektEn: "Flower, Bergedorf: published figures. No euro amount, the contract is not published.",
    netzDe: "Flower, Bergedorf: Speicher vor dem Zähler. Kein veröffentlichter Tagesverlauf.",
    netzEn: "Flower, Bergedorf: front-of-meter storage. No published daily profile.",
  },
];

export function ScenarioPicker({
  scenario,
  view,
  language,
  onSelect,
}: {
  scenario: ScenarioId | null;
  view: Perspective;
  language: Language;
  onSelect: (next: ScenarioId) => void;
}) {
  const label = language === "de" ? "Beispiel wählen" : "Choose an example";
  return (
    <div className="mt-5" role="radiogroup" aria-label={label}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <div
        className="mt-2 grid gap-2 lg:grid-cols-3"
        onKeyDown={(event) => {
          const current = Math.max(0, ITEMS.findIndex((item) => item.id === scenario));
          let nextIndex = current;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            nextIndex = (current + 1) % ITEMS.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            nextIndex = (current - 1 + ITEMS.length) % ITEMS.length;
          } else if (event.key === "Home") {
            event.preventDefault();
            nextIndex = 0;
          } else if (event.key === "End") {
            event.preventDefault();
            nextIndex = ITEMS.length - 1;
          } else {
            return;
          }
          const next = ITEMS[nextIndex];
          if (!next) {
            return;
          }
          onSelect(next.id);
          event.currentTarget.querySelector<HTMLButtonElement>(`[data-scenario="${next.id}"]`)?.focus();
        }}
      >
        {ITEMS.map((item) => {
          const selected = scenario === item.id;
          const tabbable = selected || (scenario === null && item.id === ITEMS[0]?.id);
          const body = view === "projekt"
            ? language === "de" ? item.projektDe : item.projektEn
            : language === "de" ? item.netzDe : item.netzEn;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              data-scenario={item.id}
              aria-checked={selected}
              tabIndex={tabbable ? 0 : -1}
              className={`min-h-11 rounded-md border p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {language === "de" ? item.titleDe : item.titleEn}
                <span className={`num text-[12px] font-normal ${selected ? "text-background" : "text-muted-foreground"}`}>{language === "de" ? item.badgeDe : item.badgeEn}</span>
              </span>
              <span className={`mt-1 block text-sm ${selected ? "text-background" : "text-muted-foreground"}`}>{body}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
