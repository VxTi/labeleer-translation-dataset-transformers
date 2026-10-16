import { isNil } from '@vxti/typed';

export function ellipsize(input: string, maxLength?: number): string {
  if (isNil(maxLength) || input.length <= maxLength) return input;

  const ellipsis = '...';
  if (input.length > maxLength && maxLength <= ellipsis.length) {
    return ellipsis.slice(0, maxLength);
  }

  const halfMaxLen = maxLength / 2;
  const firstEnd = halfMaxLen - 1;
  const secondStart = input.length - halfMaxLen + 2;

  return input.slice(0, firstEnd) + ellipsis + input.slice(secondStart);
}
