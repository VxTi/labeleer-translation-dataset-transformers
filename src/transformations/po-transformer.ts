import { hasArrayLengthAtLeast, isNonEmptyString, entries } from '@vxti/typed';
import { DatasetBuilder } from '../dataset-builder.js';
import type {
  ParsingOptions,
  SerializationOptions,
  SerializationResult,
  TranslationDataset,
  TranslationPluralization,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import {
  type Locale,
  Plurality,
  toISO639_1LanguageCode,
} from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';
import {
  type GetTextTranslation,
  type GetTextTranslations,
  po,
} from 'gettext-parser';

export const PODatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.PO,
  extensions: ['.po', '.pot'],
  isSingleFileOutput: false,
  parse(input: string, options: ParsingOptions): TranslationDataset {
    const { targetLocale } = options;

    if (!targetLocale) {
      throw new ParsingError('Target locale is required for parsing PO files.');
    }
    try {
      const output = po.parse(input);
      const builder = new DatasetBuilder();

      Object.values(output.translations).forEach(context => {
        entries<string, GetTextTranslation>(context).forEach(([key, entry]) => {
          if (!key) return; // skip empty header

          const plurals = extractPlurals(targetLocale, entry);

          if (plurals) {
            builder.addPluralEntry(key, plurals);
          } else {
            builder.addTranslation(key, {
              [targetLocale]: entry.msgstr[0] || '',
            });
          }

          builder
            .addDescription(key, entry.comments?.extracted)
            .addTags(key, entry.comments?.reference?.split('\n'));
        });
      });

      return builder.build();
    } catch (error) {
      throw new ParsingError(`Failed to parse PO input: ${String(error)}`, {
        cause: error as Error,
      });
    }
  },

  /**
   * PO files are single-locale, keyed off {@link ParsingOptions.targetLocale},
   * so each aggregated input is parsed against its own locale.
   */
  parseAggregate(
    inputs: Partial<Record<Locale, string>>,
    options: ParsingOptions
  ): TranslationDataset {
    const builder = new DatasetBuilder();

    for (const [locale, content] of entries(inputs)) {
      const dataset = this.parse(content, {
        ...options,
        targetLocale: locale,
      });

      builder.merge(dataset);
    }

    return builder.build();
  },

  serialize(
    dataset: TranslationDataset,
    options: SerializationOptions
  ): SerializationResult {
    const { locales, referenceLocale } = options;

    return Object.fromEntries(
      locales.map((locale: Locale) => {
        const { filename, content } = constructPoSerializationFragment(
          dataset,
          locale,
          referenceLocale,
          this.extensions
        );

        return [filename, { locale, content }];
      })
    );
  },
});

/**
 * Maps gettext `msgstr[n]` indices to CLDR plural categories. gettext's index
 * 0 is the singular (`one`) and index 1 the plural (`other`); the remaining
 * categories cover languages that declare more than two plural forms.
 *
 * The true index→category mapping is language-specific (defined by each file's
 * `Plural-Forms` rule); absent a plural-rules table this canonical order is a
 * pragmatic, deterministic approximation.
 */
const PO_PLURAL_ORDER = [
  Plurality.ONE,
  Plurality.OTHER,
  Plurality.TWO,
  Plurality.FEW,
  Plurality.MANY,
  Plurality.ZERO,
] as const;

function extractPlurals(
  targetLocale: Locale,
  entry: GetTextTranslation
): TranslationPluralization | undefined {
  const plurals: TranslationPluralization = {};

  const { msgstr } = entry;

  if (!entry.msgid_plural || !hasArrayLengthAtLeast(msgstr, 2)) {
    return;
  }

  msgstr.slice(0, PO_PLURAL_ORDER.length).forEach((plural, index) => {
    if (!isNonEmptyString(plural, true)) return;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const plurality = PO_PLURAL_ORDER[index]!;
    plurals[targetLocale] ??= {};
    plurals[targetLocale][plurality] = plural;
  });

  return plurals;
}

function constructPoSerializationFragment(
  input: TranslationDataset,
  locale: Locale,
  _referenceLocale: Locale,
  extensions: ['.po', '.pot']
): { filename: string; content: string } {
  // TODO: Add support for more headers (e.g., Project-Id-Version, POT-Creation-Date, etc.)
  // And also different encoding types
  const output: GetTextTranslations = {
    charset: 'UTF-8',
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      Language: toISO639_1LanguageCode(locale),
      // gettext needs Plural-Forms to interpret msgstr[n]. We emit the common
      // two-form rule (as used by English/Germanic languages); consequently
      // only the `one`/`other` forms are exported.
      'Plural-Forms': 'nplurals=2; plural=(n != 1);',
    },
    translations: { '': {} },
  };

  for (const [key, entry] of entries(input)) {
    const poEntry: GetTextTranslation = {
      msgid: key,
      msgstr: [],
    };

    if ('translations' in entry) {
      poEntry.msgstr[0] = entry.translations[locale] || '';
    }

    if (entry.description) {
      poEntry.comments = {
        extracted: entry.description,
      };
    }

    if (entry.tags) {
      poEntry.comments = poEntry.comments || {};
      poEntry.comments.reference = entry.tags.join('\n');
    }

    const { one, other } = entry.plurals?.[locale] ?? {};

    if (one !== undefined || other !== undefined) {
      // `msgid_plural` is the source-language plural form; `msgstr[0]`/`[1]`
      // are the target's singular (`one`) and plural (`other`) translations.
      poEntry.msgid_plural = other ?? key;
      poEntry.msgstr = [one ?? '', other ?? ''];
    }

    output.translations[''] ??= {};
    output.translations[''][key] = poEntry;
  }

  const content = po.compile(output).toString('utf-8');

  return {
    filename: locale + extensions[0],
    content,
  };
}
