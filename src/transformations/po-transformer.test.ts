import { isNotNil } from '@vxti/typed';
import { describe, expect, it } from 'vitest';
import {
  mockParsingOptions,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { Plurality } from '../locales/index.js';
import { PODatasetTransformer } from './po-transformer.js';

const transformer = PODatasetTransformer;

describe('po parsing', () => {
  it('should parse PO files correctly', () => {
    const input = `msgid ""
        msgstr ""
        "Content-Type: text/plain; charset=utf-8\\n"
        "Content-Transfer-Encoding: 8bit\\n"

        msgid "first-entry"
        msgid_plural "first-entry-plural"
        msgstr[0] "0 hellos"
        msgstr[1] "1 hello"
        msgstr[2] "2 hellos"

        msgid "second-entry"
        msgstr "hello"`;
    const parsed = transformer.parseAggregate(
      { en_US: input },
      mockParsingOptions()
    );

    expect(parsed).toBeDefined();
    expect(parsed).toMatchInlineSnapshot(`
      {
        "first-entry": {
          "plurals": {
            "en_US": {
              "one": "0 hellos",
              "other": "1 hello",
              "two": "2 hellos",
            },
          },
          "translations": {},
        },
        "second-entry": {
          "plurals": {},
          "translations": {
            "en_US": "hello",
          },
        },
      }
    `);
  });
});

describe('po serialization', () => {
  it('should serialize PO files correctly', () => {
    const serialized = transformer.serialize(
      {
        regular: {
          translations: {
            en_US: 'hello world!',
          },
        },
        'something-plural': {
          translations: {},
          plurals: {
            en_US: {
              [Plurality.ZERO]: 'There are no items',
              [Plurality.ONE]: 'There is one item',
              [Plurality.OTHER]: 'There are {count} items',
            },
          },
        },
      },
      mockSerializationOptions({
        locales: ['en_US'],
        referenceLocale: 'en_US',
      })
    );

    const fileName = 'en_US.po';
    expect.assert(isNotNil(serialized[fileName]));
    expect(serialized[fileName].content).toMatchInlineSnapshot(`
      "msgid ""
      msgstr ""
      "Content-Type: text/plain; charset=utf-8\\n"
      "Content-Transfer-Encoding: 8bit\\n"
      "Language: en\\n"
      "Plural-Forms: nplurals=2; plural=(n != 1);\\n"

      msgid "regular"
      msgstr "hello world!"

      msgid "something-plural"
      msgid_plural "There are {count} items"
      msgstr[0] "There is one item"
      msgstr[1] "There are {count} items"
      "
    `);
  });
});
