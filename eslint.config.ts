import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import prettierConfig from './prettier.config.js';

export default defineConfig([
  // TypeScript recommendations
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{mts,ts,tsx,js}'],
    ignores: ['**/*.json', '**/*.md', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
  },

  // Custom setup
  {
    plugins: {
      'unused-imports': unusedImports,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      'prettier/prettier': ['error', prettierConfig],

      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'import/no-cycle': 'error',
      'arrow-body-style': 0,
      'prefer-arrow-callback': 0,
      'prefer-template': 2,
      'object-shorthand': ['error', 'always'],

      '@typescript-eslint/restrict-template-expressions': 0,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 0,
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksConditionals: true,
          checksVoidReturn: true,
          checksSpreads: true,
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'error',
      'no-duplicate-imports': 2,

      'import/export': 2, // No re-exporting the same name
      'import/no-mutable-exports': 2, // Disallow the export of non-constants
      'import/no-self-import': 2, // Prevent a module from importing itself
      'import/no-useless-path-segments': 2, // Prevent unnecessary path segments in import and require statements
      'import/newline-after-import': 2, // Enforce a newline after import statements
      'import/no-duplicates': 2, // Prevent duplicate imports
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'always',
          ts: 'always',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
    },
  },
]);
