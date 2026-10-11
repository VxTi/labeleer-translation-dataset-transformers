import type { Locale, Plurality } from './locales/index.js';

/**
 * An entry in a translation dataset,
 * containing translations for multiple locales,
 * along with optional metadata such as tags and description.
 */
export interface TranslationEntry {
  translations: TranslationLocalizedEntries;
  tags?: string[];
  description?: string;
  plurals?: TranslationPluralization;
}

/**
 * Pluralization entries for different quantities,
 * each containing localized translations.
 * @example
 * const plural: TranslationPluralization = {
 *   en_US: {
 *     [Plurality.ONE]: 'something'
 *   }
 * }
 */
export type TranslationPluralization = Partial<
  Record<Locale, Partial<Record<Plurality, string>>>
>;

export type TranslationLocalizedEntries = Partial<Record<Locale, string>>;

export type TranslationKey = string & {};

/**
 * A dataset of translation entries,
 * where each key is a unique identifier for a translation entry.
 */
export type TranslationDataset = Record<TranslationKey, TranslationEntry>;

/**
 * Extensible options for parsing functions
 */
export interface ParsingOptions {
  /**
   * The locale to prioritize when parsing translations.
   */
  referenceLocale: Locale;

  /**
   * An optional target locale for the parsing process.
   * This can be useful for formats that are specific to a single locale,
   * and/or that are missing locale information in their structure.
   */
  targetLocale?: Locale;
}

/**
 * Options for serialization functions
 */
export interface SerializationOptions {
  /**
   * The reference locale for the serialization process.
   * This is necessary for formats that require a base language,
   * e.g., Android Strings, Apple Strings or TS.
   */
  referenceLocale: Locale;

  /**
   * The list of locales to include in the serialization output.
   */
  locales: Locale[];
}

export interface SerializationFileFragment {
  filename: string;
  content: string;
}

export interface SerializationFile {
  content: string;
}

/**
 * Serialization output, keyed by file name
 */
export type SerializationResult = {
  [filename: string]: SerializationFile;
};

export type MaybeArray<T> = Array<T> | T;

export type MakeOptional<T extends object, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
