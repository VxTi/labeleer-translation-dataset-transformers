import type { TranslationDataset } from '../types.js';
import { Plurality } from '../locales/index.js';

export function mockDataset(
  updates: Partial<TranslationDataset> = {}
): TranslationDataset {
  return {
    'first-entry': {
      plurals: {},
      translations: {
        en_US: 'hello',
        nl_NL: 'world',
      },
    },
    'second-entry': {
      plurals: {},
      translations: {
        en_US: 'hello',
        nl_NL: 'again',
      },
    },
    ...updates,
  };
}

export function mockPluralDataset(updates: Partial<TranslationDataset> = {}) {
  return {
    'plural-entry': {
      plurals: {
        en_US: {
          [Plurality.ONE]: 'One thing',
          [Plurality.OTHER]: 'Many things',
        },
      },
      translations: {},
    },
    ...updates,
  } satisfies TranslationDataset;
}
