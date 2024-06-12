import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'
import babelParser from '@babel/eslint-parser'

export default [
  {
    languageOptions: {
      parser: babelParser,
      globals: {
        ...globals.browser,
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'tools/*', '.yarn/*'],
  },
]
