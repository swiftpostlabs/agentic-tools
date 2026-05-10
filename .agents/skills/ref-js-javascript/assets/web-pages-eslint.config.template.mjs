// @ts-check

import eslint from '@eslint/js';
import userscripts from 'eslint-plugin-userscripts';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SCRIPT_FILES = [
  'scripts/**/*.js',
  'scripts/**/*.mjs',
  'scripts/**/*.cjs',
  'scripts/**/*.ts',
  'scripts/**/*.mts',
  'scripts/**/*.cts',
];
const JAVASCRIPT_USERSCRIPT_FILES = ['src/features/**/*.user.js'];
const TYPESCRIPT_USERSCRIPT_FILES = ['src/features/**/*.user.ts'];
const WEB_FILES = ['src/features/**/*.js', 'src/features/**/*.mjs'];
const IGNORED_FEATURE_WEB_FILES = [
  'src/features/**/*.user.js',
  'src/features/**/*.user.ts',
  'src/features/example-tooling-sandbox/server-preview.js',
];

/** @type {import('@typescript-eslint/utils/ts-eslint').FlatConfig.RuleEntry} */
const UNUSED_VARS_RULE = [
  'error',
  {
    args: 'all',
    argsIgnorePattern: '^_',
    caughtErrors: 'all',
    caughtErrorsIgnorePattern: '^_',
    destructuredArrayIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    ignoreRestSiblings: true,
  },
];

const userscriptGlobals = {
  GM_addStyle: 'readonly',
  GM_deleteValue: 'readonly',
  GM_getValue: 'readonly',
  GM_listValues: 'readonly',
  GM_openInTab: 'readonly',
  GM_registerMenuCommand: 'readonly',
  GM_setClipboard: 'readonly',
  GM_setValue: 'readonly',
  GM_xmlhttpRequest: 'readonly',
  unsafeWindow: 'readonly',
};

const scriptParserOptions = {
  project: './tsconfig.json',
  tsconfigRootDir: import.meta.dirname,
};

export default defineConfig(
  {
    ignores: ['node_modules', 'out', 'dist', 'coverage'],
  },
  {
    files: WEB_FILES,
    ignores: IGNORED_FEATURE_WEB_FILES,
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-useless-rename': 'error',
    },
  },
  {
    files: SCRIPT_FILES,
    extends: [eslint.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: scriptParserOptions,
    },
    rules: {
      curly: ['error', 'all'],
      'no-unused-vars': 'off',
      'no-useless-rename': 'error',
      '@typescript-eslint/no-unused-vars': UNUSED_VARS_RULE,
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  {
    files: JAVASCRIPT_USERSCRIPT_FILES,
    extends: [eslint.configs.recommended],
    plugins: {
      userscripts: {
        rules: userscripts.rules,
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...userscriptGlobals,
      },
    },
    rules: {
      ...userscripts.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-useless-rename': 'error',
      'userscripts/filename-user': 'off',
    },
    settings: {
      userscriptVersions: {
        greasemonkey: '*',
        tampermonkey: '*',
        violentmonkey: '*',
      },
    },
  },
  {
    files: TYPESCRIPT_USERSCRIPT_FILES,
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      userscripts: {
        rules: userscripts.rules,
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...userscriptGlobals,
      },
    },
    rules: {
      ...userscripts.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-useless-rename': 'error',
      '@typescript-eslint/no-unused-vars': UNUSED_VARS_RULE,
      'userscripts/filename-user': 'off',
    },
    settings: {
      userscriptVersions: {
        greasemonkey: '*',
        tampermonkey: '*',
        violentmonkey: '*',
      },
    },
  },
);
