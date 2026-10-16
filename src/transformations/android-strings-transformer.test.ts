import { isNotNil } from '@vxti/typed';
import { describe, expect, it } from 'vitest';
import {
  mockDataset,
  mockParsingOptions,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { type TranslationDataset } from '../definitions.js';
import { Plurality } from '../locales/index.js';
import { AndroidStringsDatasetTransformer } from './android-strings-transformer.js';

const transformer = AndroidStringsDatasetTransformer;

describe('android strings serialization', () => {
  it('should serialize a simple Android Strings dataset', () => {
    const options = mockSerializationOptions({
      locales: ['en_US', 'nl_NL'],
    });
    const dataset = mockDataset();

    const serialized = transformer.serialize(dataset, options);

    const enFileName = 'values-en/strings.xml';
    const nlFileName = 'values-nl/strings.xml';

    expect.assert(isNotNil(serialized[enFileName]));
    expect.assert(isNotNil(serialized[nlFileName]));
    expect(serialized['values-nl/strings.xml'].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="first_entry">world</string>
        <string name="second_entry">again</string>
      </resources>
      "
    `);
    expect(serialized['values-en/strings.xml'].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="first_entry">hello</string>
        <string name="second_entry">hello</string>
      </resources>
      "
    `);
  });

  it('should serialize an android strings dataset with pluralization', () => {
    const refLocale = 'en_US';
    const options = mockSerializationOptions({
      locales: [refLocale],
      referenceLocale: refLocale,
    });
    const input: TranslationDataset = {
      regular: {
        translations: {
          [refLocale]: 'a regular string',
        },
      },
      strict: {
        translations: {},
        plurals: {
          [refLocale]: { [Plurality.ONE]: 'one strict' },
        },
      },
    };

    const serialized = transformer.serialize(input, options);

    const fileName = 'values-en/strings.xml';

    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized[fileName].content).toContain('a regular string');
    expect(serialized[fileName].content).toContain('one strict');
    expect(serialized[fileName].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="utf-8"?>
      <resources>
        <string name="regular">a regular string</string>
        <plurals name="strict">
          <item quantity="one">one strict</item>
        </plurals>
      </resources>
      "
    `);
  });

  it('escapes Android special characters (apostrophe, quote, backslash)', () => {
    const input: TranslationDataset = {
      greeting: {
        translations: { en_US: `it's a "quote" with a \\ backslash` },
        plurals: {},
      },
    };

    const serialized = transformer.serialize(
      input,
      mockSerializationOptions({ locales: ['en_US'], referenceLocale: 'en_US' })
    );

    // The backslash escape guards Android's parser; the XML builder then
    // entity-encodes the quote/apostrophe. aapt XML-decodes `\&apos;` back to
    // `\'` (Android-safe) — a bare `&apos;` would decode to an unescaped `'`.
    const fileName = 'values-en/strings.xml';

    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized[fileName].content).toContain('it\\&apos;s');
    expect(serialized[fileName].content).toContain('\\&quot;quote\\&quot;');
    expect(serialized[fileName].content).toContain('\\\\ backslash');
  });

  it('adds region qualifiers when locales share a language', () => {
    const serialized = transformer.serialize(
      mockDataset(),
      mockSerializationOptions({
        locales: ['en_US', 'en_GB'],
        referenceLocale: 'en_US',
      })
    );

    const filenames = Object.keys(serialized).sort();
    expect(filenames).toEqual([
      'values-en-GB/strings.xml',
      'values-en-US/strings.xml',
    ]);
  });

  it('should format label keys correctly when invalid characters are encountered', () => {
    const serialized = transformer.serialize(
      { '123.some.key': { translations: { en_US: '123' } } },
      mockSerializationOptions({
        locales: ['en_US'],
        referenceLocale: 'en_US',
      })
    );

    // Prefixes the key since it starts with a number, and
    // removes all dots in favor of underscores
    const fileName = 'values-en/strings.xml';
    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized['values-en/strings.xml'].content).toContain(
      '"_123_some_key"'
    );
  });
});

describe('android strings parsing', () => {
  it('should parse a simple android strings XML dataset', () => {
    const input = `<?xml version="1.0" encoding="utf-8"?>
        <resources>
          <string name="first-label">Hello</string>
          <string name="second-label">again</string>
        </resources>`;

    const parsed = transformer.parse(input, {
      referenceLocale: 'en_US',
    });
    expect(parsed).toBeDefined();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-label": {
          "plurals": {},
          "translations": {
            "en_US": "Hello",
          },
        },
        "second-label": {
          "plurals": {},
          "translations": {
            "en_US": "again",
          },
        },
      }
    `);
  });

  it('should parse an android dataset with plurals', () => {
    const input = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="first-label">Hello</string>
  <string name="second-label">again</string>
  <plurals name="plural-label">
    <item quantity="zero">Zero</item>
    <item quantity="one">One item</item>
    <item quantity="two">Two</item>
    <item quantity="other">Many items</item>
  </plurals>
</resources>`;

    const parsed = transformer.parse(
      input,
      mockParsingOptions({
        referenceLocale: 'en_US',
      })
    );
    expect(parsed).toBeDefined();
    expect(parsed).toEqual(
      expect.objectContaining({
        'plural-label': expect.objectContaining({
          plurals: expect.objectContaining({
            one: expect.objectContaining({
              en_US: 'One item',
            }),
            other: expect.objectContaining({
              en_US: 'Many items',
            }),
            two: expect.objectContaining({
              en_US: 'Two',
            }),
            zero: expect.objectContaining({
              en_US: 'Zero',
            }),
          }),
        }),
      })
    );
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-label": {
          "plurals": {},
          "translations": {
            "en_US": "Hello",
          },
        },
        "plural-label": {
          "plurals": {
            "one": {
              "en_US": "One item",
            },
            "other": {
              "en_US": "Many items",
            },
            "two": {
              "en_US": "Two",
            },
            "zero": {
              "en_US": "Zero",
            },
          },
          "translations": {},
        },
        "second-label": {
          "plurals": {},
          "translations": {
            "en_US": "again",
          },
        },
      }
    `);
  });

  it('should throw an error for invalid XML', () => {
    const input = `<resources>
  <string name="first-label">Hello</string>
  <string name="second-label">again</string>
  <plurals name="plural-label">
    <item quantity="zero">Zero</item>
    <item quantity="one">One item</item>
    <item quantity="two">Two</item>
    <item quantity="other">Many items</item>
</plur
`;

    expect(() =>
      transformer.parse(input, { referenceLocale: 'en_US' })
    ).toThrow(
      'Failed to parse Android Strings XML: Error: Closing Tag is not closed.'
    );
  });
});
