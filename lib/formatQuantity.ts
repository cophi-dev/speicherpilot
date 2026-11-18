import type { AppLanguage } from "@/components/language-context";

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

/** Thin space between a formatted number and its unit. */
export function withUnit(value: string, unit: string) {
  return `${value}\u202F${unit}`;
}

export function formatYears(value: number | null, language: AppLanguage) {
  if (value === null || !Number.isFinite(value)) {
    return language === "de" ? "> Lebensdauer" : "> lifetime";
  }
  return formatQuantity(value, language, 1);
}
