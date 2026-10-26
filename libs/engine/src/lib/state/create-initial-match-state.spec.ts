import { EngineContractError } from '../core/engine-error';
import { TEST_CONFIG } from '../../testing/test-config';
import { P1, P2, P3, P4 } from '../../testing/test-state';
import {
  createInitialMatchState,
  FIRST_TURN_NUMBER,
} from './create-initial-match-state';

describe('createInitialMatchState', () => {
  it('gives each seated player their capital, starting units and starting supply', () => {
    const state = createInitialMatchState(
      TEST_CONFIG,
      [
        { playerId: P3, seat: 3 },
        { playerId: P1, seat: 1 },
        { playerId: P4, seat: 4 },
        { playerId: P2, seat: 2 },
      ],
      'seed-1',
    );

    expect(state.matchSeed).toBe('seed-1');
    expect(state.turnNumber).toBe(FIRST_TURN_NUMBER);
    expect(state.players).toEqual([
      {
        playerId: P1,
        seat: 1,
        startingCapitalZoneId: 'A1',
        supply: 6,
        score: 0,
      },
      {
        playerId: P2,
        seat: 2,
        startingCapitalZoneId: 'A3',
        supply: 6,
        score: 0,
      },
      {
        playerId: P3,
        seat: 3,
        startingCapitalZoneId: 'C1',
        supply: 6,
        score: 0,
      },
      {
        playerId: P4,
        seat: 4,
        startingCapitalZoneId: 'C3',
        supply: 6,
        score: 0,
      },
    ]);
    expect(state.zones.find((zone) => zone.zoneId === 'C1')).toEqual({
      zoneId: 'C1',
      ownerId: P3,
      armies: [{ playerId: P3, units: TEST_CONFIG.startingUnits }],
    });
    expect(
      state.zones
        .filter((zone) => zone.ownerId === null)
        .map((zone) => zone.zoneId),
    ).toEqual(['A2', 'B1', 'B2', 'B3', 'C2']);
  });

  it('leaves the capitals of empty seats neutral and empty', () => {
    const state = createInitialMatchState(
      TEST_CONFIG,
      [
        { playerId: P1, seat: 1 },
        { playerId: P2, seat: 4 },
      ],
      'seed-2',
    );
    expect(state.zones.find((zone) => zone.zoneId === 'A3')).toEqual({
      zoneId: 'A3',
      ownerId: null,
      armies: [],
    });
    expect(state.zones.find((zone) => zone.zoneId === 'C3')?.ownerId).toBe(P2);
  });

  it('rejects duplicate players and seats', () => {
    expect(() =>
      createInitialMatchState(
        TEST_CONFIG,
        [
          { playerId: P1, seat: 1 },
          { playerId: P1, seat: 2 },
          { playerId: P2, seat: 2 },
        ],
        'seed',
      ),
    ).toThrow(
      new EngineContractError(
        'Invalid seating: player p1 is seated more than once; seat 2 is taken more than once',
      ),
    );
  });

  it('rejects seats the map has no capital for', () => {
    expect(() =>
      createInitialMatchState(TEST_CONFIG, [{ playerId: P1, seat: 7 }], 'seed'),
    ).toThrow(EngineContractError);
  });
});
