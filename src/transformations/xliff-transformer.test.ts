import { describe, expect, it } from 'vitest';
import { XLIFFDatasetTransformer } from './xliff-transformer.js';
import {
  mockDataset,
  mockSerializationOptions,
  mockParsingOptions,
} from '../__testutils__/index.js';

const transformer = XLIFFDatasetTransformer;

describe('XLIFF 2.1 Parsing', () => {
  it('parses a minimal XLIFF 2.1 document', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.1" srcLang="en" trgLang="de">
        <file id="f1">
          <unit id="hello">
            <segment>
              <source>Hello</source>
              <target>Hallo</target>
            </segment>
          </unit>
        </file>
      </xliff>
    `;

    const result = transformer.parse(xml, mockParsingOptions());

    expect(result).toMatchInlineSnapshot(`
      {
        "hello": {
          "plurals": {},
          "translations": {
            "de_DE": "Hallo",
            "en_US": "Hello",
          },
        },
      }
    `);
  });

  it('parses XLIFF 2.1 without target language', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.1" srcLang="en">
        <file id="f1">
          <unit id="greeting">
            <segment>
              <source>Hello world</source>
            </segment>
          </unit>
        </file>
      </xliff>
    `;

    const result = transformer.parse(xml, mockParsingOptions());

    expect(result).toMatchInlineSnapshot(`
      {
        "greeting": {
          "plurals": {},
          "translations": {
            "en_US": "Hello world",
          },
        },
      }
    `);
  });
});

describe('XLIFF 2.1 Serialization', () => {
  it('serializes dataset for a single locale (reference only)', () => {
    const result = transformer.serialize(
      mockDataset({
        strict: { translations: { en_US: 'must exist' } },
      }),
      mockSerializationOptions({
        referenceLocale: 'en_US',
        locales: ['en_US'],
      })
    );

    expect(result).toBeDefined();

    expect(result).toHaveLength(1);
    expect(result[0]?.filePath).toEqual('en_US.xlf');
    expect(result[0]?.content).toMatchSnapshot();
  });

  it('serializes dataset with source and target languages', () => {
    const result = transformer.serialize(
      mockDataset(),
      mockSerializationOptions({
        referenceLocale: 'en_US',
        locales: ['en_US', 'de_DE'],
      })
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.filePath).toEqual('de_DE.xlf');
    expect(result[0]?.content).toMatchSnapshot();
  });

  it('serializes multiple locale fragments', () => {
    const dataset = mockDataset();

    const result = transformer.serialize(dataset, {
      referenceLocale: 'en_US',
      locales: ['en_US', 'fr_FR', 'es_ES'],
    });

    expect(result).toHaveLength(3);
    expect(result.map(r => r.locale)).toContainEqual([
      'en_US',
      'fr_FR',
      'es_ES',
    ]);
    expect(result[0]?.content).toMatchSnapshot();
  });
});
