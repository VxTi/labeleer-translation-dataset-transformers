import { hasArrayLengthAtLeast, entries } from '@vxti/typed';
import { DatasetBuilder } from '../dataset-builder.js';
import {
  type ParsingOptions,
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import { type Locale, toBCP47 } from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';

export interface AppleStringsSerializationOptions extends SerializationOptions {
  keylessTranslation?: boolean;
}

export const AppleStringsDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.APPLE_STRINGS,
  extensions: ['.strings'],
  isSingleFileOutput: false,
  parse(input: string, options: ParsingOptions): TranslationDataset {
    const { targetLocale } = options;
    if (!targetLocale) {
      throw new ParsingError(
        'Locale is required for parsing Apple .strings files.'
      );
    }

    const lines = input.split('\n');
    const builder = new DatasetBuilder();

    for (const line of lines) {
      const match = line.match(APPLE_STRING_LINE_REGEX);

      if (!match || !hasArrayLengthAtLeast(match, 3)) continue;

      const [, key, value] = match;

      builder.addTranslation(unescapeText(key), {
        [targetLocale]: unescapeText(value),
      });
    }

    return builder.build();
  },

  /**
   * Apple `.strings` files are single-locale, keyed off
   * {@link ParsingOptions.targetLocale}, so each aggregated input is parsed
   * against its own locale.
   */
  parseAggregate(
    inputs: Partial<Record<Locale, string>>,
    options: ParsingOptions
  ): TranslationDataset {
    const builder = new DatasetBuilder();

    for (const [targetLocale, content] of entries(inputs)) {
      const dataset = this.parse(content, {
        ...options,
        targetLocale,
      });

      builder.merge(dataset);
    }

    return builder.build();
  },

  serialize(
    dataset: TranslationDataset,
    options: AppleStringsSerializationOptions
  ): SerializationFile[] {
    return options.locales.map(locale => {
      const { filename, content } = constructAppleStringsSerializationFragment(
        dataset,
        locale
      );

      return {
        filePath: filename + this.extensions[0],
        locale,
        content,
      };
    });
  },
});

export const APPLE_STRING_LINE_REGEX =
  /^\s*\uFEFF?"((?:[^"\\]|\\(?:U[0-9A-Fa-f]{4}|.))*)"\s*=\s*"((?:[^"\\]|\\(?:U[0-9A-Fa-f]{4}|.))*)"\s*;\s*$/;

function unescapeText(input: string): string {
  return input.replace(/\\([Uu][0-9A-Fa-f]{4}|.)/g, (_, escape: string) => {
    if (escape[0] === 'U' || escape[0] === 'u') {
      return String.fromCharCode(parseInt(escape.slice(1), 16));
    }

    switch (escape) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      default:
        return escape;
    }
  });
}

function constructAppleStringsSerializationFragment(
  dataset: TranslationDataset,
  targetLocale: Locale
): { filename: string; content: string } {
  const kvMapping: Record<string, string> = {};

  for (const [key, entry] of entries(dataset)) {
    kvMapping[key] = entry.translations[targetLocale] ?? '';
  }

  const content = entries(kvMapping)
    .map(([key, value]) => `"${escapeText(key)}" = "${escapeText(value)}";`)
    .join('\n');

  return {
    content,
    // Apple `.strings` files live in BCP 47 named `.lproj` directories
    // (e.g. `en.lproj`, `en-GB.lproj`).
    filename: toBCP47(targetLocale),
  };
}

/**
 * Escapes a string for an Apple `.strings` literal. The backslash must be
 * escaped first so the escapes introduced afterwards are not re-escaped.
 */
function escapeText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
