import type { MatchConfig } from '../config/match-config';
import { TEST_CONFIG } from '../../testing/test-config';
import { drawHonourIds } from './draw-honours';

describe('drawHonourIds', () => {
  it('draws the configured number of distinct honours, the same ones for the same seed', () => {
    const drawn = drawHonourIds(TEST_CONFIG, 'seed-a');
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn).size).toBe(3);
    expect(drawHonourIds(TEST_CONFIG, 'seed-a')).toEqual(drawn);
  });

  it('does not depend on the order of the pool', () => {
    const reversed: MatchConfig = {
      ...TEST_CONFIG,
      honours: {
        ...TEST_CONFIG.honours,
        pool: [...TEST_CONFIG.honours.pool].reverse(),
      },
    };
    expect(drawHonourIds(reversed, 'seed-b')).toEqual(
      drawHonourIds(TEST_CONFIG, 'seed-b'),
    );
  });

  it('can draw every honour across seeds', () => {
    const drawn = new Set(
      Array.from({ length: 40 }, (_, index) =>
        drawHonourIds(TEST_CONFIG, `seed-${index}`),
      ).flat(),
    );
    expect(drawn.size).toBe(TEST_CONFIG.honours.pool.length);
  });

  it('draws no more honours than the pool holds', () => {
    const config: MatchConfig = {
      ...TEST_CONFIG,
      honours: { ...TEST_CONFIG.honours, drawnPerMatch: 9 },
    };
    expect(drawHonourIds(config, 'seed').toSorted()).toEqual([
      'fewest-losses',
      'most-supply',
      'most-units',
      'most-zones',
    ]);
  });
});
