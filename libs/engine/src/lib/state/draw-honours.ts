import { compareByCodeUnitOrder } from '../core/ids';
import { seededDrawOrder } from '../core/seeded-draw';
import type { MatchConfig } from '../config/match-config';

/**
 * Draws the match's honours from the pool without replacement, with the match seed. Each draw uses its own
 * labelled seed, so the result depends only on the seed and the pool, never on the pool's order.
 */
export function drawHonourIds(
  config: MatchConfig,
  matchSeed: string,
): readonly string[] {
  const pool = config.honours.pool
    .map((honour): string => honour.id)
    .toSorted(compareByCodeUnitOrder);
  return seededDrawOrder(pool, `${matchSeed}:honour`).slice(
    0,
    config.honours.drawnPerMatch,
  );
}
