import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

// 1. Use `as const` to create a readonly tuple with literal types
const locales = ['de', 'en', 'fr', 'lg', 'nl', 'no', 'nyn', 'pt-BR', 'ru', 'rw', 'sw', 'zh'] as const;

// A type alias for our supported locales
type Locale = typeof locales[number];

// 2. Create a type guard to check if a string is a valid locale
function isValidLocale(locale: any): locale is Locale {
  return locales.includes(locale);
}

export default getRequestConfig(async ({locale}) => {
  // 3. Use the type guard for validation
  if (!isValidLocale(locale)) {
    notFound();
  }

  // At this point, TypeScript knows for certain that `locale` is a valid `Locale` (e.g., "en" | "de" | ...),
  // which satisfies the required `string` type.
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});