import { EngineContractError } from '../../core/engine-error';
import { findCommander } from '../../config/content-queries';
import { NO_ABILITY_TARGET } from '../../modifiers/ability-target';
import {
  createAbilityModifier,
  createEventModifier,
} from '../../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  P1,
  P2,
  P3,
  reinforcementTarget,
  units,
  zoneId,
} from '../../../testing/test-state';
import { findZone } from '../../state/match-state-queries';
import type { ResolutionState } from '../resolution-state';
import { applyJoinAdjacentBattle } from './join-adjacent-battle';

const forward = findCommander(TEST_CONFIG, 'marshal').ability;
const marchFromA1ToA2 = createAbilityModifier(
  P1,
  'marshal',
  forward,
  reinforcementTarget('A1', 'A2', { line: 2 }),
  1,
);

function join(
  options: TestStateOptions,
  modifier = marchFromA1ToA2,
): ResolutionState {
  const state = createTestState(options);
  return applyJoinAdjacentBattle(
    startResolution(state),
    createTestContext(state, [], TEST_CONFIG),
    modifier,
  );
}

describe('joinAdjacentBattle', () => {
  it('sends part of an army that held into an adjacent battle its owner fights in', () => {
    const result = join({
      zones: {
        A1: { owner: P1, units: { line: 3 } },
        A2: {
          owner: P2,
          armies: [
            { playerId: P1, units: { cavalry: 1 } },
            { playerId: P2, units: { line: 2 } },
          ],
        },
      },
    });
    expect(findZone(result.match, zoneId('A1')).armies).toEqual([
      { playerId: P1, units: units({ line: 1 }) },
    ]);
    expect(findZone(result.match, zoneId('A2')).armies[0]).toEqual({
      playerId: P1,
      units: units({ line: 2, cavalry: 1 }),
    });
    expect(eventsOfType(result.replayLog, 'ReinforcementsJoined')).toHaveLength(
      1,
    );
  });

  it.each([
    {
      name: 'there is no battle in the target zone',
      zones: {
        A1: { owner: P1, units: { line: 3 } },
        A2: { owner: P1, units: { line: 1 } },
      },
    },
    {
      name: 'the battle in the target zone does not involve the owner',
      zones: {
        A1: { owner: P1, units: { line: 3 } },
        A2: {
          armies: [
            { playerId: P2, units: { line: 1 } },
            { playerId: P3, units: { line: 1 } },
          ],
        },
      },
    },
    {
      name: 'the army’s own zone has a battle tonight',
      zones: {
        A1: {
          owner: P1,
          armies: [
            { playerId: P1, units: { line: 3 } },
            { playerId: P3, units: { line: 1 } },
          ],
        },
        A2: {
          armies: [
            { playerId: P1, units: { line: 1 } },
            { playerId: P2, units: { line: 1 } },
          ],
        },
      },
    },
  ])('has no effect (but is used up) when $name', ({ zones }) => {
    const result = join({ zones });
    expect(eventsOfType(result.replayLog, 'AbilityHadNoEffect')).toEqual([
      {
        type: 'AbilityHadNoEffect',
        turnNumber: 1,
        playerId: P1,
        modifierId: marchFromA1ToA2.id,
      },
    ]);
    expect(result.match.zones).toEqual(createTestState({ zones }).zones);
  });

  it('refuses modifiers that have no owner or no reinforcement target', () => {
    expect(() =>
      join(
        {},
        {
          ...createEventModifier('levy', 1),
          target: reinforcementTarget('A1', 'A2', { line: 1 }),
        },
      ),
    ).toThrow(EngineContractError);
    expect(() =>
      join({}, { ...marchFromA1ToA2, target: NO_ABILITY_TARGET }),
    ).toThrow(
      new EngineContractError(
        'Joining a battle needs a reinforcement target, not none',
      ),
    );
  });
});
