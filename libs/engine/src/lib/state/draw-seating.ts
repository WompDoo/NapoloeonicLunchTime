import type { PlayerId } from '../core/ids';
import { compareByCodeUnitOrder } from '../core/ids';
import { seededDrawOrder } from '../core/seeded-draw';
import type { PlayerSeating } from './create-initial-match-state';

/** A player joining a match, before seats are drawn. */
export interface MatchEntrant {
  readonly playerId: PlayerId;
  readonly commanderId: string;
}

const FIRST_SEAT = 1;

/**
 * Seats 1 to n in an order drawn with the match seed, so joining early gives no advantage. Seats decide
 * starting capitals and every lowest-seat tie-break. The order entrants are given in does not matter.
 */
export function drawSeating(
  entrants: readonly MatchEntrant[],
  matchSeed: string,
): readonly PlayerSeating[] {
  const pool = entrants.toSorted((left, right): number =>
    compareByCodeUnitOrder(left.playerId, right.playerId),
  );
  return seededDrawOrder(pool, `${matchSeed}:seat`).map(
    (entrant, index): PlayerSeating => ({
      ...entrant,
      seat: FIRST_SEAT + index,
    }),
  );
}
