import { MonatDauerlinieChart } from "@/components/home/MonatKonzeptCharts";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { daysInBerlinMonth } from "@/lib/monatCalendar";
import { buildDauerlinieFromResidualDays } from "@/lib/monatKonzeptC";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";

export function MonatObservedOnlySlot({ monthKey }: { monthKey: string }) {
  const snap = loadTagRollSnapshot();
  const keys = new Set(daysInBerlinMonth(monthKey));
  const days = snap.days.filter((d) => keys.has(d.dateBerlin));
  const model = buildDauerlinieFromResidualDays(days);

  if (model.intervalCount < 1) {
    return <NationalFleetMonthUnavailable monthKey={monthKey} />;
  }

  return (
    <>
      <NationalFleetMonthUnavailable monthKey={monthKey} />
      <MonatDauerlinieChart
        model={model}
        monthKey={monthKey}
        activeFactor={1}
        activeStrategy="ueberschuss"
        fleetAvailable={false}
        peakAfterGw={model.observedMaxGw}
        wirkungGw={0}
      />
      <footer className="v4-content v4-day-footnotes">
        <p className="v4-footnote num">
          Weiße Linie: beobachtete Restlast (Last − Wind − Sonne) aus der geladenen Tagesreihe. Kein Modelllauf für
          diesen Monat. Quelle Energy-Charts / SMARD CC BY 4.0.{" "}
          <a href="/methodik#monat-konzept-ac" className="v4-footnote-link">
            Methodik
          </a>
        </p>
      </footer>
    </>
  );
}
