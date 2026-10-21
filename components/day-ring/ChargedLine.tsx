import { ModelChip } from "@/components/day-ring/ModelChip";
import { MonoNumber } from "@/components/day-ring/MonoNumber";
import type { ChargedSentenceParts } from "@/lib/dayRingStory";

/** The charged-energy sentence. Words stay in Plex Sans; only the amount is mono. */
export function ChargedLine({ parts, modelLabel }: { parts: ChargedSentenceParts; modelLabel: string }) {
  return (
    <p className="day-charged">
      <span className="day-charged-text">
        {parts.before}
        <MonoNumber value={parts.amount} />
        {parts.after}
      </span>
      <ModelChip label={modelLabel} />
    </p>
  );
}
