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
  views: Perspective[];
}[] = [
  {
    id: "ladepark",
    titleDe: "Schnellladepark",
    titleEn: "Fast-charging hub",
    badgeDe: "BEISPIELDATEN",
    badgeEn: "EXAMPLE DATA",
    projektDe: "Deutschlandnetz-Größe: Peak, Netzentgelt, Day-ahead — Modellschätzung.",
    projektEn: "Germany-network scale: peak, grid fees, day-ahead — model estimate.",
    netzDe: "",
    netzEn: "",
    views: ["projekt"],
  },
  {
    id: "land",
    titleDe: "Ländlicher Knoten",
    titleEn: "Rural node",
    badgeDe: "SIMBENCH",
    badgeEn: "SIMBENCH",
    projektDe: "",
    projektEn: "",
    netzDe: "Wind und PV: Einspeisung mittags, drei Fahrweisen, fest/flexibel X/Y.",
    netzEn: "Wind and PV: midday feed-in, three modes, firm/flexible X/Y.",
    views: ["netz"],
  },
  {
    id: "stadt",
    titleDe: "Stadtnetz",
    titleEn: "Urban grid",
    badgeDe: "SIMBENCH",
    badgeEn: "SIMBENCH",
    projektDe: "",
    projektEn: "",
    netzDe: "Abendlicher Bezug, Laden zählt mit — gleicher Speicher, anderer Engpass.",
    netzEn: "Evening withdrawal, charging counts — same storage, different bottleneck.",
    views: ["netz"],
  },
  {
    id: "grossspeicher",
    titleDe: "Großspeicher",
    titleEn: "Grid-scale storage",
    badgeDe: "MODELL",
    badgeEn: "MODEL",
    projektDe: "Großspeicher am ländlichen 110-kV-Knoten (100 MW, 230 MWh): Modellanker.",
    projektEn: "Large storage at a rural 110 kV node (100 MW, 230 MWh): model anchor.",
    netzDe: "110-kV-Knoten: dynamische Grenzen, Modelltag.",
    netzEn: "110 kV node: dynamic limits, model day.",
    views: ["projekt", "netz"],
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
  const visible = ITEMS.filter((item) => item.views.includes(view));
  const label = language === "de" ? "Beispiel wählen" : "Choose an example";
  return (
    <div className="mt-5" role="radiogroup" aria-label={label}>
      <p className="num text-[12px] tracking-[0.08em] text-muted-foreground uppercase">{label}</p>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        {visible.map((item) => {
          const selected = scenario === item.id;
          const body = view === "projekt"
            ? language === "de" ? item.projektDe : item.projektEn
            : language === "de" ? item.netzDe : item.netzEn;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
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
