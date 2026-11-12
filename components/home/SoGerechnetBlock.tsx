import type { ReactNode } from "react";

export function SoGerechnetBlock({ children, id = "so-gerechnet" }: { children: ReactNode; id?: string }) {
  return (
    <details className="v4-content v4-so-gerechnet" id={id} data-testid="so-gerechnet">
      <summary>So gerechnet</summary>
      <div className="v4-so-gerechnet-body">{children}</div>
    </details>
  );
}
