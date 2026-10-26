import { requirePresent } from '../core/engine-error';
import { compareByCodeUnitOrder } from '../core/ids';
import { seededIndex } from '../core/random';
import type { MatchConfig } from '../config/match-config';

interface HonourDraw {
  readonly drawn: readonly string[];
  readonly remaining: readonly string[];
}

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
  return Array.from({
    length: Math.min(config.honours.drawnPerMatch, pool.length),
  }).reduce<HonourDraw>(
    (draw, _unused, drawIndex): HonourDraw =>
      drawOne(draw, `${matchSeed}:honour:${drawIndex}`),
    { drawn: [], remaining: pool },
  ).drawn;
}

function drawOne(draw: HonourDraw, label: string): HonourDraw {
  const index = seededIndex(label, draw.remaining.length);
  return {
    drawn: [
      ...draw.drawn,
      requirePresent(draw.remaining[index], 'honour to draw'),
    ],
    remaining: draw.remaining.filter(
      (_honourId, candidate): boolean => candidate !== index,
    ),
  };
}
