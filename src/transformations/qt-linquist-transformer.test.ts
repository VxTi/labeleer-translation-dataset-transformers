import { isNotNil } from '@vxti/typed';
import { describe, expect, it } from 'vitest';
import { TsDatasetTransformer } from './qt-linquist-transformer.js';
import {
  mockDataset,
  mockSerializationOptions,
  mockParsingOptions,
} from '../__testutils__/index.js';

const transformer = TsDatasetTransformer;

describe('serialization', () => {
  it('should serialize a simple Qt Linguist XML dataset', () => {
    const dataset = mockDataset();
    const options = mockSerializationOptions({
      locales: ['en_US', 'nl_NL', 'en_AU'],
      referenceLocale: 'en_US',
    });

    const serialized = transformer.serialize(dataset, options);

    expect.assert(isNotNil(serialized['nl_NL.ts']));
    expect.assert(isNotNil(serialized['en_AU.ts']));

    expect(serialized).toHaveProperty('nl_NL.ts', expect.any(Object));
    expect(serialized).toHaveProperty('en_AU.ts', expect.any(Object));

    expect(serialized['nl_NL.ts'].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="utf-8"?>
      <!DOCTYPE TS>
      <TS version="2.1" sourcelanguage="en_US" language="nl_NL">
        <context>
          <name>Labeleer Translations</name>
          <message id="first-entry">
            <source>hello</source>
            <translation>world</translation>
          </message>
          <message id="second-entry">
            <source>hello</source>
            <translation>again</translation>
          </message>
        </context>
      </TS>
      "
    `);
  });

  it('should serialize a Qt dataset even if there is just a single locale', () => {
    const dataset = mockDataset();
    const options = mockSerializationOptions({
      locales: ['en_US'],
      referenceLocale: 'en_US',
    });

    const serialized = transformer.serialize(dataset, options);

    const fileName = 'en_US.ts';

    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized[fileName].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="utf-8"?>
      <!DOCTYPE TS>
      <TS version="2.1" sourcelanguage="en_US" language="en_US">
        <context>
          <name>Labeleer Translations</name>
          <message id="first-entry">
            <source>hello</source>
          </message>
          <message id="second-entry">
            <source>hello</source>
          </message>
        </context>
      </TS>
      "
    `);
  });
});

describe('qt linquist parsing', () => {
  it('should parse a simple Qt Linguist XML dataset', () => {
    const dataset = `<?xml version="1.0" encoding="utf-8"?>
        <TS version="2.1" sourcelanguage="en_US" language="nl_NL">
          <context>
            <name>Labeleer Translations</name>
            <message id="first-entry">
              <source>hello</source>
              <translation>world</translation>
            </message>
            <message id="second-entry">
              <source>hello</source>
              <translation>again</translation>
            </message>
          </context>
        </TS>`;

    const parsed = transformer.parse(
      dataset,
      mockParsingOptions({ referenceLocale: 'en_US' })
    );
    expect(parsed).toBeDefined();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "plurals": {},
          "translations": {
            "en_US": "hello",
            "nl_NL": "world",
          },
        },
        "second-entry": {
          "plurals": {},
          "translations": {
            "en_US": "hello",
            "nl_NL": "again",
          },
        },
      }
    `);
  });

  it('should parse a TS set even if there are no translations other than the reference', () => {
    const dataset = `<?xml version="1.0" encoding="utf-8"?>
        <TS version="2.1" sourcelanguage="en_US" language="en_US">
          <context>
            <name>Labeleer Translations</name>
            <message id="first-entry">
              <source>hello</source>
            </message>
            <message id="second-entry">
              <source>world</source>
            </message>
          </context>
        </TS>`;
    const parsed = transformer.parse(dataset, mockParsingOptions());

    expect(parsed).toBeDefined();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "plurals": {},
          "translations": {
            "en_US": "hello",
          },
        },
        "second-entry": {
          "plurals": {},
          "translations": {
            "en_US": "world",
          },
        },
      }
    `);
  });
});
