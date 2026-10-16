import type { MaybeArray } from '@vxti/typed';

export function extractArray<T>(arr: MaybeArray<T> | undefined): T[] {
  if (!arr) return [];

  return Array.isArray(arr) ? arr : [arr];
}
