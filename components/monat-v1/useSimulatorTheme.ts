"use client";

import { useEffect, useState } from "react";

import { simulatorPalette } from "@/components/monat-v1/simulatorPalette";

export function useSimulatorTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => setDark(root.classList.contains("dark"));
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return { dark, colors: simulatorPalette(dark) };
}

export function useLayoutWide(threshold = 1100) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${threshold}px)`);
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [threshold]);
  return wide;
}
