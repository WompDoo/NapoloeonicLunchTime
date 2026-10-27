import { tabAfterKey } from './match-tabs';

describe('tabAfterKey', () => {
  it.each([
    { from: 'map', key: 'ArrowRight', to: 'orders' },
    { from: 'honours', key: 'ArrowRight', to: 'map' },
    { from: 'map', key: 'ArrowLeft', to: 'honours' },
    { from: 'night', key: 'Home', to: 'map' },
    { from: 'orders', key: 'End', to: 'honours' },
    { from: 'orders', key: 'Enter', to: null },
  ] as const)('moves from $from with $key to $to', ({ from, key, to }) => {
    expect(tabAfterKey(from, key)).toBe(to);
  });
});
