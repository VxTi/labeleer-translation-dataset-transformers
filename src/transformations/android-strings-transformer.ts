import { DatasetBuilder } from '../dataset-builder.js';
import type {
  ParsingOptions,
  SerializationOptions,
  SerializationResult,
  TranslationDataset,
  TranslationPluralization,
  SerializationFile,
} from '../types.js';
import { ParsingError, SerializationError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import {
  type Locale,
  getCountryFromLocale,
  toISO639_1LanguageCode,
  Plurality,
} from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';
import { entries } from '@vxti/typed';
import { extractArray } from '../util/data-extraction.js';
import { XMLParser } from 'fast-xml-parser';
import Builder, { type XMLBuilder } from 'fast-xml-builder';
import { merge } from 'lodash-es';
import * as z from 'zod/v4';

export const AndroidStringsDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.ANDROID_STRINGS,
  extensions: ['.xml'],
  formatKey,
  isSingleFileOutput: false,
  parse(input: string, options: ParsingOptions): TranslationDataset {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
      });
      const xmlObj: unknown = parser.parse(input);

      return transformToDataset(xmlObj, options.referenceLocale);
    } catch (e) {
      throw new ParsingError(
        `Failed to parse Android Strings XML: ${String(e)}`
      );
    }
  },

  parseAggregate(
    inputs: Partial<Record<Locale, string>>,
    options: ParsingOptions
  ): TranslationDataset {
    const builder = new DatasetBuilder();

    for (const [referenceLocale, content] of entries(inputs)) {
      const dataset = this.parse(content, {
        ...options,
        referenceLocale,
      });

      builder.merge(dataset);
    }

    return builder.build();
  },

  serialize(
    dataset: TranslationDataset,
    options: SerializationOptions
  ): SerializationResult {
    try {
      const perLanguageDatasets: Partial<Record<Locale, TranslationDataset>> =
        constructPerLanguageDatasets(dataset, options.locales);

      const builder = new Builder({
        format: true,
        ignoreAttributes: false,
      });

      return Object.fromEntries(
        entries(perLanguageDatasets).map(
          ([locale, dataset]): [string, SerializationFile] => {
            const content = buildXmlDataset(builder, dataset, locale);
            const dirname = androidValuesDirectory(locale, options.locales);
            const filename = [dirname, 'strings'].join('/');

            return [filename + this.extensions[0], { content }];
          }
        )
      );
    } catch (e) {
      throw new SerializationError(
        'Something went wrong whilst attempting to serialize Android Strings XML: ',
        { cause: e }
      );
    }
  },
});

/**
 * Android resource entry names must be valid Java identifiers: they may
 * contain only letters, digits and underscores, and may not begin with a
 * digit. Keys arrive already sanitized to `[a-zA-Z0-9._-]`, so here we only
 * collapse the remaining `.`/`-` separators to `_` and guard a leading digit.
 *
 * @see https://developer.android.com/guide/topics/resources/string-resource
 */
function formatKey(key: string): string {
  const identifier = key.replace(/[.-]+/g, '_');

  return /^\d/.test(identifier) ? `_${identifier}` : identifier;
}

function buildXmlDataset(
  builder: XMLBuilder,
  dataset: TranslationDataset,
  locale: Locale
): string {
  const outputIr: ASSerializationOutputSet = {
    resources: { string: [], plurals: [] },
  };

  entries(dataset).forEach(([key, entry]) => {
    const translation = entry.translations[locale];
    const formattedKey = formatKey(key);

    if (translation) {
      outputIr.resources.string.push({
        '@_name': formattedKey,
        '#text': escapeAndroidText(translation),
      });
    }

    const pluralItems: ASXmlPluralEntry[] = [];
    const plurals = entry.plurals?.[locale] ?? {};

    entries(plurals).forEach(([plurality, value]) => {
      pluralItems.push({
        '@_quantity': plurality,
        '#text': escapeAndroidText(value),
      });
    });

    if (pluralItems.length > 0) {
      outputIr.resources.plurals.push({
        '@_name': formattedKey,
        item: pluralItems,
      });
    }
  });

  const output = builder.build(outputIr);
  return `<?xml version="1.0" encoding="utf-8"?>\n${output}`;
}

/**
 * Escapes Android string-resource special characters. XML entities (`<`, `>`,
 * `&`) are handled by the XML builder; here we handle Android's own escapes:
 * the backslash, apostrophe and double-quote (which aapt would otherwise
 * reject or strip), plus newline and tab.
 *
 * @see https://developer.android.com/guide/topics/resources/string-resource#escaping_quotes
 */
function escapeAndroidText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Resolves the Android resource directory for a locale. Uses the plain
 * language qualifier (`values-en`) unless multiple requested locales share the
 * same language, in which case the region qualifier is added (`values-en-rGB`)
 * to avoid collisions.
 *
 * @see https://developer.android.com/guide/topics/resources/providing-resources#AlternativeResources
 */
function androidValuesDirectory(locale: Locale, locales: Locale[]): string {
  const language = toISO639_1LanguageCode(locale);

  const sharesLanguage =
    locales.filter(other => toISO639_1LanguageCode(other) === language).length >
    1;

  const region = getCountryFromLocale(locale);

  return sharesLanguage && region ?
      `values-${language}-${region}`
    : `values-${language}`;
}

/**
 * Constructs per-language datasets from a combined dataset.
 * This is necessary because Android Strings XML files are per-language.
 */
function constructPerLanguageDatasets(
  input: TranslationDataset,
  locales: Locale[]
): Partial<Record<Locale, TranslationDataset>> {
  const perLanguageDatasets: Partial<Record<Locale, TranslationDataset>> = {};

  Object.entries(input).forEach(([key, entry]) => {
    locales.forEach((locale: Locale) => {
      const builder = new DatasetBuilder();

      const plurals: TranslationPluralization = {};

      entries(entry.plurals?.[locale] ?? {}).forEach(
        ([plurality, translation]) => {
          plurals[locale] ??= {};
          plurals[locale][plurality] = translation;
        }
      );

      if (Object.keys(plurals).length > 0) {
        builder.addPluralEntry(key, plurals);
      } else {
        builder.addTranslation(key, {
          [locale]: entry.translations[locale] ?? '',
        });
      }

      perLanguageDatasets[locale] ??= {};
      merge(perLanguageDatasets[locale], builder.build());
    });
  });

  return perLanguageDatasets;
}

function transformToDataset(
  xmlObj: unknown,
  locale: Locale
): TranslationDataset {
  const ir = ASXmlDecoder.safeParse(xmlObj);
  if (!ir.success) {
    throw new ParsingError('Invalid Android Strings XML structure.', {
      cause: ir.error,
    });
  }

  const datasetBuilder = new DatasetBuilder();

  const singularTranslations: ASXmlSingularEntry[] = extractArray(
    ir.data.resources.string
  );
  const pluralTranslations: ASXmlPluralList[] = extractArray(
    ir.data.resources.plurals
  );

  singularTranslations.forEach((entry: ASXmlSingularEntry) => {
    datasetBuilder.addTranslationForLocale(
      entry['@_name'],
      locale,
      unescapeAndroidText(entry['#text'])
    );
  });

  pluralTranslations.forEach((entry: ASXmlPluralList) => {
    const key = entry['@_name'];

    datasetBuilder.addPluralEntry(key, extractPluralsFromEntry(entry, locale));
  });

  return datasetBuilder.build();
}

function extractPluralsFromEntry(
  plurals: ASXmlPluralList,
  baseLocale: Locale
): TranslationPluralization {
  return Object.fromEntries<TranslationPluralization>(
    plurals.item.map(({ '@_quantity': key, '#text': value }) => [
      key,
      { [baseLocale]: unescapeAndroidText(value) },
    ])
  );
}

/**
 * Reverses Android string-resource escaping: `\\`, `\'`, `\"` and the
 * `\n`/`\t` control escapes. XML entities are already resolved by the parser.
 */
function unescapeAndroidText(input: string): string {
  return input.replace(/\\(.)/g, (_, escaped: string) => {
    switch (escaped) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      default:
        return escaped;
    }
  });
}

const ASXmlSingularEntryDecoder = z.object({
  '#text': z.string(),
  '@_name': z.string(),
});

export type ASXmlSingularEntry = z.infer<typeof ASXmlSingularEntryDecoder>;

export const ASXmlPluralEntryDecoder = z.object({
  '@_quantity': z.enum(Plurality),
  '#text': z.string(),
});

export type ASXmlPluralEntry = z.infer<typeof ASXmlPluralEntryDecoder>;

export const ASXmlPluralListDecoder = z.object({
  '@_name': z.string(),
  item: z.array(ASXmlPluralEntryDecoder),
});

export type ASXmlPluralList = z.infer<typeof ASXmlPluralListDecoder>;

export const ASXmlDecoder = z.object({
  resources: z.object({
    // When the user only has a single resource entry, fast-xml-parser
    // will parse it as an object instead of an array.
    string: z.optional(
      z.union([z.array(ASXmlSingularEntryDecoder), ASXmlSingularEntryDecoder])
    ),
    plurals: z.optional(
      z.union([z.array(ASXmlPluralListDecoder), ASXmlPluralListDecoder])
    ),
  }),
});

export interface ASSerializationOutputSet {
  resources: {
    string: ASXmlSingularEntry[];
    plurals: {
      '@_name': string;
      item: ASXmlPluralEntry[];
    }[];
  };
}
