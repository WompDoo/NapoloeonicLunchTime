import type { MatchConfig } from '../config/match-config';
import {
  createCommanderPassiveModifier,
  createEventModifier,
} from '../modifiers/active-modifiers';
import { TEST_CONFIG } from '../../testing/test-config';
import { NO_EFFECT } from '../../testing/test-content';
import { createTestContext, startResolution } from '../../testing/test-context';
import { eventsOfType } from '../../testing/replay-queries';
import {
  createTestState,
  P1,
  P2,
  P3,
  recruitOrder,
} from '../../testing/test-state';
import { CORE_STEP_PRIORITY, runPhase } from './run-phase';

/** Two commanders whose passives both grant units in the purchase phase, one before and one after the core step. */
const CONFIG: MatchConfig = {
  ...TEST_CONFIG,
  commanders: [
    ...TEST_CONFIG.commanders,
    {
      id: 'early',
      passive: {
        ...NO_EFFECT,
        phaseSteps: [
          {
            phase: 'purchase',
            priority: CORE_STEP_PRIORITY - 1,
            action: {
              kind: 'grantFreeUnits',
              units: { line: 1, cavalry: 0, skirmishers: 0, artillery: 0 },
            },
          },
        ],
      },
      ability: TEST_CONFIG.commanders[0]?.ability ?? {
        id: 'x',
        targetKind: 'none',
        scope: 'owner',
        durationInNights: 1,
        effect: NO_EFFECT,
      },
    },
    {
      id: 'late',
      passive: {
        ...NO_EFFECT,
        phaseSteps: [
          {
            phase: 'purchase',
            priority: CORE_STEP_PRIORITY + 1,
            action: {
              kind: 'grantFreeUnits',
              units: { line: 0, cavalry: 1, skirmishers: 0, artillery: 0 },
            },
          },
        ],
      },
      ability: TEST_CONFIG.commanders[0]?.ability ?? {
        id: 'x',
        targetKind: 'none',
        scope: 'owner',
        durationInNights: 1,
        effect: NO_EFFECT,
      },
    },
  ],
};

describe('runPhase', () => {
  it('runs modifier steps around the core step by priority, then by owner seat', () => {
    const state = createTestState({
      zones: { A1: { owner: P1 }, A3: { owner: P2 }, C1: { owner: P3 } },
      modifiers: [
        createCommanderPassiveModifier(P3, 'late'),
        createCommanderPassiveModifier(P2, 'early'),
        createCommanderPassiveModifier(P1, 'late'),
      ],
    });
    const result = runPhase(
      startResolution(state),
      'purchase',
      createTestContext(
        state,
        [{ playerId: P1, orders: [recruitOrder('skirmishers', 1)] }],
        CONFIG,
      ),
    );
    expect(
      result.replayLog.map(
        (event) =>
          `${event.type}:${'modifierId' in event ? event.modifierId : 'core'}`,
      ),
    ).toEqual([
      'UnitsGranted:passive:early:p2',
      'UnitsRecruited:core',
      'UnitsGranted:passive:late:p1',
      'UnitsGranted:passive:late:p3',
    ]);
  });

  it('applies a player-scoped step to its owner only', () => {
    const state = createTestState({
      zones: { A1: { owner: P1 }, A3: { owner: P2 } },
      modifiers: [createCommanderPassiveModifier(P2, 'late')],
    });
    const result = runPhase(
      startResolution(state),
      'purchase',
      createTestContext(state, [], CONFIG),
    );
    expect(
      eventsOfType(result.replayLog, 'UnitsGranted').map(
        (event) => event.playerId,
      ),
    ).toEqual([P2]);
  });

  it('runs only the steps of the phase being resolved', () => {
    const state = createTestState({
      zones: { A1: { owner: P1, units: { line: 5 } } },
      modifiers: [createEventModifier('plague', 1)],
    });
    const purchase = runPhase(
      startResolution(state),
      'purchase',
      createTestContext(state, [], TEST_CONFIG),
    );
    expect(eventsOfType(purchase.replayLog, 'UnitsLostToModifier')).toEqual([]);
  });
});

describe('runPhase tie-breaks', () => {
  it('runs an event step at core priority after the core step (same seat, ordered by key)', () => {
    const config: MatchConfig = {
      ...TEST_CONFIG,
      events: [
        {
          id: 'muster',
          effect: {
            ...NO_EFFECT,
            phaseSteps: [
              {
                phase: 'purchase',
                priority: CORE_STEP_PRIORITY,
                action: {
                  kind: 'grantFreeUnits',
                  units: { line: 1, cavalry: 0, skirmishers: 0, artillery: 0 },
                },
              },
            ],
          },
        },
      ],
    };
    const state = createTestState({
      zones: { A1: { owner: P1 } },
      modifiers: [createEventModifier('muster', 1)],
    });
    const result = runPhase(
      startResolution(state),
      'purchase',
      createTestContext(
        state,
        [{ playerId: P1, orders: [recruitOrder('line', 1)] }],
        config,
      ),
    );
    expect(result.replayLog.map((event) => event.type)).toEqual([
      'UnitsRecruited',
      'UnitsGranted',
    ]);
  });
});
