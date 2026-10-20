import YAML, { parse } from 'yaml';
import { JsonTranslationDatasetDecoder } from '../common/decoders.js';
import {
  type ParsingOptions,
  type SerializationFile,
  type SerializationOptions,
  type TranslationDataset,
} from '../types.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import { makeLanguageTransformer } from './transformer.js';

export const YamlDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.YAML,
  extensions: ['.yml', '.yaml'],
  parse(input: string, _options: ParsingOptions): TranslationDataset {
    try {
      const parsedYaml: unknown = parse(input);

      const parsedDataset = JsonTranslationDatasetDecoder.safeParse(parsedYaml);

      if (!parsedDataset.success) {
        throw new ParsingError('YAML dataset is invalid', {
          cause: parsedDataset.error,
        });
      }

      return parsedDataset.data;
    } catch (e) {
      throw new ParsingError(
        'Something went wrong whilst trying to parse yaml',
        {
          cause: e,
        }
      );
    }
  },

  serialize(
    dataset: TranslationDataset,
    _options: SerializationOptions
  ): SerializationFile[] {
    const content = YAML.stringify(dataset);

    return [
      {
        content,
        filePath: DEFAULT_YAML_FILE_NAME + this.extensions[0],
      },
    ];
  },
});

export const DEFAULT_YAML_FILE_NAME = 'labels';
