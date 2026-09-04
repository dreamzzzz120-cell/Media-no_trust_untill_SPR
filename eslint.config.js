export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error'
    }
  }
];
