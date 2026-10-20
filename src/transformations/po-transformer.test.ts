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
    expect(parsed).toMatchSnapshot();
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

    expect(serialized).toHaveLength(1);
    expect(serialized[0]).toMatchSnapshot();
  });
});
