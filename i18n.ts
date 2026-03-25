import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// 1. Your supported languages tuple
const locales = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'] as const;
const defaultLocale = 'en';

type Locale = typeof locales[number];

// 2. Type guard remains the same
function isValidLocale(locale: any): locale is Locale {
  return locales.includes(locale);
}

export default getRequestConfig(async ({ locale }) => {
  /**
   * PROFESSIONAL FIX: Safe Fallback
   * If a bot or automated tool visits a path without a valid locale,
   * we force the 'en' default instead of calling notFound(). 
   * This prevents the "RangeError: Incorrect locale information" 500 crash.
   */
  const activeLocale = isValidLocale(locale) ? locale : defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`./messages/${activeLocale}.json`)).default
  };
});