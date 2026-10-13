import type { Config } from 'prettier';

const config: Config = {
  endOfLine: 'lf',
  printWidth: 80,
  semi: true,
  useTabs: false,
  singleQuote: true,
  arrowParens: 'avoid',
  tabWidth: 2,
  trailingComma: 'es5',
  plugins: [],
  experimentalTernaries: true,
};

export default config;
