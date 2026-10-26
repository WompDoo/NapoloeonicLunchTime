import nx from '@nx/eslint-plugin';

/** "Cyclomatic complexity under 3": at most one decision point per function. */
const MAX_CYCLOMATIC_COMPLEXITY = 2;

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/coverage'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:engine',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'type:content',
              onlyDependOnLibsWithTags: ['type:engine'],
            },
            {
              sourceTag: 'type:honours',
              onlyDependOnLibsWithTags: ['type:engine', 'type:content'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: ['error', { max: MAX_CYCLOMATIC_COMPLEXITY }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowTypedFunctionExpressions: false },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1],
          ignoreArrayIndexes: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.spec.ts', '**/testing/**/*.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowTypedFunctionExpressions: true },
      ],
    },
  },
];
