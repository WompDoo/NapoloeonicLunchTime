const nxPreset = require('@nx/jest/preset').default;

const FULL_COVERAGE_PERCENT = 100;

module.exports = {
  ...nxPreset,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/testing/**',
    '!src/index.ts',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      branches: FULL_COVERAGE_PERCENT,
      functions: FULL_COVERAGE_PERCENT,
      lines: FULL_COVERAGE_PERCENT,
      statements: FULL_COVERAGE_PERCENT,
    },
  },
};
