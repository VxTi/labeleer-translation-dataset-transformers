import {
  Plurality,
  isBCP47Locale,
  isISO639_1LanguageCode,
  isLocale,
  iso639_1ToLocale,
  toPOSIX,
} from '../locales/index.js';
import * as z from 'zod/v4';
import {
  MAX_TAG_COUNT,
  MAX_TAG_LENGTH,
  MAX_TRANSLATION_DESCRIPTION_LENGTH,
  MAX_TRANSLATION_KEY_LENGTH,
  MIN_TAG_LENGTH,
  MIN_TRANSLATION_KEY_LENGTH,
} from './constants.js';
import type { TranslationDataset } from '../types.js';

export const LocaleDecoder = z
  .string()
  .refine(
    val => isISO639_1LanguageCode(val) || isLocale(val) || isBCP47Locale(val),
    { message: 'Invalid locale format' }
  )
  .transform(val =>
    isBCP47Locale(val) ? toPOSIX(val)
    : isISO639_1LanguageCode(val) ? iso639_1ToLocale(val)
    : val
  );

export const TranslationKeyDecoder = z
  .string()
  .min(MIN_TRANSLATION_KEY_LENGTH, {
    error: `Translation label must be at least ${MIN_TRANSLATION_KEY_LENGTH} characters long`,
  })
  .max(MAX_TRANSLATION_KEY_LENGTH, {
    error: `Translation label must be less than ${MAX_TRANSLATION_KEY_LENGTH} characters long`,
  });

export const JsonTranslationDatasetDecoder = z.record(
  TranslationKeyDecoder,
  z.object({
    // `plurals`/`translations` default to empty so hand-authored JSON/YAML may
    // omit them while parsed entries still satisfy the TranslationEntry shape.
    // `partialRecord` keeps plural categories optional (not all-or-nothing).
    plurals: z.optional(
      z.partialRecord(
        LocaleDecoder,
        z.partialRecord(z.enum(Plurality), z.string())
      )
    ),
    translations: z
      .optional(z.partialRecord(LocaleDecoder, z.string()))
      .default({}),
    description: z.optional(
      z.string().max(MAX_TRANSLATION_DESCRIPTION_LENGTH, {
        error: `Translation description must be less than ${MAX_TRANSLATION_DESCRIPTION_LENGTH} characters long`,
      })
    ),
    tags: z.optional(
      z
        .array(
          z
            .string()
            .min(MIN_TAG_LENGTH, {
              error: 'Tag cannot be empty',
            })
            .max(MAX_TAG_LENGTH, {
              error: `Tags can at most be ${MAX_TAG_LENGTH} characters long`,
            })
        )
        .max(MAX_TAG_COUNT, {
          error: `There can at most be ${MAX_TAG_COUNT} tags per translation`,
        })
    ),
  })
) satisfies z.ZodType<TranslationDataset>;
