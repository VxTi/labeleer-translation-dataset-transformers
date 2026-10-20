import { describe, it, expect } from 'vitest';
import type { FileExtension } from './transformer.js';
import type { AppleStringsSerializationOptions } from './apple-strings-transformer.js';
import {
  mockDataset,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { defaultTransformerSet } from './default-transformer-set.js';
import { FileFormat } from './file-formats.js';

const transformerSet = defaultTransformerSet;

describe('serializer', () => {
  describe('Android Strings', () => {
    it('should serialize Android strings correctly', () => {
      const result = transformerSet.serialize(
        mockDataset(),
        FileFormat.ANDROID_STRINGS,
        mockSerializationOptions({
          locales: ['en_US', 'nl_NL', 'fr_FR'],
        })
      );

      expect(result).toHaveLength(3);
      expect(result.map(s => s.locale)).toEqual(['en_US', 'nl_NL', 'fr_FR']);
      expect(result.map(s => s.filePath)).toEqual([
        'values-en/strings.xml',
        'values-nl/strings.xml',
        'values-fr/strings.xml',
      ]);
    });
  });

  describe('Apple Strings', () => {
    it('should serialize Apple strings correctly', () => {
      const result = transformerSet.serialize(
        mockDataset(),
        FileFormat.APPLE_STRINGS,
        mockSerializationOptions<AppleStringsSerializationOptions>({
          locales: ['en_US', 'nl_NL', 'fr_FR'],
          keylessTranslation: false,
        })
      );
      expect(result).toHaveLength(3);
      expect(result.map(r => r.filePath)).toEqual([
        'en-US.strings',
        'nl-NL.strings',
        'fr-FR.strings',
      ]);
    });
  });

  describe('Qt Linquist TS', () => {
    it('should serialize TS files correctly', () => {
      const result = transformerSet.serialize(
        mockDataset(),
        FileFormat.TS,
        mockSerializationOptions({
          referenceLocale: 'en_US',
          locales: ['en_US', 'nl_NL', 'fr_FR'],
        })
      );
      expect(result).toHaveLength(2);
      expect(result.map(s => s.locale)).toEqual(['nl_NL', 'fr_FR']); // excludes ref locale
    });
  });

  it.each(transformerSet.multipleOutputFormats)(
    'should include a locale object for all multi-file formats (fmt %s)',
    fmt => {
      const transformer = transformerSet.getByFormat(fmt);
      const result = transformer.serialize(
        {
          someLabel: {
            translations: {
              en_US: 'hello world!',
              nl_NL: 'test 123',
            },
          },
        },
        { referenceLocale: 'nl_NL', locales: ['en_US', 'nl_NL'] }
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('locale');
      expect(result[0]?.filePath).toSatisfy((name: string) =>
        name.endsWith(transformer.extensions[0])
      );
    }
  );
});

describe('getByExtension', () => {
  it.each`
    extension       | expectedFormat
    ${'.json'}      | ${FileFormat.JSON}
    ${'.xml'}       | ${FileFormat.ANDROID_STRINGS}
    ${'.strings'}   | ${FileFormat.APPLE_STRINGS}
    ${'.po'}        | ${FileFormat.PO}
    ${'.pot'}       | ${FileFormat.PO}
    ${'.ts'}        | ${FileFormat.TS}
    ${'.xcstrings'} | ${FileFormat.XCSTRINGS}
    ${'.xlf'}       | ${FileFormat.XLIFF}
    ${'.yml'}       | ${FileFormat.YAML}
    ${'.yaml'}      | ${FileFormat.YAML}
    ${'.unknown'}   | ${undefined}
  `(
    'should extract format $expectedFormat from extension $extension',
    ({
      extension,
      expectedFormat,
    }: {
      extension: FileExtension;
      expectedFormat: FileFormat;
    }) => {
      expect(transformerSet.getByExtension(extension)?.fileFormat).toEqual(
        expectedFormat
      );
    }
  );
});

describe('getByFormat', () => {
  it.each`
    format                        | expected
    ${FileFormat.JSON}            | ${{ fileFormat: FileFormat.JSON }}
    ${FileFormat.ANDROID_STRINGS} | ${{ fileFormat: FileFormat.ANDROID_STRINGS }}
    ${FileFormat.APPLE_STRINGS}   | ${{ fileFormat: FileFormat.APPLE_STRINGS }}
    ${FileFormat.PO}              | ${{ fileFormat: FileFormat.PO }}
    ${FileFormat.TS}              | ${{ fileFormat: FileFormat.TS }}
    ${FileFormat.XCSTRINGS}       | ${{ fileFormat: FileFormat.XCSTRINGS }}
    ${FileFormat.XLIFF}           | ${{ fileFormat: FileFormat.XLIFF }}
    ${FileFormat.YAML}            | ${{ fileFormat: FileFormat.YAML }}
    ${'unknown format'}           | ${undefined}
  `(
    'should produce the correct transformer from format $format',
    ({ format, expected }) => {
      expect(defaultTransformerSet.getByFormat(format)).toMatchObject(expected);
    }
  );
});

describe('hasFormat', () => {
  it('should determine correctly whether the set has the transformer', () => {
    expect(defaultTransformerSet.hasFormat(FileFormat.YAML)).toBeTruthy();
    expect(defaultTransformerSet.hasFormat('something' as never)).toBeFalsy();
  });
});
