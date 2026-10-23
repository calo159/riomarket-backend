/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'src/lib/api-types.ts', 'playwright-report', 'test-results'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['*.cjs', '*.js', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'],
      env: { node: true },
    },
    {
      files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
      env: { node: true },
    },
  ],
};
