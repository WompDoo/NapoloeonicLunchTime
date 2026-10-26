import baseConfig from '../../eslint.config.mjs';

const DETERMINISM_MESSAGE =
  'Renderers are pure functions of a PlayerView: no clocks, randomness, I/O or locale-dependent behaviour.';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: DETERMINISM_MESSAGE },
        { name: 'process', message: DETERMINISM_MESSAGE },
        { name: 'console', message: DETERMINISM_MESSAGE },
        { name: 'setTimeout', message: DETERMINISM_MESSAGE },
        { name: 'setInterval', message: DETERMINISM_MESSAGE },
        { name: 'fetch', message: DETERMINISM_MESSAGE },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: DETERMINISM_MESSAGE },
        { property: 'localeCompare', message: DETERMINISM_MESSAGE },
      ],
    },
  },
];
