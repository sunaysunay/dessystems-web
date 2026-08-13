'use strict';
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.inspect.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'import', 'react-hooks'],
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises':  'error',
    '@typescript-eslint/no-unused-vars':       ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/exhaustive-deps':             'error',
    'import/no-cycle':                         ['error', { maxDepth: 4 }],
    'complexity':                              ['error', 15],
    'max-lines-per-function':                  ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    'max-lines':                               ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    'no-magic-numbers':                        ['warn',  { ignore: [0, 1, -1], ignoreArrayIndexes: true }],
    'eqeqeq':                                  'error',
    'no-fallthrough':                          'error',
    'default-case':                            'error',
  },
  ignorePatterns: [
    'node_modules/', '.next/', 'tools/', 'scripts/',
    '*.config.js', '*.config.cjs', '*.config.mjs', 'postcss.config.*',
  ],
};
