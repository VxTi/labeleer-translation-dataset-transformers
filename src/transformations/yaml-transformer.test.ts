import { describe, it, expect } from 'vitest';
import { Plurality } from '../locales/index.js';
import { YamlDatasetTransformer } from './yaml-transformer.js';
import { mockSerializationOptions } from '../__testutils__/index.js';

const transformer = YamlDatasetTransformer;

describe('yaml serialization', () => {
  it('should serialize a simple YAML dataset', () => {
    const serialized = transformer.serialize(
      {
        pluralForm: {
          translations: {},
          plurals: {
            en_US: {
              [Plurality.ONE]: 'hello',
            },
            nl_NL: {
              [Plurality.OTHER]: 'world',
            },
          },
        },
      },
      mockSerializationOptions()
    );

    expect(serialized).toBeDefined();
    expect(serialized).toMatchInlineSnapshot(`
      {
        "labels.yml": {
          "content": "pluralForm:
        translations: {}
        plurals:
          en_US:
            one: hello
          nl_NL:
            other: world
      ",
        },
      }
    `);
  });
});

describe('yaml parsing', () => {
  it('should parse a simple dataset', () => {
    const input = `
    first-entry:
      translations:
        en_US: 'hello world'
        nl_NL: 'hallo wereld'
    `;

    const parsed = transformer.parse(input, { referenceLocale: 'en_US' });
    expect(parsed).toBeDefined();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "translations": {
            "en_US": "hello world",
            "nl_NL": "hallo wereld",
          },
        },
      }
    `);
  });
});
