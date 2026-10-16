import { describe, expect, it } from 'vitest';
import {
  getSupportedPlurality,
  nonPluralLocales,
  Plurality,
  hasPluralization,
} from './plurality.js';
import { type Locale, Locales } from './locales.js';

describe('hasPluralization', () => {
  it.each<[Locale, boolean]>([
    ...nonPluralLocales.map<[Locale, boolean]>(locale => [locale, false]),
    ['en_US', true],
    ['nl_NL', true],
  ])(
    'should correctly determine whether %s supports pluralization (%b)',
    (locale, supports) => {
      expect(hasPluralization(locale)).toEqual(supports);
    }
  );
});

describe('getSupportedPlurality', () => {
  it.each<[Locale, Plurality[]]>([
    // Two forms
    ['en_US', [Plurality.ONE, Plurality.OTHER]],
    ['nl_NL', [Plurality.ONE, Plurality.OTHER]],
    ['de_DE', [Plurality.ONE, Plurality.OTHER]],
    ['sv_SE', [Plurality.ONE, Plurality.OTHER]],
    ['el_GR', [Plurality.ONE, Plurality.OTHER]],
    ['hi_IN', [Plurality.ONE, Plurality.OTHER]],
    ['sw_KE', [Plurality.ONE, Plurality.OTHER]],
    ['mn_MN', [Plurality.ONE, Plurality.OTHER]],
    ['yi_US', [Plurality.ONE, Plurality.OTHER]],
    ['bg_BG', [Plurality.ONE, Plurality.OTHER]],

    // Romance `many` (compact large numbers)
    ['fr_FR', [Plurality.ONE, Plurality.MANY, Plurality.OTHER]],
    ['es_ES', [Plurality.ONE, Plurality.MANY, Plurality.OTHER]],
    ['pt_BR', [Plurality.ONE, Plurality.MANY, Plurality.OTHER]],
    ['it_IT', [Plurality.ONE, Plurality.MANY, Plurality.OTHER]],
    ['ca_ES', [Plurality.ONE, Plurality.MANY, Plurality.OTHER]],

    // Three forms
    ['hr_HR', [Plurality.ONE, Plurality.FEW, Plurality.OTHER]],
    ['sr_RS', [Plurality.ONE, Plurality.FEW, Plurality.OTHER]],
    ['bs_BA', [Plurality.ONE, Plurality.FEW, Plurality.OTHER]],
    ['ro_RO', [Plurality.ONE, Plurality.FEW, Plurality.OTHER]],
    ['lv_LV', [Plurality.ZERO, Plurality.ONE, Plurality.OTHER]],
    ['he_IL', [Plurality.ONE, Plurality.TWO, Plurality.OTHER]],

    // Four forms
    ['ru_RU', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['pl_PL', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['cs_CZ', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['sk_SK', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['uk_UA', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['lt_LT', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['be_BY', [Plurality.ONE, Plurality.FEW, Plurality.MANY, Plurality.OTHER]],
    ['sl_SI', [Plurality.ONE, Plurality.TWO, Plurality.FEW, Plurality.OTHER]],

    // Five forms
    [
      'ga_IE',
      [
        Plurality.ONE,
        Plurality.TWO,
        Plurality.FEW,
        Plurality.MANY,
        Plurality.OTHER,
      ],
    ],
    [
      'mt_MT',
      [
        Plurality.ONE,
        Plurality.TWO,
        Plurality.FEW,
        Plurality.MANY,
        Plurality.OTHER,
      ],
    ],

    // All forms
    ['ar_SA', Object.values(Plurality)],
    ['cy_GB', Object.values(Plurality)],
  ])('should return the CLDR plural forms for %s (%j)', (locale, expected) => {
    expect(getSupportedPlurality(locale)).toEqual(new Set(expected));
  });

  it.each<Locale>([...nonPluralLocales])(
    'should only support `other` for the non-pluralizing locale %s',
    locale => {
      expect(getSupportedPlurality(locale)).toEqual(new Set([Plurality.OTHER]));
    }
  );

  it.each<[Locale, Locale[]]>([
    ['en_US', ['en_GB', 'en_AU', 'en_CA', 'en_NZ', 'en_IN']],
    ['fr_FR', ['fr_CA', 'fr_BE', 'fr_CH']],
    ['es_ES', ['es_MX', 'es_AR', 'es_CO', 'es_CL', 'es_US']],
    ['pt_PT', ['pt_BR']],
    ['sr_RS', ['sr_BA', 'sr_ME']],
    ['nl_NL', ['nl_BE']],
    ['ku_TR', ['ku_IR', 'ku_IQ', 'ku_SY']],
    ['yi_US', ['yi_IL', 'yi_DE']],
  ])(
    'should resolve the same plural forms for every regional variant of %s',
    (locale, variants) => {
      const expected = getSupportedPlurality(locale);

      variants.forEach((variant: Locale) => {
        expect(getSupportedPlurality(variant)).toEqual(expected);
      });
    }
  );

  it.each<Locale>(Locales)(
    'should return a valid, non-empty set of plural forms for %s',
    locale => {
      const plurality = getSupportedPlurality(locale);
      const validForms: Plurality[] = Object.values(Plurality);

      expect(plurality.size).toBeGreaterThan(0);
      // `other` is the catch-all category and is mandatory in CLDR
      expect(plurality).toContain(Plurality.OTHER);
      expect([...plurality].every(form => validForms.includes(form))).toBe(
        true
      );
    }
  );

  it('should fall back to all plural forms for an unknown locale', () => {
    expect(getSupportedPlurality('xx_XX' as Locale)).toEqual(
      new Set(Object.values(Plurality))
    );
  });
});
