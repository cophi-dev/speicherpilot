"use client";

import { useEffect, useState } from "react";

import { knotenPalette } from "@/components/knoten/knotenPalette";

export function useKnotenTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return { colors: knotenPalette(dark), dark };
}