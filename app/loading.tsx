import { EmptyRing } from "@/components/day-ring/EmptyRing";

export default function Loading() {
  return (
    <section className="day-hero day-missing" aria-busy="true" aria-live="polite">
      <div className="day-missing-inner">
        <EmptyRing label="Laden" sweep />
        <p>Daten kommen.</p>
      </div>
    </section>
  );
}
