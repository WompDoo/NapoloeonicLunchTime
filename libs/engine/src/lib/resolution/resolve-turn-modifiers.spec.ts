import type { MatchConfig } from '../config/match-config';
import type { PlayerOrders } from '../orders/orders';
import {
  createCommanderPassiveModifier,
  createUpgradeModifier,
} from '../modifiers/active-modifiers';
import { describeTurn } from '../../testing/describe-board';
import { TEST_CONFIG } from '../../testing/test-config';
import { NO_EFFECT } from '../../testing/test-content';
import { eventsOfType, firstEventOfType } from '../../testing/replay-queries';
import {
  abilityOrder,
  createTestState,
  moveOrder,
  ownedZoneTarget,
  P1,
  P2,
  P3,
  P4,
  reinforcementTarget,
  supportOrder,
  upgradeOrder,
  zoneId,
} from '../../testing/test-state';
import { requirePresent } from '../core/engine-error';
import { findZone } from '../state/match-state-queries';
import type { MatchState } from '../state/match-state';
import { resolveTurn } from './resolve-turn';
import type { TurnResult } from './resolve-turn';

/** The event is drawn for turn 2, announced in turn 1's cleanup, and gone after turn 2. */
function withOnlyEventOnTurn2(
  config: MatchConfig,
  eventId: string,
): MatchConfig {
  return {
    ...config,
    events: config.events.filter((event) => event.id === eventId),
    schedule: config.schedule.map((entry, index) => ({
      ...entry,
      eventActive: index === 1,
    })),
  };
}

function playNights(
  state: MatchState,
  nights: readonly (readonly PlayerOrders[])[],
  config: MatchConfig,
): readonly TurnResult[] {
  return nights.reduce<readonly TurnResult[]>(
    (results, orders) => [
      ...results,
      resolveTurn(stateAfter(results, state), orders, config),
    ],
    [],
  );
}

function stateAfter(
  results: readonly TurnResult[],
  initial: MatchState,
): MatchState {
  const last = results[results.length - 1];
  return last === undefined ? initial : last.state;
}

function night(results: readonly TurnResult[], index: number): TurnResult {
  return requirePresent(results[index], `night ${index}`);
}

describe('resolveTurn with modifiers', () => {
  it('runs a brand-new event defined only as data (no engine changes)', () => {
    const config = withOnlyEventOnTurn2(
      {
        ...TEST_CONFIG,
        events: [
          {
            id: 'heavy-rain',
            effect: {
              ...NO_EFFECT,
              patches: [
                {
                  kind: 'unitTypeNumber',
                  parameter: 'moveRange',
                  unitType: 'artillery',
                  operation: 'set',
                  value: 0,
                },
                {
                  kind: 'matrixCell',
                  parameter: 'offense',
                  row: 'cavalry',
                  column: 'skirmishers',
                  operation: 'set',
                  value: 1,
                },
              ],
            },
          },
        ],
      },
      'heavy-rain',
    );
    const state = createTestState({
      zones: {
        A1: { owner: P1, units: { artillery: 1, cavalry: 2 } },
        A2: { owner: P2, units: { skirmishers: 2 } },
      },
    });
    const nightOrders = [
      {
        playerId: P1,
        orders: [
          moveOrder('A1', 'B1', { artillery: 1 }),
          moveOrder('A1', 'A2', { cavalry: 2 }),
        ],
      },
    ];
    const nights = playNights(state, [[], nightOrders], config);
    const monday = night(nights, 0);
    const tuesday = night(nights, 1);

    expect(eventsOfType(monday.replayLog, 'EventAnnounced')).toEqual([
      {
        type: 'EventAnnounced',
        turnNumber: 1,
        eventId: 'heavy-rain',
        activeTurnNumber: 2,
      },
    ]);
    expect(firstEventOfType(tuesday.replayLog, 'OrderRejected').reason).toBe(
      'beyondMoveRange',
    );
    // Without its counter bonus, 2 cavalry (2) into 2 defending skirmishers (2 × 1.25) lose.
    expect(
      firstEventOfType(tuesday.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P2 });
    expect(tuesday.state.modifiers).toEqual([]);
  });

  it('bounces moves only on the night the bounce event is active', () => {
    const config = withOnlyEventOnTurn2(TEST_CONFIG, 'truce');
    const state = createTestState({
      zones: {
        A1: { owner: P1, units: { line: 3 } },
        A2: { owner: P2, units: { line: 1 } },
      },
    });
    const attack = [
      { playerId: P1, orders: [moveOrder('A1', 'A2', { line: 3 })] },
    ];
    const nights = playNights(state, [[], attack, attack], config);
    const truceNight = night(nights, 1);
    const normalNight = night(nights, 2);
    expect(eventsOfType(truceNight.replayLog, 'MoveBounced')).toHaveLength(1);
    expect(eventsOfType(normalNight.replayLog, 'MoveBounced')).toHaveLength(0);
    expect(findZone(normalNight.state, zoneId('A2')).ownerId).toBe(P1);
  });

  describe('two players using the same phase step on the same night', () => {
    const state = createTestState({
      players: [{ commanderId: 'marshal' }, { commanderId: 'marshal' }, {}, {}],
      zones: {
        A2: { owner: P1, units: { line: 4 } },
        B3: { owner: P2, units: { line: 4 } },
        B2: { owner: P3, units: { skirmishers: 4 } },
      },
    });
    const orders: readonly PlayerOrders[] = [
      {
        playerId: P1,
        orders: [
          moveOrder('A2', 'B2', { line: 2 }),
          abilityOrder(reinforcementTarget('A2', 'B2', { line: 2 })),
        ],
      },
      {
        playerId: P2,
        orders: [
          moveOrder('B3', 'B2', { line: 2 }),
          abilityOrder(reinforcementTarget('B3', 'B2', { line: 2 })),
        ],
      },
    ];

    it('resolves them by priority, then seat', () => {
      const { replayLog } = resolveTurn(state, orders, TEST_CONFIG);
      expect(
        eventsOfType(replayLog, 'ReinforcementsJoined').map(
          (event) => event.playerId,
        ),
      ).toEqual([P1, P2]);
      expect(
        firstEventOfType(replayLog, 'BattleResolved').battle.sides.map(
          (side) => side.unitsBefore.line,
        ),
      ).toEqual([4, 4, 0]);
    });

    it('gives the same result whatever order the submissions arrive in', () => {
      expect(
        JSON.stringify(resolveTurn(state, [...orders].reverse(), TEST_CONFIG)),
      ).toBe(JSON.stringify(resolveTurn(state, orders, TEST_CONFIG)));
    });
  });

  it('resolves a busy night: upgrade, ability, support, bombardment, retreat (snapshot)', () => {
    const state = createTestState({
      turnNumber: 2,
      players: [
        { supply: 12 },
        { commanderId: 'warden' },
        { commanderId: 'gunner' },
        {},
      ],
      zones: {
        A1: { owner: P1, units: { line: 2, artillery: 2 } },
        A2: { owner: P1, units: { line: 3, cavalry: 2, skirmishers: 1 } },
        B1: { owner: P1 },
        B2: { owner: P2, units: { line: 3, skirmishers: 2 } },
        B3: { owner: P2, units: { artillery: 2 } },
        C2: { owner: P3, units: { cavalry: 4, artillery: 1 } },
        C3: { owner: P4, units: { line: 2 } },
      },
      modifiers: [
        createCommanderPassiveModifier(P2, 'warden'),
        createCommanderPassiveModifier(P3, 'gunner'),
        createUpgradeModifier(P4, 'drill'),
      ],
    });
    const orders: readonly PlayerOrders[] = [
      {
        playerId: P1,
        orders: [
          upgradeOrder('retreat'),
          moveOrder('A2', 'B2', { line: 3, cavalry: 2, skirmishers: 1 }),
          supportOrder('A1', 'A2', 2),
        ],
      },
      {
        playerId: P2,
        orders: [
          abilityOrder(ownedZoneTarget('B2')),
          supportOrder('B3', 'B2', 2),
        ],
      },
      {
        playerId: P3,
        orders: [
          moveOrder('C2', 'B2', { cavalry: 4 }),
          abilityOrder({ kind: 'none' }),
          supportOrder('C2', 'B2', 1),
        ],
      },
      { playerId: P4, orders: [moveOrder('C3', 'C2', { line: 2 })] },
    ];
    const first = resolveTurn(state, orders, TEST_CONFIG);
    const second = resolveTurn(
      structuredClone(state),
      structuredClone(orders),
      TEST_CONFIG,
    );
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(
      describeTurn(first.state, first.replayLog, TEST_CONFIG),
    ).toMatchSnapshot();
  });
});
