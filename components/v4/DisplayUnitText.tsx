import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";

/** SSR-sichere Fließtext-Ausgabe mit geschütztem Leerzeichen vor Einheiten. */
export function DisplayUnitText({ children }: { children: string }) {
  return <>{insertDisplayUnitNbsp(children)}</>;
}