import { EngineContractError } from '../core/engine-error';
import type { MatchConfig } from '../config/match-config';
import { TEST_CONFIG } from '../../testing/test-config';
import { P1, P2, P3, P4 } from '../../testing/test-state';
import {
  createInitialMatchState,
  FIRST_TURN_NUMBER,
} from './create-initial-match-state';

describe('createInitialMatchState', () => {
  it('gives each seated player their capital, starting units, starting supply and commander', () => {
    const state = createInitialMatchState(
      TEST_CONFIG,
      [
        { playerId: P3, seat: 3, commanderId: 'warden' },
        { playerId: P1, seat: 1, commanderId: 'plain' },
        { playerId: P4, seat: 4, commanderId: 'warden' },
        { playerId: P2, seat: 2, commanderId: 'gunner' },
      ],
      'seed-1',
    );

    expect(state.matchSeed).toBe('seed-1');
    expect(state.honourIds).toHaveLength(TEST_CONFIG.honours.drawnPerMatch);
    expect(state.turnNumber).toBe(FIRST_TURN_NUMBER);
    expect(
      state.players.map((player) => [
        player.playerId,
        player.seat,
        player.startingCapitalZoneId,
        player.commanderId,
      ]),
    ).toEqual([
      [P1, 1, 'A1', 'plain'],
      [P2, 2, 'A3', 'gunner'],
      [P3, 3, 'C1', 'warden'],
      [P4, 4, 'C3', 'warden'],
    ]);
    expect(state.players[0]).toEqual({
      playerId: P1,
      seat: 1,
      startingCapitalZoneId: 'A1',
      supply: 6,
      score: 0,
      commanderId: 'plain',
      upgrades: [],
      abilityUsed: false,
      eliminated: false,
    });
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

  it('puts every commander passive in play, duplicates included', () => {
    const state = createInitialMatchState(
      TEST_CONFIG,
      [
        { playerId: P1, seat: 1, commanderId: 'warden' },
        { playerId: P2, seat: 2, commanderId: 'warden' },
      ],
      'seed',
    );
    expect(state.modifiers).toEqual([
      {
        id: 'passive:warden:p1',
        ownerId: P1,
        source: { kind: 'commanderPassive', commanderId: 'warden' },
        scope: { kind: 'player', playerId: P1 },
        duration: { kind: 'permanent' },
        target: { kind: 'none' },
      },
      {
        id: 'passive:warden:p2',
        ownerId: P2,
        source: { kind: 'commanderPassive', commanderId: 'warden' },
        scope: { kind: 'player', playerId: P2 },
        duration: { kind: 'permanent' },
        target: { kind: 'none' },
      },
    ]);
  });

  it('puts the event in play from the start when the first turn is an event turn', () => {
    const config: MatchConfig = {
      ...TEST_CONFIG,
      schedule: [{ label: 'Only', scoring: [], eventActive: true }],
    };
    const state = createInitialMatchState(
      config,
      [{ playerId: P1, seat: 1, commanderId: 'plain' }],
      'seed',
    );
    expect(
      state.modifiers.filter((modifier) => modifier.source.kind === 'event'),
    ).toEqual([
      expect.objectContaining({
        duration: { kind: 'nights', fromTurn: 1, untilTurn: 1 },
      }),
    ]);
  });

  it('leaves the capitals of empty seats neutral and empty', () => {
    const state = createInitialMatchState(
      TEST_CONFIG,
      [
        { playerId: P1, seat: 1, commanderId: 'plain' },
        { playerId: P2, seat: 4, commanderId: 'plain' },
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
          { playerId: P1, seat: 1, commanderId: 'plain' },
          { playerId: P1, seat: 2, commanderId: 'plain' },
          { playerId: P2, seat: 2, commanderId: 'plain' },
        ],
        'seed',
      ),
    ).toThrow(
      new EngineContractError(
        'Invalid seating: player p1 is seated more than once; seat 2 is taken more than once',
      ),
    );
  });

  it('rejects seats the map has no capital for, and unknown commanders', () => {
    expect(() =>
      createInitialMatchState(
        TEST_CONFIG,
        [{ playerId: P1, seat: 7, commanderId: 'plain' }],
        'seed',
      ),
    ).toThrow(EngineContractError);
    expect(() =>
      createInitialMatchState(
        TEST_CONFIG,
        [{ playerId: P1, seat: 1, commanderId: 'nobody' }],
        'seed',
      ),
    ).toThrow(new EngineContractError('Missing commander nobody'));
  });
});
