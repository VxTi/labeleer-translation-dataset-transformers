import { LocaleDecoder } from '../common/index.js';
import { DatasetBuilder } from '../dataset-builder.js';
import {
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import { type Locale, Plurality, toBCP47 } from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';
import { entries } from '@vxti/typed';
import { tryParseJson } from '../util/parsing.js';
import { merge } from 'lodash-es';
import * as z from 'zod/v4';

export const XCStringsDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.XCSTRINGS,
  extensions: ['.xcstrings'],

  parse(input: string): TranslationDataset {
    const json = tryParseJson(input);
    if (!json) {
      throw new ParsingError('Invalid JSON format for xcstrings dataset');
    }
    const decoded = XCStringsDatasetDecoder.safeParse(json);

    if (!decoded.success) {
      throw new ParsingError(
        `Failed to parse xcstrings: ${decoded.error.message}`
      );
    }

    const datasetBuilder = new DatasetBuilder();

    entries(decoded.data.strings).forEach(([key, entry]) => {
      entries(entry.localizations).forEach(([unsafeLocale, localization]) => {
        const localeParseResult = LocaleDecoder.safeParse(unsafeLocale);

        if (!localeParseResult.success) {
          throw new ParsingError(
            `Invalid locale code in xcstrings for key "${key}": ${unsafeLocale}`
          );
        }

        const locale: Locale = localeParseResult.data;

        if (isAtomicLocalizationEntry(localization)) {
          datasetBuilder.addTranslation(key, {
            [locale]: localization.stringUnit.value,
          });
        } else {
          // It's a plural translation!
          const pluralVariations = localization.variations.plural;
          const zero = pluralVariations.zero?.stringUnit.value;
          const one = pluralVariations.one.stringUnit.value;
          const other = pluralVariations.other.stringUnit.value;

          datasetBuilder.addPluralEntry(key, {
            [locale]: {
              ...(zero ? { zero } : {}),
              one,
              other,
            },
          });
        }
      });
    });

    return datasetBuilder.build();
  },

  serialize(
    dataset: TranslationDataset,
    options: SerializationOptions
  ): SerializationFile[] {
    const { referenceLocale, locales } = options;
    const xcstrings: XCStringsDataset = {
      // Xcode String Catalogs use BCP 47 language identifiers (`en`, `en-GB`).
      sourceLanguage: toBCP47(referenceLocale),
      strings: {},
      version: '1.0',
    };

    entries(dataset).forEach(([key, entry]) => {
      const stringUnit: XCStringsTranslationEntry = {
        comment: entry.description ?? '',
        extractionState: 'manual',
        localizations: {},
      };

      locales.forEach((locale: Locale) => {
        const languageTag = toBCP47(locale);

        if (entry.translations[locale]) {
          stringUnit.localizations[languageTag] = {
            stringUnit: {
              state: 'translated',
              value: entry.translations[locale] ?? '',
            },
          };
        }

        const pluralization = entry.plurals?.[locale];

        entries(pluralization ?? {}).forEach(([plurality, value]) => {
          const variation: XCStringsPluralVariations =
            pluralityToXcstringsType(plurality);

          merge(stringUnit.localizations, {
            [languageTag]: {
              variations: {
                plural: {
                  [variation]: {
                    stringUnit: { state: 'translated', value },
                  },
                },
              },
            },
          });
        });
      });

      xcstrings.strings[key] = stringUnit;
    });

    const content = JSON.stringify(xcstrings, null, 2);

    return [
      {
        filePath: DEFAULT_XCSTRINGS_FILE_NAME + this.extensions[0],
        content,
      },
    ];
  },
});

function pluralityToXcstringsType(
  pluralForm: Plurality
): XCStringsPluralVariations {
  switch (pluralForm) {
    case Plurality.ZERO:
    case Plurality.ONE:
      return pluralForm;
    default:
      return 'other';
  }
}

function isAtomicLocalizationEntry(
  entry: z.infer<typeof XCStringsLocalizationEntryDecoder>
): entry is z.infer<typeof XCStringsAtomicLocalizationEntryDecoder> {
  return typeof entry === 'object' && 'stringUnit' in entry;
}

export const DEFAULT_XCSTRINGS_FILE_NAME = 'translations';

export const XCStringsAtomicLocalizationEntryDecoder = z.object({
  stringUnit: z.object({
    state: z.string(),
    value: z.string(),
  }),
});

export const pluralLocalizationEntry = z.object({
  variations: z.object({
    plural: z.object({
      zero: XCStringsAtomicLocalizationEntryDecoder.optional(),
      one: XCStringsAtomicLocalizationEntryDecoder,
      other: XCStringsAtomicLocalizationEntryDecoder,
    }),
  }),
});

export type XCStringsPluralVariations = keyof z.infer<
  typeof pluralLocalizationEntry.shape.variations.shape.plural
>;

export type XCStringsPluralLocalizationEntry = z.infer<
  typeof pluralLocalizationEntry
>;

export const XCStringsLocalizationEntryDecoder = z.union([
  XCStringsAtomicLocalizationEntryDecoder,
  pluralLocalizationEntry,
]);

export const XCStringsTranslationEntryDecoder = z.object({
  comment: z.string(),
  extractionState: z.enum(['manual']),
  localizations: z.record(
    // Intentionally don't use `LocaleParser`, as we can't index
    // into `localizations` with BCP47 locales, only Locale types
    z.string(/* Locale */).refine(val => {
      return LocaleDecoder.safeParse(val).success;
    }),
    XCStringsLocalizationEntryDecoder
  ),
});

export type XCStringsTranslationEntry = z.infer<
  typeof XCStringsTranslationEntryDecoder
>;

export const XCStringsDatasetDecoder = z.object({
  version: z.string(),
  sourceLanguage: z.string().optional(),
  strings: z.record(z.string(), XCStringsTranslationEntryDecoder),
});

export type XCStringsDataset = z.infer<typeof XCStringsDatasetDecoder>;
