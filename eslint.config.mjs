// @ts-check

// Same base as company-evaluator-helper and swiftpost-site-template: strictTypeChecked, with
// Prettier run as a lint rule so formatting has one command and one config.
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import { configs as tseslintConfigs } from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      '.venv',
      // Templates copied into other repos, not code that runs here.
      '.agents/skills/*/assets/*.mjs',
      '.agents/skills/*/assets/*.d.ts',
    ],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  ...tseslintConfigs.strictTypeChecked,
  {
    rules: {
      // Prettier's options live here, not in a .prettierrc: formatting runs only as this rule.
      'prettier/prettier': [
        'error',
        { singleQuote: true, experimentalTernaries: true },
        { usePrettierrc: false },
      ],
      curly: ['error', 'all'],
      'no-useless-rename': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': [
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
      ],
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['*.mjs'] },
      },
    },
  },
  {
    // Skill scripts ship standalone to other repos and are checked by their own tsconfig.
    files: ['.agents/skills/**/*.mts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.skills.json'],
      },
    },
    rules: {
      // tsconfig.skills.json leaves noUncheckedIndexedAccess off, so this rule reads the scripts'
      // guards on indexed access as dead code and would push their removal.
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
);
