import { LocaleDecoder } from '../common/index.js';
import { DatasetBuilder } from '../dataset-builder.js';
import {
  type ParsingOptions,
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import { type Locale, toISO639_1LanguageCode } from '../locales/index.js';
import { makeLanguageTransformer } from './transformer.js';
import { entries, isEmptyArray } from '@vxti/typed';
import Builder, { type XMLBuilder } from 'fast-xml-builder';
import { XMLParser } from 'fast-xml-parser';
import * as z from 'zod/v4';

export const XLIFFDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.XLIFF,
  extensions: ['.xlf', '.xliff'],
  isSingleFileOutput: false,
  parse(input: string, _options: ParsingOptions): TranslationDataset {
    try {
      const parser = new XMLParser({ ignoreAttributes: false });

      const xmlObj: unknown = parser.parse(input);
      const parsed = XLIFF21Decoder.safeParse(xmlObj);

      if (!parsed.success) {
        throw new Error(
          `The XLIFF 2.1 file structure is invalid: ${parsed.error.message}`
        );
      }

      const xliff = parsed.data.xliff;

      const srcLang: Locale = xliff['@_srcLang'];
      const tgtLang: Locale | undefined = xliff['@_trgLang'] ?? undefined;

      const units = xliff.file.unit;
      const arr = Array.isArray(units) ? units : [units];

      const datasetBuilder = new DatasetBuilder();

      for (const unit of arr) {
        const key = unit['@_id'];
        const seg = unit.segment;
        const source = seg.source ?? '';
        const target = seg.target ?? '';

        datasetBuilder.addTranslation(key, {
          [srcLang]: source,
          ...(tgtLang ? { [tgtLang]: target } : {}),
        });
      }

      return datasetBuilder.build();
    } catch (e) {
      throw new ParsingError(
        `Failed to parse XLIFF 2.1 content: ${(e as Error).message}`
      );
    }
  },
  serialize(
    input: TranslationDataset,
    options: SerializationOptions
  ): SerializationFile[] {
    const { locales, referenceLocale } = options;
    const builder = new Builder({
      ignoreAttributes: false,
      format: true,
      suppressEmptyNode: true,
    });

    const nonReferenceLocales: Locale[] = locales.filter(
      (loc: Locale) => loc !== referenceLocale
    );

    // If there are no non-reference locales, create a single fragment with only the source language.
    if (isEmptyArray(nonReferenceLocales)) {
      const { filename, content } = serializeSingular(input, builder, options);
      return [
        {
          locale: referenceLocale,
          filePath: filename,
          content,
        },
      ];
    }

    return nonReferenceLocales.map((locale: Locale) => {
      const dataset: TranslationDataset = {};

      entries(input).forEach(([key, entry]) => {
        dataset[key] = {
          plurals: {},
          translations: {
            [referenceLocale]: entry.translations[referenceLocale] || '',
            [locale]: entry.translations[locale] || '',
          },
        };
      });

      const { filename, content } = constructXliff21Fragment(
        builder,
        dataset,
        locale,
        referenceLocale
      );

      return {
        filePath: filename,
        locale,
        content,
      };
    });
  },
});

function serializeSingular(
  input: TranslationDataset,
  xmlBuilder: XMLBuilder,
  options: SerializationOptions
): { filename: string; content: string } {
  const datasetBuilder = new DatasetBuilder();

  entries(input).forEach(([key, entry]) => {
    const locale: Locale = options.referenceLocale;
    const value: string = entry.translations[options.referenceLocale] || '';

    datasetBuilder.addTranslation(key, { [locale]: value });
  });

  return constructXliff21Fragment(
    xmlBuilder,
    datasetBuilder.build(),
    undefined,
    options.referenceLocale
  );
}

// XLIFF 2.1 builder
function constructXliff21Fragment(
  builder: XMLBuilder,
  dataset: TranslationDataset,
  targetLocale: Locale | undefined,
  sourceLocale: Locale
): { filename: string; content: string } {
  const xliffObj = {
    xliff: {
      '@_version': '2.1',
      // XLIFF 2.1 reuses the XLIFF 2.0 core namespace URI; there is no
      // ":2.1" core namespace. See the OASIS XLIFF 2.1 specification.
      '@_xmlns': 'urn:oasis:names:tc:xliff:document:2.0',
      '@_srcLang': toISO639_1LanguageCode(sourceLocale),
      ...(targetLocale ?
        { '@_trgLang': toISO639_1LanguageCode(targetLocale) }
      : {}),
      file: {
        '@_id': 'f1',
        unit: Object.entries(dataset).map(([key, entry]) => ({
          '@_id': key,
          segment: {
            source: entry.translations[sourceLocale] || '',
            ...(targetLocale ?
              { target: entry.translations[targetLocale] || '' }
            : {}),
          },
        })),
      },
    },
  };

  const rawXmlContent = builder.build(xliffObj);
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n${rawXmlContent}`;

  return {
    filename: targetLocale ?? sourceLocale,
    content,
  };
}

export const XLIFF21UnitDecoder = z.object({
  '@_id': z.string(),
  segment: z.object({
    source: z.string().optional(),
    target: z.string().optional(),
  }),
});

export const XLIFF21Decoder = z.object({
  xliff: z.object({
    '@_version': z.string(),
    '@_xmlns': z.string(),
    '@_srcLang': LocaleDecoder,
    '@_trgLang': LocaleDecoder.optional(),
    file: z.object({
      '@_id': z.string().optional(),
      unit: z.union([XLIFF21UnitDecoder, z.array(XLIFF21UnitDecoder)]),
    }),
  }),
});
