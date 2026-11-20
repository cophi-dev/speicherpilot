"use client";

import Link from "next/link";

import manifest from "@/data/knoten/manifest.json";
import { knotenHrefFromTagDay } from "@/lib/knoten/knotenTagLink";
import type { KnotenManifest } from "@/lib/knoten/knotenTypes";

const KNOTEN_MANIFEST = manifest as KnotenManifest;

export function KnotenTagLink({ dayKey }: { dayKey: string }) {
  const href = knotenHrefFromTagDay(dayKey, KNOTEN_MANIFEST);
  return (
    <p className="v4-content" style={{ margin: "0.5rem auto 1rem" }}>
      <Link href={href} className="v4-text-link" data-testid="tag-knoten-link">
        Diesen Tag am Modellknoten ansehen
      </Link>
    </p>
  );
}