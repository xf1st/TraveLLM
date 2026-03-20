/**
 * Locale-aware formatting utilities.
 * Works in both server and client components.
 */

export type AppLocale = 'ru' | 'en';

// Currency config per locale
const CURRENCY_CONFIG: Record<AppLocale, { code: string; locale: string; symbol: string }> = {
  ru: { code: 'RUB', locale: 'ru-RU', symbol: '₽' },
  en: { code: 'USD', locale: 'en-US', symbol: '$' },
};

/** Format a number as currency based on locale */
export function formatCurrency(
  amount: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions
): string {
  const cfg = CURRENCY_CONFIG[locale];
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

/** Get currency symbol for locale */
export function getCurrencySymbol(locale: AppLocale): string {
  return CURRENCY_CONFIG[locale].symbol;
}

/** Get currency code for locale */
export function getCurrencyCode(locale: AppLocale): string {
  return CURRENCY_CONFIG[locale].code;
}

/** Format a plain number with locale-appropriate thousands separator */
export function formatNumber(amount: number, locale: AppLocale): string {
  const cfg = CURRENCY_CONFIG[locale];
  return new Intl.NumberFormat(cfg.locale).format(amount);
}

/**
 * Convert RUB → USD approximately (for display purposes only).
 * Real conversion should use live rates; this is a rough estimate.
 */
const RUB_TO_USD_RATE = 90; // approximate

export function convertBudget(amountRub: number, targetLocale: AppLocale): number {
  if (targetLocale === 'ru') return amountRub;
  return Math.round(amountRub / RUB_TO_USD_RATE);
}

/** Get html lang attribute value */
export function getHtmlLang(locale: AppLocale): string {
  return locale === 'ru' ? 'ru' : 'en';
}

/** Get OpenGraph locale string */
export function getOgLocale(locale: AppLocale): string {
  return locale === 'ru' ? 'ru_RU' : 'en_US';
}
