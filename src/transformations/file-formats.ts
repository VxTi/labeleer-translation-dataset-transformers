/**
 * Enum representing the supported export formats for localization files.
 * Each format corresponds to a specific file type used in localization workflows.
 */
export enum FileFormat {
  JSON = 'json',
  YAML = 'yaml',
  TS = 'ts',
  PO = 'po',
  ANDROID_STRINGS = 'android_strings',
  APPLE_STRINGS = 'apple_strings',
  XLIFF = 'xliff',
  XCSTRINGS = 'xcstrings',
}
