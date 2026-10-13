import { ellipsize } from '../util/formatting.js';
import { tryParseJson } from '../util/parsing.js';
import { JsonTranslationDatasetDecoder } from '../common/index.js';
import type {
  ParsingOptions,
  SerializationOptions,
  SerializationResult,
  TranslationDataset,
} from '../definitions.js';
import { ParsingError } from '../errors.js';
import { FileFormat } from './file-formats.js';
import { makeLanguageTransformer } from './transformer.js';

export const JsonDatasetTransformer = makeLanguageTransformer({
  fileFormat: FileFormat.JSON,
  extensions: ['.json'],
  parse(input: string, _options: ParsingOptions): TranslationDataset {
    const json = tryParseJson(input);
    if (!json) {
      throw new ParsingError(
        'Invalid JSON format. Please ensure the input is valid JSON.'
      );
    }

    const result = JsonTranslationDatasetDecoder.safeParse(json);

    if (!result.success) {
      throw new ParsingError(
        `JSON structure is invalid: ${result.error.issues.map(i => `key ${ellipsize(i.path.join('.'), 16)}: ${i.message}`).join(', ')}`
      );
    }
    return result.data;
  },

  serialize(
    dataset: TranslationDataset,
    _options: SerializationOptions
  ): SerializationResult {
    const content = JSON.stringify(dataset, null, 2);

    return {
      [DEFAULT_JSON_FILE_NAME + this.extensions[0]]: { content },
    };
  },
});

export const DEFAULT_JSON_FILE_NAME = 'labels';
