import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

const reactPlugin = fixupPluginRules(react);

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.nx/**',
      'tmp/**',
      'apps/web/public/mockServiceWorker.js',
    ],
  },
  {
    plugins: {
      '@nx': nxEslintPlugin,
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'export' },
        { blankLine: 'any', prev: 'export', next: 'export' },
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  eslintConfigPrettier,
  {
    files: ['**/*.{js,ts,tsx}'],
    rules: {
      'no-duplicate-imports': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'eol-last': ['error', 'always'],
    },
  },
];
