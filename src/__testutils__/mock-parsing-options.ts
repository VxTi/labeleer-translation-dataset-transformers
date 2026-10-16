import type { ParsingOptions } from '../types.js';

export function mockParsingOptions<T extends ParsingOptions = ParsingOptions>(
  updates: Partial<T> = {}
): T {
  return {
    referenceLocale: 'en_US',
    ...updates,
  } as T;
}
