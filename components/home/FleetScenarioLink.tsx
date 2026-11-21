"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type FleetScenarioLinkProps = Omit<ComponentProps<typeof Link>, "scroll" | "prefetch">;

/** Flotten-Query-Links: Next-Navigation ohne Scroll (Speicher in FleetScrollRestore). */
export function FleetScenarioLink({ href, ...rest }: FleetScenarioLinkProps) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      data-fleet-scenario-link=""
      data-no-nav-progress=""
      {...rest}
    />
  );
}