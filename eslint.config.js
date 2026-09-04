export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.js', '**/*.ts'],
    rules: {
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error'
    }
  }
];
