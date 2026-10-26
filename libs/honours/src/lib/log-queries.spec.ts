import { EngineContractError } from '@lunch-campaign/engine';
import { P1, P2, record, standings, supply } from '../testing/log-builder';
import {
  countOf,
  eventsOfType,
  finalStandings,
  playerIds,
  sumOf,
} from './log-queries';

describe('log queries', () => {
  const log = record([
    standings(1, [{ playerId: P1, units: 9 }]),
    supply(1, P1, 3),
    standings(2, [{ playerId: P1 }, { playerId: P2 }]),
  ]);

  it('filters events by type', () => {
    expect(eventsOfType(log, 'SupplyProduced')).toEqual([supply(1, P1, 3)]);
  });

  it('reads the last recorded standings as final', () => {
    expect(finalStandings(log).map((standing) => standing.playerId)).toEqual([
      P1,
      P2,
    ]);
    expect(playerIds(log)).toEqual([P1, P2]);
  });

  it('refuses a record with no resolved night', () => {
    expect(() => finalStandings(record([]))).toThrow(EngineContractError);
  });

  it('sums and counts', () => {
    expect(sumOf([1, 2, 3])).toBe(6);
    expect(sumOf([])).toBe(0);
    expect(countOf([1, 2, 3], (value) => value > 1)).toBe(2);
  });
});
