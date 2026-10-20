import { describe, expect, it } from 'vitest';
import {
  MAX_TRANSLATION_KEY_LENGTH,
  MIN_TRANSLATION_KEY_LENGTH,
} from '../common/index.js';
import { type TranslationDataset } from '../types.js';
import {
  mockParsingOptions,
  mockDataset,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { JsonDatasetTransformer } from './json-transformer.js';

const transformer = JsonDatasetTransformer;

describe('json parsing', () => {
  it('should parse a simple JSON dataset', () => {
    const dataset = `{
    "first-entry": {
    "translations": {
      "en_US": "hello",
      "nl_NL": "world"
    }
  },
  "second-entry": {
    "translations": {
      "en_US": "hello",
      "nl_NL": "again"
    }
  }
  }`;

    const parsed = transformer.parse(dataset, mockParsingOptions());
    expect(parsed).toBeDefined();
    expect(parsed).toEqual(
      expect.objectContaining({
        'first-entry': {
          translations: {
            en_US: 'hello',
            nl_NL: 'world',
          },
        },
        'second-entry': {
          translations: {
            en_US: 'hello',
            nl_NL: 'again',
          },
        },
      })
    );
  });

  describe('When translation keys are too short', () => {
    it('should throw', () => {
      const shortKey = 'a'.repeat(MIN_TRANSLATION_KEY_LENGTH - 1);
      expect(() =>
        transformer.parse(
          JSON.stringify({
            [shortKey]: {
              translations: { en_US: 'hello' },
              plurals: {},
            },
          } satisfies TranslationDataset),
          mockSerializationOptions()
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `[ParsingError: JSON structure is invalid: key aaa: Invalid key in record]`
      );
    });
  });

  describe('When translation keys are too long', () => {
    it('should throw', () => {
      const longKey = 'a'.repeat(MAX_TRANSLATION_KEY_LENGTH + 1);
      expect(() =>
        transformer.parse(
          JSON.stringify({
            [longKey]: {
              translations: { en_US: 'hello' },
              plurals: {},
            },
          } satisfies TranslationDataset),
          mockSerializationOptions()
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `[ParsingError: JSON structure is invalid: key aaaaaaa...aaaaaa: Invalid key in record]`
      );
    });
  });

  describe('When translation keys are of acceptable length', () => {
    it('should not throw', () => {
      const rightInTheMiddle =
        (MIN_TRANSLATION_KEY_LENGTH + MAX_TRANSLATION_KEY_LENGTH) / 2;
      const fineKey = 'a'.repeat(rightInTheMiddle);
      expect(() =>
        transformer.parse(
          JSON.stringify({
            [fineKey]: {
              translations: { en_US: 'hello' },
              plurals: {},
            },
          } satisfies TranslationDataset),
          mockSerializationOptions()
        )
      ).not.toThrow();
    });
  });
});

describe('json serialization', () => {
  it('should serialize a simple JSON dataset', () => {
    const serialized = transformer.serialize(
      mockDataset(),
      mockSerializationOptions()
    );

    expect(serialized).toHaveLength(1);
    expect(serialized[0]?.content).toMatchSnapshot();
  });
});
