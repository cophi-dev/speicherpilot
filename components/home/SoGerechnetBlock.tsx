import type { ReactNode } from "react";

export function SoGerechnetBlock({
  children,
  id = "so-gerechnet",
  padded = true,
}: {
  children: ReactNode;
  id?: string;
  /** false, wenn der Block schon in einem .v4-content sitzt (keine doppelte Rinne). */
  padded?: boolean;
}) {
  return (
    <details className={`${padded ? "v4-content " : ""}v4-so-gerechnet`} id={id} data-testid="so-gerechnet">
      <summary>So gerechnet</summary>
      <div className="v4-so-gerechnet-body">{children}</div>
    </details>
  );
}
