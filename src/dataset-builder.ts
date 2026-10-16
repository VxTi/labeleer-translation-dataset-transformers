import { merge as _merge } from 'lodash-es';
import type {
  TranslationDataset,
  TranslationLocalizedEntries,
  TranslationPluralization,
} from './definitions.js';
import type { Locale } from './locales/index.js';
/**
 * A builder class for constructing translation datasets.
 */
export class DatasetBuilder {
  private readonly dataset: TranslationDataset;

  public constructor() {
    this.dataset = {};
  }

  /**
   * Add a translation to a translation entry.
   */
  public addTranslation(
    key: string,
    translations: Partial<TranslationLocalizedEntries>
  ): this {
    this.ensureExistence(key);
    this.dataset[key] ??= { translations: {} };
    _merge(this.dataset[key].translations, translations);

    return this;
  }

  /**
   * Add a singular translation to a translation entry.
   */
  public addTranslationForLocale(
    key: string,
    locale: Locale,
    value: string
  ): this {
    return this.addTranslation(key, { [locale]: value });
  }

  /**
   * Add plural forms to a translation entry.
   */
  public addPluralEntry(
    key: string,
    pluralForms: TranslationPluralization | undefined
  ): this {
    if (!pluralForms) return this;

    this.ensureExistence(key);

    this.dataset[key] ??= { translations: {} };
    _merge(this.dataset[key].plurals, pluralForms);
    return this;
  }

  /**
   * Add a description to a translation entry.
   */
  public addDescription(
    key: string,
    description: string | undefined | null
  ): this {
    if (!description) return this;

    this.ensureExistence(key);

    this.dataset[key] ??= { translations: {} };
    this.dataset[key].description = description;
    return this;
  }

  /**
   * Add tags to a translation entry.
   */
  addTags(key: string, tags: string[] | undefined): this {
    if (!tags?.length) return this;

    this.ensureExistence(key);
    this.dataset[key] ??= { translations: {} };
    this.dataset[key].tags = tags;
    return this;
  }

  /**
   * Merge another dataset into this builder.
   */
  public merge(otherDataset: TranslationDataset): this {
    _merge(this.dataset, otherDataset);
    return this;
  }

  private ensureExistence(key: string): void {
    this.dataset[key] ??= { translations: {}, plurals: {} };
  }

  build(): TranslationDataset {
    return this.dataset;
  }
}
