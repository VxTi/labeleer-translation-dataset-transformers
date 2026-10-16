import { isNotNil } from '@vxti/typed';
import { expect, it, describe } from 'vitest';
import {
  mockDataset,
  mockParsingOptions,
  mockSerializationOptions,
} from '../__testutils__/index.js';
import { Plurality } from '../locales/index.js';
import {
  DEFAULT_XCSTRINGS_FILE_NAME,
  XCStringsDatasetTransformer,
} from './xcstrings-transformer.js';

const transformer = XCStringsDatasetTransformer;

describe('xcstrings parsing', () => {
  it('should parse a simple xcstrings file', () => {
    const dataset = `{
        "sourceLanguage": "en_US",
        "strings": {
          "first-entry": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en_US": {
                "stringUnit": {
                  "state": "translated",
                  "value": "hello"
                }
              },
              "nl_NL": {
                "stringUnit": {
                  "state": "translated",
                  "value": "world"
                }
              }
            }
          },
          "plural-entry": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en_US": {
                "variations": {
                  "plural": {
                    "one": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "singular"
                      }
                    },
                    "other": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "other"
                      }
                    }
                  }
                }
              },
              "nl_NL": {
                "variations": {
                  "plural": {
                    "one": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "enkel"
                      }
                    },
                    "other": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "meer"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "version": "1.0"
      }`;
    const parsed = transformer.parse(dataset, mockParsingOptions());
    expect(parsed).toMatchObject({
      'first-entry': {
        translations: {
          en_US: 'hello',
          nl_NL: 'world',
        },
      },
      'plural-entry': {
        plurals: {
          en_US: {
            [Plurality.ONE]: 'singular',
            [Plurality.OTHER]: 'other',
          },
          nl_NL: {
            [Plurality.ONE]: 'enkel',
            [Plurality.OTHER]: 'meer',
          },
        },
      },
    });
  });
});

describe('xcstrings serialization', () => {
  it('should serialize a simple dataset into xcstrings', () => {
    const dataset = mockDataset({
      strict: {
        translations: {
          en_US: 'must exist',
        },
      },
      plural: {
        translations: {},
        plurals: {
          en_US: { [Plurality.ONE]: 'hello', [Plurality.OTHER]: 'helloos' },
          nl_NL: { [Plurality.ONE]: 'hallo', [Plurality.OTHER]: 'halloos' },
        },
      },
    });

    const result = transformer.serialize(dataset, mockSerializationOptions());
    const fileName = `${DEFAULT_XCSTRINGS_FILE_NAME}.xcstrings`;

    expect.assert(isNotNil(result[fileName]));
    expect(result[fileName].content).toContain('must exist');
    expect(result[fileName].content).toMatchInlineSnapshot(`
      "{
        "sourceLanguage": "en-US",
        "strings": {
          "first-entry": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en-US": {
                "stringUnit": {
                  "state": "translated",
                  "value": "hello"
                }
              },
              "nl-NL": {
                "stringUnit": {
                  "state": "translated",
                  "value": "world"
                }
              }
            }
          },
          "second-entry": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en-US": {
                "stringUnit": {
                  "state": "translated",
                  "value": "hello"
                }
              },
              "nl-NL": {
                "stringUnit": {
                  "state": "translated",
                  "value": "again"
                }
              }
            }
          },
          "strict": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en-US": {
                "stringUnit": {
                  "state": "translated",
                  "value": "must exist"
                }
              }
            }
          },
          "plural": {
            "comment": "",
            "extractionState": "manual",
            "localizations": {
              "en-US": {
                "variations": {
                  "plural": {
                    "one": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "hello"
                      }
                    },
                    "other": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "helloos"
                      }
                    }
                  }
                }
              },
              "nl-NL": {
                "variations": {
                  "plural": {
                    "one": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "hallo"
                      }
                    },
                    "other": {
                      "stringUnit": {
                        "state": "translated",
                        "value": "halloos"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "version": "1.0"
      }"
    `);
  });
});
