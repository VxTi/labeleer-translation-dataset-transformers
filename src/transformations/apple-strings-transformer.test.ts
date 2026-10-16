import { isNotNil } from '@vxti/typed';
import { describe, expect, it } from 'vitest';
import {
  mockParsingOptions,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { type Locale, toBCP47 } from '../locales/index.js';
import {
  AppleStringsDatasetTransformer,
  type AppleStringsSerializationOptions,
} from './apple-strings-transformer.js';

const transformer = AppleStringsDatasetTransformer;

describe('apple strings parsing', () => {
  it('should aggregate several apple strings datasets', () => {
    const inputs: Partial<Record<Locale, string>> = {
      en_US: `
"first-entry" = "english";
"second-entry" = "english \\"second\\"";`,
      nl_NL: `
"first-entry" = "dutch";
"second-entry" = "dutch \\"second\\"";`,
    };

    const aggregated = transformer.parseAggregate(inputs, mockParsingOptions());

    expect(aggregated).toBeDefined();
    expect(aggregated).toMatchObject({
      'first-entry': {
        translations: expect.objectContaining({
          en_US: 'english',
          nl_NL: 'dutch',
        }),
      },
      'second-entry': {
        translations: expect.objectContaining({
          en_US: 'english "second"',
          nl_NL: 'dutch "second"',
        }),
      },
    });
    expect(aggregated).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "plurals": {},
          "translations": {
            "en_US": "english",
            "nl_NL": "dutch",
          },
        },
        "second-entry": {
          "plurals": {},
          "translations": {
            "en_US": "english "second"",
            "nl_NL": "dutch "second"",
          },
        },
      }
    `);
  });

  it('should parse a simple apple strings dataset', () => {
    const input = `
"first-entry" = "dutch";
"second-entry" = "dutch \\"second\\"";`;
    const parsed = transformer.parse(
      input,
      mockParsingOptions({ targetLocale: 'en_US' })
    );

    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "plurals": {},
          "translations": {
            "en_US": "dutch",
          },
        },
        "second-entry": {
          "plurals": {},
          "translations": {
            "en_US": "dutch "second"",
          },
        },
      }
    `);
  });

  it('should throw an error when no locale is provided', () => {
    const input = `
"first-entry" = "dutch";
"second-entry" = "dutch \\"second\\"";`;
    expect(() =>
      transformer.parse(input, mockParsingOptions({ targetLocale: undefined }))
    ).toThrow('Locale is required for parsing Apple .strings files.');
  });

  it('should skip comments and invalid lines', () => {
    const input = `
// This is a comment
"valid-entry" = "value";
// Another comment
invalid line
"another-valid-entry" = "another value";`;
    const parsed = transformer.parse(
      input,
      mockParsingOptions({ targetLocale: 'en_US' })
    );

    expect(parsed).toMatchInlineSnapshot(`
      {
        "another-valid-entry": {
          "plurals": {},
          "translations": {
            "en_US": "another value",
          },
        },
        "valid-entry": {
          "plurals": {},
          "translations": {
            "en_US": "value",
          },
        },
      }
    `);
  });
});

describe('apple strings serialization', () => {
  it('should serialize a dataset into apple strings', () => {
    const serialized = transformer.serialize(
      {
        'first-entry': {
          translations: {
            nl_NL: 'dutch',
            en_US: 'english',
          },
        },
        'second-entry': {
          translations: {
            en_US: 'english "second"',
            nl_NL: 'dutch "second"',
          },
        },
      },
      mockSerializationOptions<AppleStringsSerializationOptions>({
        referenceLocale: 'en_US',
        locales: ['en_US', 'nl_NL'],
        keylessTranslation: false,
      })
    );

    expect(Object.keys(serialized)).toHaveLength(2);
    const enFileName = 'en-US.strings';
    const nlFileName = 'nl-NL.strings';

    expect.assert(isNotNil(serialized[enFileName]));
    expect.assert(isNotNil(serialized[nlFileName]));

    expect(serialized[enFileName].content).toMatchInlineSnapshot(`
      ""first-entry" = "english";
      "second-entry" = "english \\"second\\"";"
    `);
    expect(serialized[nlFileName].content).toMatchInlineSnapshot(`
      ""first-entry" = "dutch";
      "second-entry" = "dutch \\"second\\"";"
    `);
  });

  it('should escape special characters', () => {
    const refLang = 'en_US';
    const serialized = transformer.serialize(
      {
        'special-entry': {
          translations: {
            [refLang]: 'Line1\nLine2\tTabbed\\"Quote\\"',
          },
        },
      },
      mockSerializationOptions<AppleStringsSerializationOptions>({
        referenceLocale: refLang,
        locales: [refLang],
        keylessTranslation: false,
      })
    );

    const fileName = `${toBCP47(refLang)}.strings`;

    expect(serialized).toBeDefined();

    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized[fileName].content).toMatchInlineSnapshot(
      `""special-entry" = "Line1\\nLine2\\tTabbed\\\\\\"Quote\\\\\\"";"`
    );
  });
});
