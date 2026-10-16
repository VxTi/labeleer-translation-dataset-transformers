import { isNotNil } from '@vxti/typed';
import { describe, expect, it } from 'vitest';
import { type SerializationResult } from '../definitions.js';
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

    const fileName = 'en_US';
    expect.assert(isNotNil(result[fileName]));
    expect(result[fileName].content).toContain('must exist');
    expect(result[fileName].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
        <file id="f1">
          <unit id="first-entry">
            <segment>
              <source>hello</source>
            </segment>
          </unit>
          <unit id="second-entry">
            <segment>
              <source>hello</source>
            </segment>
          </unit>
          <unit id="strict">
            <segment>
              <source>must exist</source>
            </segment>
          </unit>
        </file>
      </xliff>
      "
    `);
  });

  it('serializes dataset with source and target languages', () => {
    const result = transformer.serialize(
      mockDataset(),
      mockSerializationOptions({
        referenceLocale: 'en_US',
        locales: ['en_US', 'de_DE'],
      })
    );

    expect(result).toBeDefined();
    const fileName = 'de_DE';

    expect.assert(isNotNil(result[fileName]));
    expect(result[fileName].content).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="de">
        <file id="f1">
          <unit id="first-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
          <unit id="second-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
        </file>
      </xliff>
      "
    `);
  });

  it('serializes multiple locale fragments', () => {
    const dataset = mockDataset();

    const result = transformer.serialize(dataset, {
      referenceLocale: 'en_US',
      locales: ['en_US', 'fr_FR', 'es_ES'],
    });

    expect(result).toBeDefined();
    expect(result).toMatchObject<SerializationResult>({
      fr_FR: expect.anything(),
      es_ES: expect.anything(),
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "es_ES": {
          "content": "<?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="es">
        <file id="f1">
          <unit id="first-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
          <unit id="second-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
        </file>
      </xliff>
      ",
        },
        "fr_FR": {
          "content": "<?xml version="1.0" encoding="UTF-8"?>
      <xliff version="2.1" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
        <file id="f1">
          <unit id="first-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
          <unit id="second-entry">
            <segment>
              <source>hello</source>
              <target/>
            </segment>
          </unit>
        </file>
      </xliff>
      ",
        },
      }
    `);
  });
});
