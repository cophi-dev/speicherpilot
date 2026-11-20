import type { AppLanguage } from "@/components/language-context";

import { DISPLAY_NBSP } from "@/lib/displayUnitFormat";

const TYPO_MINUS = "\u2212";

export function localeTag(language: AppLanguage) {
  return language === "de" ? "de-DE" : "en-GB";
}

export function formatQuantity(value: number, language: AppLanguage, digits = 0) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat(localeTag(language), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
  if (value < 0 && formatted.startsWith("-")) {
    return `${TYPO_MINUS}${formatted.slice(1)}`;
  }
  return formatted;
}

/** Geschütztes Leerzeichen zwischen Zahl und Einheit (SSR/DOM). */
export function withUnit(value: string, unit: string) {
  return `${value}${DISPLAY_NBSP}${unit}`;
}

export function formatQuantityUnit(
  value: number,
  language: AppLanguage,
  digits: number,
  unit: string,
): string {
  return withUnit(formatQuantity(value, language, digits), unit);
}

export function formatYears(value: number | null, language: AppLanguage) {
  if (value === null || !Number.isFinite(value)) {
    return language === "de" ? "> Lebensdauer" : "> lifetime";
  }
  return formatQuantity(value, language, 1);
}
