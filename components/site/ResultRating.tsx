import type { TrafficLight } from "@/lib/readability";
import { ratingWord } from "@/lib/resultCopy";

export function ResultRating({ light, language }: { light: TrafficLight; language: "de" | "en" }) {
  const word = ratingWord(light, language);
  const tone = light === "green" ? "text-success" : light === "yellow" ? "text-warning" : "text-destructive";
  const mark = light === "green" ? "●" : light === "yellow" ? "◕" : "▲";
  return (
    <p className={`num mt-2 text-[12px] tracking-[0.08em] uppercase ${tone}`}>
      <span aria-hidden="true">{mark} </span>
      {word}
    </p>
  );
}
