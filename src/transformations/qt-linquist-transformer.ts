import { DatasetBuilder } from '../dataset-builder.js';
import {
  type ParsingOptions,
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import {
  type Locale,
  isBCP47Locale,
  isLocale,
  toPOSIX,
} from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';
import { extractArray } from '../util/data-extraction.js';
import Builder, { type XMLBuilder } from 'fast-xml-builder';
import { XMLParser } from 'fast-xml-parser';
import { entries } from '@vxti/typed';
import * as z from 'zod/v4';

export const TsDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.TS,
  extensions: ['.ts'],
  isSingleFileOutput: false,
  parse(input: string, options: ParsingOptions): TranslationDataset {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
      });

      const xmlObj: unknown = parser.parse(input);

      const parsed = TSLinquistDatasetDecoder.safeParse(xmlObj);

      if (!parsed.success) {
        throw new Error(
          `The TS file structure is invalid: ${parsed.error.message}`
        );
      }

      const TS = parsed.data.TS;

      // `sourcelanguage` is the source; fall back to the caller's reference
      // locale for files that omit it. `language` is the target.
      const sourceLocale: Locale =
        TS['@_sourcelanguage'] ?? options.referenceLocale;
      const targetLocale: Locale | undefined = TS['@_language'];

      const datasetBuilder = new DatasetBuilder();

      const messages: LinquistTsMessage[] = extractArray(TS.context.message);

      messages.forEach((msg: LinquistTsMessage) => {
        // Qt keys ID-based messages off the `id` attribute; otherwise the
        // source text is the identity.
        const key = msg['@_id'] ?? msg.source;

        datasetBuilder.addTranslation(key, {
          [sourceLocale]: msg.source || '',
          ...(targetLocale && targetLocale !== sourceLocale ?
            { [targetLocale]: msg.translation || '' }
          : {}),
        });
      });

      return datasetBuilder.build();
    } catch (e) {
      throw new ParsingError(
        'Something went wrong while trying to parse the TS file.',
        { cause: e }
      );
    }
  },

  serialize(
    input: TranslationDataset,
    options: SerializationOptions
  ): SerializationFile[] {
    const { referenceLocale, locales } = options;
    const nonReferenceLanguages = locales.filter(
      loc => loc !== referenceLocale
    );
    const builder = new Builder({
      ignoreAttributes: false,
      format: true,
    });

    if (nonReferenceLanguages.length === 0) {
      const { filename, content } = constructTsSerializationFragment(
        builder,
        input,
        undefined,
        referenceLocale
      );

      return [
        {
          locale: referenceLocale,
          filePath: filename + this.extensions[0],
          content,
        },
      ];
    }

    return nonReferenceLanguages.map(locale => {
      const { filename, content } = constructTsSerializationFragment(
        builder,
        input,
        locale,
        referenceLocale
      );
      return {
        filePath: filename + this.extensions[0],
        content,
        locale,
      };
    });
  },
});

function constructTsSerializationFragment(
  builder: XMLBuilder,
  dataset: TranslationDataset,
  locale: Locale | undefined,
  referenceLocale: Locale
): { filename: string; content: string } {
  const tsObj = {
    TS: {
      '@_version': '2.1',
      // Qt language attributes use POSIX-style codes (e.g. `en_US`).
      '@_sourcelanguage': referenceLocale,
      '@_language': locale ?? referenceLocale,
      context: {
        name: 'Labeleer Translations',
        message: entries(dataset).map(([key, entry]) => ({
          '@_id': key,
          source: entry.translations[referenceLocale] ?? '',
          // It's not necessary to translate *to* another language
          // as one can also just use TS files for a single language.
          ...(locale ? { translation: entry.translations[locale] || '' } : {}),
        })),
      },
    },
  };

  const body = builder.build(tsObj);
  const content = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE TS>\n${body}`;

  return {
    content,
    filename: locale ?? referenceLocale,
  };
}

/**
 * Normalises a Qt language attribute (e.g. `en_US` or `en-US`) to a POSIX
 * {@link Locale}, or `undefined` when it is not a recognised locale.
 */
const localeAttribute = z.string().transform(val =>
  isLocale(val) ? val
  : isBCP47Locale(val) ? toPOSIX(val)
  : undefined
);

export const TSLinquistMessageDecoder = z.object({
  // Qt identifies ID-based messages via the optional `id` attribute; when it
  // is absent the `<source>` text is the identity.
  '@_id': z.string().optional(),
  source: z.string(),
  translation: z.string().optional(),
});

export type LinquistTsMessage = z.infer<typeof TSLinquistMessageDecoder>;

export const TSLinquistDatasetDecoder = z.object({
  TS: z.object({
    '@_sourcelanguage': localeAttribute.optional(),
    '@_language': localeAttribute.optional(),
    context: z.object({
      name: z.string().optional(),
      message: z.union([
        z.array(TSLinquistMessageDecoder),
        TSLinquistMessageDecoder,
      ]),
    }),
  }),
});
