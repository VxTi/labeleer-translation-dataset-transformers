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
      mockSerializationOptions({ locales: ['nl_NL', 'en_US'] })
    );

    expect(serialized).toBeDefined();
    expect(serialized).toHaveLength(1); // Always one file regardless of locale count
    expect(serialized[0]).not.toHaveProperty('locale'); // All contained, so no locale property
    expect(serialized[0]?.content).toMatchSnapshot();
    expect(serialized[1]?.content).toMatchSnapshot();
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
    expect(parsed).toMatchSnapshot();
  });
});
