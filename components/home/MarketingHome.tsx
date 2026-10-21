"use client";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";

export function MarketingHome({ dispatch, todayKey }: { dispatch: LiveDispatchInput; todayKey: string }) {
  return (
    <div>
      <HomeRing dispatch={dispatch} todayKey={todayKey} />
      <ConnectionStory />
    </div>
  );
}
