"use client";

import { useLanguage } from "@/components/language-context";
import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";

export function PageLead({ de, en }: { de: string; en: string }) {
  const { language } = useLanguage();
  return <p className="page-lead">{insertDisplayUnitNbsp(language === "de" ? de : en)}</p>;
}
