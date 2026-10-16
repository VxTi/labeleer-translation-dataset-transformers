# Labeleer Translation Dataset Transformers

Parse and serialize translation datasets across a wide range of localization
file formats through a single, standardized intermediate representation — the
`TranslationDataset`. Every supported format parses **into** a
`TranslationDataset` and serializes **out of** one, so any format can be
converted to any other.

## Getting Started

```shell
npm install @labeleer/translation-dataset-transformers
```

The package is published as ES modules (`"type": "module"`) with bundled type
declarations.

## Usage

The primary entry point is `defaultTransformerSet` — a ready-made
[`ParserSet`](#parserset) wired up with every supported format. It exposes
synchronous `parse`, `parseAggregate` and `serialize` methods.

### Parsing a dataset

Parse a string into a standardized `TranslationDataset`. The format is selected
via the `FileFormat` enum.

```typescript
import {
  defaultTransformerSet,
  FileFormat,
} from '@labeleer/translation-dataset-transformer';

const jsonString = `{
  "hello_world": {
    "translations": {
      "en_US": "Hello World!",
      "nl_NL": "Hallo Wereld!"
    }
  }
}`;

const dataset = defaultTransformerSet.parse(
  jsonString,
  FileFormat.JSON,
  { referenceLocale: 'en_US' }
);

// {
//   hello_world: {
//     translations: { en_US: 'Hello World!', nl_NL: 'Hallo Wereld!' }
//   }
// }
```

Some single-locale formats (Apple `.strings`, PO, …) carry no locale
information in the file itself and therefore require a `targetLocale`:

```typescript
const dataset = defaultTransformerSet.parse(appleStrings, FileFormat.APPLE_STRINGS, {
  referenceLocale: 'en_US',
  targetLocale:    'nl_NL',
});
```

### Parsing multiple locale files at once

Formats that store a single locale per file can be aggregated into one dataset
with `parseAggregate`, which takes a map of locale → file content:

```typescript
const dataset = defaultTransformerSet.parseAggregate(
  {
    en_US: englishStringsFile,
    nl_NL: dutchStringsFile,
  },
  FileFormat.APPLE_STRINGS,
  { referenceLocale: 'en_US' }
);
```

### Serializing a dataset

Serialize a `TranslationDataset` back into files. Unlike a plain
string-returning serializer, `serialize` returns a
[`SerializationResult`](#serializationresult) — a map of filename → file
content. Formats that emit one file per locale (Android, Apple, XLIFF, PO, Qt)
return several entries; single-file formats (JSON, YAML, XCStrings) return one.

```typescript
import {
  defaultTransformerSet,
  FileFormat,
  type TranslationDataset,
} from '@labeleer/translation-dataset-transformer';

const dataset: TranslationDataset = {
  hello_world: {
    translations: { en_US: 'Hello World!', nl_NL: 'Hallo Wereld!' },
  },
};

const result = defaultTransformerSet.serialize(dataset, FileFormat.JSON, {
  referenceLocale: 'en_US',
  locales:         [ 'en_US', 'nl_NL' ],
});

// {
//   labels: {
//     content: '{\n  "hello_world": {\n    "translations": { ... }\n  }\n}'
//   }
// }
```

An Android serialization, by contrast, yields one resource file per locale,
each flagged as living in its own directory:

```typescript
const result = defaultTransformerSet.serialize(dataset, FileFormat.ANDROID_STRINGS, {
  referenceLocale: 'en_US',
  locales:         [ 'en_US', 'nl_NL' ],
});

// {
//   'values-en/strings.xml': { content: '<?xml ...>', isDirectory: true },
//   'values-nl/strings.xml': { content: '<?xml ...>', isDirectory: true }
// }
```

## Supported Formats

Every format supports both parsing and serialization.

| Format Name     | Enum Value                   | File Extensions  |
|-----------------|------------------------------|------------------|
| JSON            | `FileFormat.JSON`            | `.json`          |
| YAML            | `FileFormat.YAML`            | `.yaml`, `.yml`  |
| Qt Linguist     | `FileFormat.TS`              | `.ts`            |
| PO (Gettext)    | `FileFormat.PO`              | `.po`, `.pot`    |
| Android Strings | `FileFormat.ANDROID_STRINGS` | `.xml`           |
| Apple Strings   | `FileFormat.APPLE_STRINGS`   | `.strings`       |
| XLIFF (2.1)     | `FileFormat.XLIFF`           | `.xliff`, `.xlf` |
| Apple XCStrings | `FileFormat.XCSTRINGS`       | `.xcstrings`     |

Helpers for working with formats and extensions:

- `getFormatForExtension(extension)` — resolve a `FileFormat` from a
  file extension.
- `getFileExtensionsFromFormat(format)` — list the extensions for a format.
- `supportedFileExtensions()` — every extension across all formats.
- `isCompressedFormat(format)` — whether a format emits multiple files (and so
  benefits from being zipped on export).

## API

### `ParserSet`

`defaultTransformerSet` is a `ParserSet`. You can also build your own over a
subset (or superset) of transformers with `makeParserSet([...])`.

| Method                                    | Description                                                                         |
|-------------------------------------------|-------------------------------------------------------------------------------------|
| `parse(input, format, options)`           | Parse a single file's content into a `TranslationDataset`.                          |
| `parseAggregate(inputs, format, options)` | Parse a `Partial<Record<Locale, string>>` map of per-locale files into one dataset. |
| `serialize(dataset, format, options)`     | Serialize a dataset into a `SerializationResult`.                                   |
| `formats()`                               | List the `FileFormat`s this set supports.                                           |
| `has(format)`                             | Type guard: whether the set supports a format.                                      |
| `getByFormat(format)`                     | Retrieve the underlying transformer for a format.                                   |

All methods are synchronous.

#### `ParsingOptions`

```typescript
interface ParsingOptions {
  /** The locale to treat as the source/base language. */
  referenceLocale: Locale;
  /**
   * The locale a single-locale file should be parsed into. Required by formats
   * that do not encode locale information themselves (Apple Strings, PO).
   */
  targetLocale?: Locale;
}
```

#### `SerializationOptions`

```typescript
type SerializationOptions = {
  /** The source/base language; required by formats such as Android, Apple and Qt. */
  referenceLocale: Locale;
  /** The locales to include in the output. */
  locales: Locale[];
};
```

`Locale` values are POSIX-style identifiers such as `en_US` or `nl_NL`.

### `SerializationResult`

Serialization returns a map keyed by output filename. Multi-file formats
populate several entries.

```typescript
type SerializationResult = {
  [filename: string]: {
    content: string;
    /** True when the file is meant to live in its own directory (e.g. Android `values-*`). */
    isDirectory?: boolean;
  };
};
```

### `TranslationDataset`

The standardized intermediate representation shared by every format:

```typescript
type TranslationDataset = {
  [key: string]: {
    translations: { [locale: string]: string };
    tags?: string[];
    description?: string;
    plurals?: {
      [quantity in 'zero' | 'one' | 'two' | 'few' | 'many' | 'other']?: {
        [locale: string]: string;
      };
    };
  };
};
```

Dataset keys are sanitized to the `[a-zA-Z0-9._-]` character set. Individual
transformers additionally expose a `formatKey(key)` method that adapts a key to
the target format's own identifier rules — for example, the Android transformer
rewrites `.`/`-` to `_` and guards leading digits so keys are valid resource
names.

### Building datasets programmatically

`DatasetBuilder` provides a fluent API for assembling a `TranslationDataset`
without hand-writing the nested structure:

```typescript
import { DatasetBuilder } from '@labeleer/translation-dataset-transformer';

const dataset = new DatasetBuilder()
  .addTranslation('hello_world', { en_US: 'Hello World!', nl_NL: 'Hallo Wereld!' })
  .addDescription('hello_world', 'Greeting shown on the home screen')
  .build();
```

### Custom transformers

Define a transformer for a new format with `makeLanguageTransformer`, then
register it in a `ParserSet` via `makeParserSet`. A transformer supplies
`parse` and `serialize`; `parseAggregate`, `formatKey` and `canParse` are
provided with sensible defaults unless overridden.
