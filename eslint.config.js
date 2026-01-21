import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import redos from 'eslint-plugin-redos'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '**/__tests__', '**/*.test.ts', '**/*.test.tsx']),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      redos,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: 'tsconfig.app.json',
      },
    },
    rules: {
      // Detect redundant type constituents in unions (e.g., string | 'literal')
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      // Enforce unused variables detection
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Cyclomatic complexity limit
      'complexity': ['error', { max: 10 }],
      // Prevent ReDoS vulnerabilities
      'redos/no-vulnerable': 'error',
    },
  },
  {
    files: ['api/**/*.ts'],
    plugins: {
      redos,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        project: 'tsconfig.api.json',
      },
    },
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Cyclomatic complexity limit
      'complexity': ['error', { max: 10 }],
      // Prevent ReDoS vulnerabilities
      'redos/no-vulnerable': 'error',
    },
  },
])
