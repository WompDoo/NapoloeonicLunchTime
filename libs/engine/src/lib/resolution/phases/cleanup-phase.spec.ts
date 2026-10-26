import type { MatchConfig } from '../../config/match-config';
import {
  createAbilityModifier,
  createEventModifier,
  createUpgradeModifier,
} from '../../modifiers/active-modifiers';
import { findCommander } from '../../config/content-queries';
import { NO_ABILITY_TARGET } from '../../modifiers/ability-target';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import { createTestState, P1, P2, P3, P4 } from '../../../testing/test-state';
import { findPlayer } from '../../state/match-state-queries';
import { applyCleanupPhase } from './cleanup-phase';

const EVENT_ON_TURN_3: MatchConfig = {
  ...TEST_CONFIG,
  schedule: TEST_CONFIG.schedule.map((entry, index) => ({
    ...entry,
    eventActive: index === 2,
  })),
};

describe('cleanup phase', () => {
  it('eliminates players with no city and no units; their zones turn neutral', () => {
    const state = createTestState({
      zones: {
        A1: { owner: P1 },
        A2: { owner: P2 },
        B1: { owner: P3, units: { line: 1 } },
        A3: { owner: P4 },
      },
    });
    const result = applyCleanupPhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );
    expect(result.match.players.map((player) => player.eliminated)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(
      result.match.zones.find((zone) => zone.zoneId === 'A2')?.ownerId,
    ).toBeNull();
    expect(eventsOfType(result.replayLog, 'PlayerEliminated')).toEqual([
      { type: 'PlayerEliminated', turnNumber: 1, playerId: P2 },
    ]);
  });

  it('does not eliminate a player twice', () => {
    const state = createTestState({
      players: [{}, { eliminated: true }, {}, {}],
      zones: {
        A1: { owner: P1 },
        B1: { owner: P3, units: { line: 1 } },
        A3: { owner: P4 },
      },
    });
    const result = applyCleanupPhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );
    expect(eventsOfType(result.replayLog, 'PlayerEliminated')).toEqual([]);
    expect(findPlayer(result.match, P2).eliminated).toBe(true);
  });

  it('expires modifiers after their last night and advances the turn', () => {
    const barrage = createAbilityModifier(
      P1,
      'gunner',
      findCommander(TEST_CONFIG, 'gunner').ability,
      NO_ABILITY_TARGET,
      1,
    );
    const state = createTestState({
      zones: {
        A1: { owner: P1 },
        A3: { owner: P2 },
        C1: { owner: P3 },
        C3: { owner: P4 },
      },
      modifiers: [
        barrage,
        createUpgradeModifier(P1, 'drill'),
        createEventModifier('truce', 2),
      ],
    });
    const result = applyCleanupPhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );
    expect(result.match.turnNumber).toBe(2);
    expect(result.match.modifiers.map((modifier) => modifier.id)).toEqual([
      'upgrade:drill:p1',
      'event:truce:2',
    ]);
  });

  it('announces the next night’s event and puts it in play for that night', () => {
    const state = createTestState({
      turnNumber: 2,
      zones: {
        A1: { owner: P1 },
        A3: { owner: P2 },
        C1: { owner: P3 },
        C3: { owner: P4 },
      },
    });
    const result = applyCleanupPhase(
      startResolution(state),
      createTestContext(state, [], EVENT_ON_TURN_3),
    );
    const [announcement] = eventsOfType(result.replayLog, 'EventAnnounced');
    expect(announcement).toMatchObject({
      type: 'EventAnnounced',
      turnNumber: 2,
      activeTurnNumber: 3,
    });
    expect(result.match.modifiers).toEqual([
      expect.objectContaining({
        ownerId: null,
        duration: { kind: 'nights', fromTurn: 3, untilTurn: 3 },
      }),
    ]);
  });
});
