/**
 * Supported POSIX locale codes
 * @see [POSIX Locale](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap07.html)
 * @see [GNU - Locale names](https://www.gnu.org/software/libc/manual/html_node/Locale-Names.html)
 */
export const Locales = [
  // African & Middle Eastern
  'af_ZA', // Afrikaans
  'am_ET', // Amharic
  'ar_SA', // Arabic (Saudi Arabia)
  'ar_EG', // Arabic (Egypt) - Most populous Arabic locale
  'ar_AE', // Arabic (United Arab Emirates)
  'ar_MA', // Arabic (Morocco)
  'ha_NG', // Hausa (Nigeria) - ~94 million speakers
  'ig_NG', // Igbo (Nigeria)
  'om_ET', // Oromo (Ethiopia)
  'ps_AF', // Pashto
  'so_SO', // Somali (Somalia)
  'sw_KE', // Swahili (Kenya)
  'sw_TZ', // Swahili (Tanzania)
  'wo_SN', // Wolof
  'xh_ZA', // Xhosa
  'yo_NG', // Yoruba
  'yo_BJ', // Yoruba (Benin)
  'zu_ZA', // Zulu

  // Caucasian & Central Asian
  'az_AZ', // Azerbaijani
  'hy_AM', // Armenian
  'ka_GE', // Georgian
  'kk_KZ', // Kazakh
  'ky_KG', // Kyrgyz
  'tk_TM', // Turkmen
  'ug_CN', // Uyghur
  'uz_UZ', // Uzbek

  // Kashmiri variants
  'ks_IN', // Kashmiri (India - Arabic script / RTL)
  'ks_PK', // Kashmiri (Pakistan - Arabic script / RTL)

  // European - Baltic & Slavic
  'be_BY', // Belarusian
  'bg_BG', // Bulgarian
  'bs_BA', // Bosnian
  'cs_CZ', // Czech
  'hr_HR', // Croatian
  'lt_LT', // Lithuanian
  'lv_LV', // Latvian
  'mk_MK', // Macedonian
  'pl_PL', // Polish
  'ru_RU', // Russian
  'sk_SK', // Slovak
  'sl_SI', // Slovenian
  'sq_AL', // Albanian
  'sr_RS', // Serbian
  'sr_BA', // Serbian (Bosnia)
  'sr_ME', // Serbian (Montenegro)
  'uk_UA', // Ukrainian

  // European - Romance & Germanic
  'ca_ES', // Catalan
  'cy_GB', // Welsh
  'da_DK', // Danish
  'de_DE', // German (Germany)
  'de_AT', // German (Austria)
  'de_CH', // German (Switzerland)
  'el_GR', // Greek
  'et_EE', // Estonian
  'eu_ES', // Basque
  'fi_FI', // Finnish
  'ga_IE', // Irish
  'gl_ES', // Galician
  'hu_HU', // Hungarian
  'is_IS', // Icelandic
  'it_IT', // Italian (Italy)
  'it_CH', // Italian (Switzerland)
  'mt_MT', // Maltese
  'nl_NL', // Dutch
  'nl_BE', // Flemish
  'no_NO', // Norwegian (Bokmål)
  'nn_NO', // Norwegian (Nynorsk)
  'ro_RO', // Romanian
  'sv_SE', // Swedish

  // English variants
  'en_US',
  'en_GB',
  'en_AU',
  'en_CA',
  'en_NZ',
  'en_IN',
  'en_IE', // Ireland
  'en_ZA', // South Africa
  'en_SG', // Singapore

  // French variants
  'fr_FR',
  'fr_CA',
  'fr_BE',
  'fr_CH',
  'fr_MA', // Morocco / Francophone Africa

  // Spanish variants
  'es_ES',
  'es_MX',
  'es_AR',
  'es_CO',
  'es_CL',
  'es_PE', // Peru
  'es_VE', // Venezuela
  'es_US',

  // Portuguese variants
  'pt_PT',
  'pt_BR',

  // South Asian & Indo-Iranian
  'as_IN', // Assamese
  'bho_IN', // Bhojpuri - ~53M speakers
  'bn_BD', // Bengali (Bangladesh)
  'bn_IN', // Bengali (India)
  'dv_MV', // Dhivehi
  'fa_IR', // Persian (Iran)
  'fa_AF', // Persian/Dari (Afghanistan)
  'gu_IN', // Gujarati
  'he_IL', // Hebrew
  'hi_IN', // Hindi
  'kn_IN', // Kannada
  'ku_TR', // Kurdish (Turkey)
  'ku_IR', // Kurdish (Iran)
  'ku_IQ', // Kurdish (Iraq)
  'ku_SY', // Kurdish (Syria)
  'mai_IN', // Maithili
  'ml_IN', // Malayalam
  'mr_IN', // Marathi - ~99M speakers
  'ne_NP', // Nepali
  'pa_IN', // Punjabi (India)
  'pa_PK', // Punjabi (Pakistan)
  'sd_IN', // Sindhi (India)
  'sd_PK', // Sindhi (Pakistan)
  'si_LK', // Sinhala
  'ta_IN', // Tamil
  'te_IN', // Telugu
  'ur_PK', // Urdu (Pakistan)
  'ur_IN', // Urdu (India)

  // East & Southeast Asian
  'bo_CN', // Tibetan (China)
  'bo_IN', // Tibetan (India)
  'dz_BT', // Dzongkha
  'id_ID', // Indonesian
  'ja_JP', // Japanese
  'jv_ID', // Javanese
  'km_KH', // Khmer
  'ko_KR', // Korean
  'lo_LA', // Lao
  'mn_MN', // Mongolian
  'ms_MY', // Malay (Malaysia)
  'ms_BN', // Malay (Brunei)
  'my_MM', // Burmese
  'su_ID', // Sundanese
  'th_TH', // Thai
  'tl_PH', // Tagalog/Filipino (Philippines) - ~87M speakers
  'vi_VN', // Vietnamese
  'zh_CN', // Chinese (Simplified)
  'zh_TW', // Chinese (Traditional, Taiwan)
  'zh_HK', // Chinese (Traditional, HK)
  'zh_SG', // Chinese (Simplified, Singapore)

  // Americas & Indigenous
  'gug_PY', // Guaraní

  // Yiddish variants
  'yi_US',
  'yi_IL',
  'yi_DE',
  'tr_TR', // Turkish
] as const;

export const LocalesSet = new Set(Locales);

/**
 * @see [POSIX Locale](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap07.html)
 */
export type Locale = (typeof Locales)[number] & {};

export type InferBCP47Locale<T extends string> =
  T extends `${infer Lang}_${infer Region}` ? `${Lang}-${Region}` : never;

export type InferPosixFromBCP47Locale<T extends BCP47Locale> =
  T extends `${infer First}-${infer Second}` ? `${First}_${Second}` : never;

export type InferISO639_1LanguageCode<T extends string> =
  T extends `${infer Lang}_${infer _Region}` ? Lang : never;

export type InferISO639_1RegionCode<T extends string> =
  T extends `${infer _Lang}_${infer Region}` ? Region : never;

/**
 * @see [MDN - BCP 47](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag)
 */
export type BCP47Locale = InferBCP47Locale<Locale> & {};

/**
 * @see [ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1)
 */
export type ISO639_1LanguageCode = InferISO639_1LanguageCode<Locale>;

export type CountryCode = InferISO639_1RegionCode<Locale>;
