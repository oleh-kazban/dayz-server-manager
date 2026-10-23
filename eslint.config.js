import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const reactPlugin = fixupPluginRules(react);

export default tseslint.config(
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.nx/**',
      'tmp/**',
      'apps/web/public/mockServiceWorker.js',
      '...sandbox/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    plugins: {
      '@nx': nxEslintPlugin,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allowCircularSelfDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: import.meta.dirname,
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
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array',
          readonly: 'array',
        },
      ],
      'no-duplicate-imports': 'error',
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
            ['^(?!@dsm|@dayz-server-manager)@?\\w'],
            ['^@dsm(/.*|$)', '^@dayz-server-manager(/.*|$)', '^@/'],
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // --- SonarQube & Shift-Left Code Quality ---
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-hardcoded-ip': 'warn',
      'sonarjs/todo-tag': 'warn',
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'no-constant-binary-expression': 'error',
      'no-nested-ternary': 'error',
      'no-self-compare': 'error',
      'use-isnan': 'error',
    },
  },
  eslintConfigPrettier,
);
