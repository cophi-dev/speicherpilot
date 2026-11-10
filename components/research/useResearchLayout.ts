"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getDesktop(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

export function useResearchLayout() {
  const isDesktop = useSyncExternalStore(subscribe, getDesktop, () => false);
  return {
    isDesktop,
    messer: isDesktop ? { width: 1280, height: 470 } : { width: 350, height: 342 },
    week: isDesktop ? { width: 600, height: 360 } : { width: 350, height: 332 },
    saturation: isDesktop ? { width: 600, height: 400 } : { width: 350, height: 388 },
    vision: isDesktop ? { width: 1280, height: 480 } : { width: 350, height: 368 },
  };
}
