import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noLegacyMuiGrid from './eslint-rules/no-legacy-mui-grid.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{ts,tsx,jsx,js}'],
    plugins: {
      'local-grid': { rules: { 'no-legacy-mui-grid': noLegacyMuiGrid } },
    },
    rules: {
      'local-grid/no-legacy-mui-grid': 'error',
    }
  }
])
