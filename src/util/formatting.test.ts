import { expect, describe, it } from 'vitest';
import { ellipsize } from './formatting.js';

describe('ellipsize', () => {
  it.each`
    input               | output              | maxLength
    ${'test'}           | ${'...'}            | ${3}
    ${'super'}          | ${'super'}          | ${5}
    ${'super'}          | ${'..'}             | ${2}
    ${'amazing'}        | ${'a...g'}          | ${5}
    ${'amazingg'}       | ${'am...g'}         | ${6}
    ${'hello world'}    | ${'he...ld'}        | ${7}
    ${'some long text'} | ${'some long text'} | ${undefined}
  `('should ellipsize $input to $output', ({ input, output, maxLength }) => {
    expect(ellipsize(input, maxLength)).toBe(output);
  });
});
