import type { AppLanguage } from "@/components/language-context";

export function localeTag(language: AppLanguage) {
  return language === "de" ? "de-DE" : "en-GB";
}

export function formatQuantity(value: number, language: AppLanguage, digits = 0) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat(localeTag(language), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
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
