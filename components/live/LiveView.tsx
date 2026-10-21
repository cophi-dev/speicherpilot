"use client";

import { LiveRing } from "@/components/live/LiveRing";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";

export function LiveView({ dispatch }: { dispatch: LiveDispatchInput }) {
  return <LiveRing dispatch={dispatch} />;
}
