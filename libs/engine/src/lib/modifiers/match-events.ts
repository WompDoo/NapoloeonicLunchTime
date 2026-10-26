import { requirePresent } from '../core/engine-error';
import { compareByCodeUnitOrder } from '../core/ids';
import { seededIndex } from '../core/random';
import type { MatchConfig } from '../config/match-config';
import type { EventDefinition } from './modifier-definitions';

/**
 * The event active on a turn: drawn from the pool with the match seed if the schedule makes it an event
 * turn, otherwise none. The draw depends only on the seed and the turn, never on when it is made.
 */
export function drawEventsForTurn(
  config: MatchConfig,
  matchSeed: string,
  turnNumber: number,
): readonly EventDefinition[] {
  return isEventTurn(config, turnNumber)
    ? drawEvent(config, matchSeed, turnNumber)
    : [];
}

function isEventTurn(config: MatchConfig, turnNumber: number): boolean {
  const entry = config.schedule[turnNumber - 1];
  return entry !== undefined && entry.eventActive;
}

function drawEvent(
  config: MatchConfig,
  matchSeed: string,
  turnNumber: number,
): readonly EventDefinition[] {
  const pool = config.events.toSorted((left, right): number =>
    compareByCodeUnitOrder(left.id, right.id),
  );
  return pool.length === 0
    ? []
    : [
        requirePresent(
          pool[seededIndex(`${matchSeed}:event:${turnNumber}`, pool.length)],
          'drawn event',
        ),
      ];
}
