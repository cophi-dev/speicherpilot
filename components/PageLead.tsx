"use client";

import { useLanguage } from "@/components/language-context";

export function PageLead({ de, en }: { de: string; en: string }) {
  const { language } = useLanguage();
  return <p className="page-lead">{language === "de" ? de : en}</p>;
}
