import {
  Locales,
  type Locale,
  type ISO639_1LanguageCode,
  type BCP47Locale,
  type InferBCP47Locale,
  type InferPosixFromBCP47Locale,
  type CountryCode,
  LocalesSet,
} from './locales.js';

/**
 * Checks whether the provided value is a valid `ISO 639-1` language code.
 * A valid `ISO 639-1` code is a two-letter code representing a language (e.g., "en" for English).
 *
 * @param value - The string to check.
 * @returns True if the value is a valid `ISO 639-1` language code, false otherwise.
 */
export function isISO639_1LanguageCode(
  value: string | undefined
): value is ISO639_1LanguageCode {
  if (!value) return false;

  const iso639_1Codes = Locales.map(loc => loc.split('_')[0]);
  return iso639_1Codes.includes(value);
}

/**
 * Converts a given Locale to its corresponding `ISO 639-1` language code.
 *
 * @param locale - The Locale to convert (e.g., `en_US`).
 * @returns The ISO 639-1 language code (e.g., `"en"`).
 */
export function toISO639_1LanguageCode(locale: Locale): ISO639_1LanguageCode {
  return locale.split('_')[0] as ISO639_1LanguageCode;
}

/**
 * Converts an `ISO 639-1` language code to a corresponding Locale.
 * If multiple Locales exist for the same language code, the first match is returned.
 *
 * @param languageCode - The `ISO 639-1` language code (e.g., `"en"`).
 * @returns The corresponding Locale (e.g., `en_US`), or null if not found.
 */
export function iso639_1ToLocale(languageCode: ISO639_1LanguageCode): Locale {
  // Will always find something, as ISO639_1 type is derived from Locales
  const foundLocale: Locale | undefined = Locales.find((loc: Locale) =>
    loc.startsWith(`${languageCode}_`)
  );

  if (!foundLocale) {
    throw new Error(`Failed to extract locale from ${languageCode}`);
  }

  return foundLocale;
}

/**
 * Checks whether the provided value is a valid `BCP 47` locale string.
 * A valid `BCP 47` locale string follows the format "language-region" (e.g., "en-US").
 *
 * @param value - The string to check.
 * @returns True if the value is a valid `BCP 47` locale string, false otherwise.
 */
export function isBCP47Locale(value: string | undefined): value is BCP47Locale {
  if (!value) return false;

  const bcp47Locales = Locales.map(loc => loc.replace('_', '-'));
  return (bcp47Locales as readonly string[]).includes(value);
}

/**
 * Converts a POSIX locale string (used in Unix-like systems, e.g., `"en_US"`)
 * to `BCP 47` (Best Common Practice for Language Tags, e.g., `"en-US"`) format.
 *
 * @param posixLocale - The POSIX locale string (e.g., `"en_US"`).
 * @returns The `BCP 47` locale string (e.g., `"en-US"`).
 */
export function toBCP47<TLocale extends Locale>(
  posixLocale: TLocale
): InferBCP47Locale<TLocale> {
  return posixLocale.replace('_', '-') as InferBCP47Locale<TLocale>;
}

/**
 * Converts a `BCP 47` (Best Common Practice for Language Tags, e.g., `"en-US"`)
 * locale string to POSIX format (used in Unix-like systems, e.g., `"en_US"`).
 *
 * @param locale - The `BCP 47` locale string (e.g., `"en-US"`).
 * @returns The `POSIX` locale string (e.g., `"en_US"`).
 */
export function toPOSIX<TBCPLocale extends BCP47Locale>(
  locale: TBCPLocale
): InferPosixFromBCP47Locale<TBCPLocale> {
  return locale.replace('-', '_') as InferPosixFromBCP47Locale<TBCPLocale>;
}

/**
 * Retrieves the human-readable name of a given locale.
 *
 * @param locale - The locale string (e.g., `"en_US"` or `"fr-FR"`).
 * @returns The human-readable name of the locale (e.g., `"English (United States)"` or `"French (France)"`).
 */
export function getLocaleName(locale: Locale): string {
  try {
    const [lang, region] = locale.split(/[_-]/) as [string, string];
    const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

    const language: string | undefined = languageNames.of(lang);
    const regionName: string | undefined =
      region ? regionNames.of(region) : undefined;

    if (!language) {
      return locale;
    }
    return regionName ? `${language} (${regionName})` : language;
  } catch {
    return locale;
  }
}

/**
 * Extracts the country/region code from a given locale string.
 *
 * @param locale - The locale string (e.g., `"en_US"` or `"fr-FR"`).
 * @returns The `ISO 3166-1 alpha-2` country/region code (e.g., `"US"` or `"FR"`), or null if not found.
 */
export function getCountryFromLocale(locale: Locale): CountryCode | null {
  const parts = locale.split(/[_-]/);
  if (parts.length !== 2) return null;

  return parts[1] as CountryCode;
}

/**
 * Type guard to check if a value is a valid Locale.
 */
export function isLocale(value: string | undefined): value is Locale {
  if (!value) return false;

  return LocalesSet.has(value as Locale);
}
