import { LOCALES, type I18nText, type Locale } from '../content/schemas';

export { LOCALES, type Locale };
export const DEFAULT_LOCALE: Locale = 'en';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Pick the string for a locale. The schema guarantees every locale is present. */
export const t = (text: I18nText, locale: Locale): string => text[locale];

/** BCP 47 tags for Intl and og:locale. */
export const intlLocale: Record<Locale, string> = { en: 'en-GB', ru: 'ru-RU', kk: 'kk-KZ' };
export const ogLocale: Record<Locale, string> = { en: 'en_US', ru: 'ru_RU', kk: 'kk_KZ' };

/** "2023-02" → "Feb 2023" / "февр. 2023 г." / "2023 ж. ақп." */
export function formatMonth(value: string, locale: Locale): string {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale[locale], { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}
