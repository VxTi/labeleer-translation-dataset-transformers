/* eslint-disable @typescript-eslint/no-explicit-any */
import { entries, type NonEmptyArray } from '@vxti/typed';
import {
  type MakeOptional,
  type ParsingOptions,
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import type { FileFormat } from './file-formats.js';
import type { Locale } from '../locales/index.js';
import { merge } from 'lodash-es';

export type FileExtension<T extends string = string> = `.${T}`;

export interface LanguageFileTransformer<
  TFormat extends FileFormat,
  TFileExtensions extends NonEmptyArray<FileExtension>,
  TParseOptions extends ParsingOptions,
  TSerializeOptions extends SerializationOptions = SerializationOptions,
> {
  readonly fileFormat: TFormat;
  readonly extensions: TFileExtensions;

  defaultExtension: TFileExtensions[0];

  canParse(extension: string): extension is NoInfer<TFileExtensions>[number];

  parse(input: string, options: TParseOptions): TranslationDataset;

  formatKey(key: string): string;

  /**
   * Whether the transformer produces a single file when serialized
   */
  isSingleFileOutput: boolean;

  parseAggregate(
    inputs: Partial<Record<Locale, string>>,
    options: NoInfer<TParseOptions> // Infer from main parsing method
  ): TranslationDataset;

  serialize(
    dataset: TranslationDataset,
    options: TSerializeOptions
  ): SerializationFile[];
}

type SomeLanguageFileTransformer = LanguageFileTransformer<
  FileFormat,
  NonEmptyArray<FileExtension>,
  any,
  any
>;

export function makeLanguageTransformer<
  TFormat extends FileFormat = FileFormat,
  TFileExtensions extends NonEmptyArray<FileExtension> =
    NonEmptyArray<FileExtension>,
  TParseOptions extends ParsingOptions = ParsingOptions,
  TSerializeOptions extends SerializationOptions = SerializationOptions,
>(
  options: MakeOptional<
    Omit<
      LanguageFileTransformer<
        TFormat,
        TFileExtensions,
        TParseOptions,
        TSerializeOptions
      >,
      'canParse'
    >,
    'parseAggregate' | 'formatKey' | 'isSingleFileOutput' | 'defaultExtension'
  >
): LanguageFileTransformer<
  TFormat,
  TFileExtensions,
  TParseOptions,
  TSerializeOptions
> {
  return {
    formatKey: $in => $in, // No transformation
    isSingleFileOutput: true,
    defaultExtension: options.extensions[0],
    ...options,
    canParse(extension: string): extension is NoInfer<TFileExtensions>[number] {
      const normalized = extension.toLowerCase().trim();

      return this.extensions.some(ext => {
        const candidate = ext.toLowerCase();

        return (
          normalized === candidate ||
          normalized === candidate.replace(/^\./, '') ||
          normalized.endsWith(candidate)
        );
      });
    },
    parseAggregate(
      inputs: Partial<Record<Locale, string>>,
      parsingOptions: NoInfer<TParseOptions> // Inferred from main parsing function
    ): TranslationDataset {
      const dataset: TranslationDataset = {};

      entries(inputs).forEach(([locale, value]) => {
        const parsed = options.parse(value, {
          ...parsingOptions,
          targetLocale: locale,
        });
        merge(dataset, parsed);
      });

      return dataset;
    },
  };
}

// Utility types (not relevant for library consumers)

type InferLanguageFileFormat<T extends SomeLanguageFileTransformer> =
  T extends LanguageFileTransformer<infer Fmt, any, any, any> ? Fmt : never;

export type InferExtensions<T extends SomeLanguageFileTransformer> =
  T extends LanguageFileTransformer<any, infer ExtArr, any, any> ?
    ExtArr extends [infer _Ext, ...infer _Rest] ?
      ExtArr[number]
    : never
  : never;

type InferParserWithExtension<
  Ext extends FileExtension,
  TTransformer extends SomeLanguageFileTransformer,
> =
  TTransformer extends LanguageFileTransformer<any, infer SomeExts, any, any> ?
    SomeExts extends [Ext] ?
      TTransformer
    : never
  : never;

type InferParserWithFormat<
  TTransformer extends SomeLanguageFileTransformer,
  TFmt extends FileFormat,
> =
  TTransformer extends LanguageFileTransformer<infer TSomeFmt, any, any, any> ?
    TSomeFmt extends TFmt ?
      TTransformer
    : never
  : never;

type InferParsingOptions<T> =
  T extends LanguageFileTransformer<any, any, infer Opt, any> ? Opt : never;

export interface ParserSet<TTransformers extends SomeLanguageFileTransformer> {
  formats(): InferLanguageFileFormat<NoInfer<TTransformers>>[];

  singleOutputFormats: FileFormat[];
  multipleOutputFormats: FileFormat[];

  getByExtension<TExt extends InferExtensions<TTransformers>>(
    extension: TExt
  ): InferParserWithExtension<TExt, TTransformers>;
  getByExtension<TExt extends FileExtension>(
    extension: TExt
  ): InferParserWithExtension<TExt, TTransformers> | undefined;

  getSupportedExtensions(): InferExtensions<TTransformers>[];

  hasFormat(
    format: FileFormat
  ): format is InferLanguageFileFormat<TTransformers>;

  getByFormat<TFmt extends InferLanguageFileFormat<TTransformers>>(
    format: TFmt
  ): InferParserWithFormat<TTransformers, TFmt>;

  parse<TFmt extends InferLanguageFileFormat<TTransformers>>(
    input: string,
    format: TFmt,
    options: InferParsingOptions<
      InferParserWithFormat<NoInfer<TTransformers>, NoInfer<TFmt>>
    >
  ): TranslationDataset;

  parseAggregate<TFmt extends InferLanguageFileFormat<TTransformers>>(
    inputs: Partial<Record<Locale, string>>,
    format: TFmt,
    options: InferParsingOptions<InferParserWithFormat<TTransformers, TFmt>>
  ): TranslationDataset;

  serialize(
    dataset: TranslationDataset,
    format: InferLanguageFileFormat<TTransformers>,
    options: SerializationOptions
  ): SerializationFile[];
}

export function makeParserSet<
  TTransformers extends SomeLanguageFileTransformer,
>(transformers: TTransformers[]): ParserSet<TTransformers> {
  const getByFormat = <TFmt extends InferLanguageFileFormat<TTransformers>>(
    format: TFmt
  ): InferParserWithFormat<TTransformers, TFmt> => {
    // Normally, this would yield 'T | undefined', though
    // since we statically know which types are possible,
    // this *should* always return a value
    return transformers.find(
      tfm => tfm.fileFormat === format
    ) as InferParserWithFormat<TTransformers, TFmt>;
  };

  const hasFormat = (
    format: FileFormat
  ): format is InferLanguageFileFormat<TTransformers> => {
    return transformers.find(tfm => tfm.fileFormat === format) !== undefined;
  };

  const parse = <TFmt extends InferLanguageFileFormat<TTransformers>>(
    input: string,
    format: TFmt,
    options: InferParsingOptions<InferParserWithFormat<TTransformers, TFmt>>
  ): TranslationDataset => getByFormat(format).parse(input, options);

  const parseAggregate = <TFmt extends InferLanguageFileFormat<TTransformers>>(
    inputs: Partial<Record<Locale, string>>,
    format: TFmt,
    options: InferParsingOptions<InferParserWithFormat<TTransformers, TFmt>>
  ): TranslationDataset => getByFormat(format).parseAggregate(inputs, options);

  const serialize = <TOpt extends TTransformers>(
    dataset: TranslationDataset,
    format: InferLanguageFileFormat<TOpt>,
    options: SerializationOptions
  ): SerializationFile[] => getByFormat(format).serialize(dataset, options);

  const formats = (): InferLanguageFileFormat<TTransformers>[] => {
    return transformers.map(
      tfm => tfm.fileFormat
    ) as InferLanguageFileFormat<TTransformers>[];
  };

  const getSupportedExtensions = (): InferExtensions<TTransformers>[] =>
    transformers
      .map(trf => trf.extensions)
      .flat() as InferExtensions<TTransformers>[];

  const getByExtension = <
    TExt extends FileExtension | InferExtensions<TTransformers>,
  >(
    extension: TExt | string
  ): InferParserWithExtension<TExt, TTransformers> => {
    return transformers.find(tft =>
      tft.extensions.includes(extension as FileExtension)
    ) as InferParserWithExtension<TExt, TTransformers>;
  };

  return {
    multipleOutputFormats: transformers
      .filter(t => !t.isSingleFileOutput)
      .map(t => t.fileFormat),
    singleOutputFormats: transformers
      .filter(t => t.isSingleFileOutput)
      .map(t => t.fileFormat),
    getSupportedExtensions,
    getByExtension,
    getByFormat,
    hasFormat,
    parse,
    parseAggregate,
    serialize,
    formats,
  };
}
