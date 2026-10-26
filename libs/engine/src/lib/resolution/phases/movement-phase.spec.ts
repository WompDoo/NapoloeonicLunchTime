import type { PlayerOrders } from '../../orders/orders';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { describeUnits } from '../../../testing/describe-board';
import type { TestStateOptions } from '../../../testing/test-state';
import {
  createTestState,
  moveOrder,
  P1,
  P2,
  P3,
  P4,
  zoneId,
} from '../../../testing/test-state';
import type { MatchState } from '../../state/match-state';
import { findZone } from '../../state/match-state-queries';
import {
  eventsOfType,
  firstEventOfType,
} from '../../../testing/replay-queries';
import { applyMovementPhase } from './movement-phase';
import type { ResolutionState } from '../resolution-state';

function move(
  options: TestStateOptions,
  submissions: readonly PlayerOrders[],
): ResolutionState {
  const state = createTestState(options);
  return applyMovementPhase(
    startResolution(state),
    createTestContext(state, submissions, TEST_CONFIG),
  );
}

/** `{ A2: 'p1:L2' }`-style summary of every zone that holds armies. */
function occupiedZones(state: MatchState): Readonly<Record<string, string>> {
  return Object.fromEntries(
    state.zones
      .filter((zone) => zone.armies.length > 0)
      .map((zone) => [
        zone.zoneId,
        zone.armies
          .map((army) => `${army.playerId}:${describeUnits(army.units)}`)
          .join(' '),
      ]),
  );
}

describe('movement phase', () => {
  it('moves a group into an empty zone without changing ownership yet', () => {
    const result = move(
      { zones: { A1: { owner: P1, units: { line: 3, cavalry: 1 } } } },
      [{ playerId: P1, orders: [moveOrder('A1', 'A2', { line: 2 })] }],
    );
    expect(occupiedZones(result.match)).toEqual({ A1: 'p1:L1C1', A2: 'p1:L2' });
    expect(findZone(result.match, zoneId('A2')).ownerId).toBeNull();
    expect(result.replayLog).toEqual([
      {
        type: 'ArmyMoved',
        turnNumber: 1,
        playerId: P1,
        fromZoneId: 'A1',
        viaZoneIds: [],
        toZoneId: 'A2',
        units: expect.objectContaining({ line: 2 }),
      },
    ]);
  });

  it('empties the source zone but keeps its owner', () => {
    const result = move({ zones: { A1: { owner: P1, units: { line: 1 } } } }, [
      { playerId: P1, orders: [moveOrder('A1', 'B1', { line: 1 })] },
    ]);
    expect(findZone(result.match, zoneId('A1'))).toEqual({
      zoneId: 'A1',
      ownerId: P1,
      armies: [],
    });
  });

  it('merges orders along the same route into one group, sorted by route', () => {
    const result = move(
      { zones: { A1: { owner: P1, units: { line: 3, cavalry: 2 } } } },
      [
        {
          playerId: P1,
          orders: [
            moveOrder('A1', 'B1', { cavalry: 1 }),
            moveOrder('A1', 'A2', { line: 1 }),
            moveOrder('A1', 'B1', { line: 2 }),
          ],
        },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({
      A1: 'p1:C1',
      A2: 'p1:L1',
      B1: 'p1:L2C1',
    });
    expect(
      eventsOfType(result.replayLog, 'ArmyMoved').map(
        (event) => `${event.fromZoneId}->${event.toZoneId}`,
      ),
    ).toEqual(['A1->A2', 'A1->B1']);
  });

  it('lets a player swap units between two own zones without a clash', () => {
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { line: 2 } },
          A2: { owner: P1, units: { cavalry: 1 } },
        },
      },
      [
        {
          playerId: P1,
          orders: [
            moveOrder('A1', 'A2', { line: 2 }),
            moveOrder('A2', 'A1', { cavalry: 1 }),
          ],
        },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({ A1: 'p1:C1', A2: 'p1:L2' });
    expect(eventsOfType(result.replayLog, 'FieldBattle')).toEqual([]);
  });

  it('fights a head-on clash without defender bonus; the survivors continue', () => {
    const result = move(
      {
        zones: {
          A2: { owner: P1, units: { line: 3 } },
          B2: { owner: P2, units: { cavalry: 2 } },
        },
      },
      [
        { playerId: P1, orders: [moveOrder('A2', 'B2', { line: 3 })] },
        { playerId: P2, orders: [moveOrder('B2', 'A2', { cavalry: 2 })] },
      ],
    );
    // line 3 · 2 = 6 vs cavalry 2 · 1 = 2; losses ceil(0.5 · 2) = 1
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:L2' });
    const fieldBattle = firstEventOfType(result.replayLog, 'FieldBattle');
    expect(fieldBattle.connection).toEqual(['A2', 'B2']);
    expect(fieldBattle.battle.outcome).toEqual({
      kind: 'victory',
      winnerId: P1,
    });
    expect(fieldBattle.battle.sides.map((side) => side.role)).toEqual([
      'attacker',
      'attacker',
    ]);
  });

  it('destroys both groups when a head-on clash is tied', () => {
    const result = move(
      {
        zones: {
          A2: { owner: P1, units: { line: 2 } },
          B2: { owner: P2, units: { line: 2 } },
        },
      },
      [
        { playerId: P2, orders: [moveOrder('B2', 'A2', { line: 2 })] },
        { playerId: P1, orders: [moveOrder('A2', 'B2', { line: 2 })] },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({});
  });

  it('sends clash survivors on to meet the units that stayed behind', () => {
    const result = move(
      {
        zones: {
          A2: { owner: P1, units: { line: 3 } },
          B2: { owner: P2, units: { cavalry: 3 } },
        },
      },
      [
        { playerId: P1, orders: [moveOrder('A2', 'B2', { line: 3 })] },
        { playerId: P2, orders: [moveOrder('B2', 'A2', { cavalry: 1 })] },
      ],
    );
    // clash: line 6 vs cavalry 1; losses ceil(0.5) = 1. Battle at B2 happens in the combat phase.
    expect(occupiedZones(result.match)).toEqual({ B2: 'p1:L2 p2:C2' });
  });

  it('lets a player enter a zone its owner is leaving without a clash', () => {
    const result = move(
      {
        zones: {
          A2: { owner: P1, units: { line: 1 } },
          A3: { owner: P2, units: { cavalry: 1 } },
        },
      },
      [
        { playerId: P1, orders: [moveOrder('A2', 'A1', { line: 1 })] },
        { playerId: P2, orders: [moveOrder('A3', 'A2', { cavalry: 1 })] },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({ A1: 'p1:L1', A2: 'p2:C1' });
  });

  it('rotates a four-player cycle simultaneously', () => {
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { line: 1 } },
          A2: { owner: P2, units: { cavalry: 1 } },
          B2: { owner: P3, units: { skirmishers: 1 } },
          B1: { owner: P4, units: { artillery: 1 } },
        },
      },
      [
        { playerId: P1, orders: [moveOrder('A1', 'A2', { line: 1 })] },
        { playerId: P2, orders: [moveOrder('A2', 'B2', { cavalry: 1 })] },
        { playerId: P3, orders: [moveOrder('B2', 'B1', { skirmishers: 1 })] },
        { playerId: P4, orders: [moveOrder('B1', 'A1', { artillery: 1 })] },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({
      A1: 'p4:A1',
      A2: 'p1:L1',
      B1: 'p3:S1',
      B2: 'p2:C1',
    });
  });

  it('gathers several players in one zone, armies in seat order', () => {
    const result = move(
      {
        zones: {
          A1: { owner: P1, units: { line: 1 } },
          A3: { owner: P2, units: { line: 1 } },
          B2: { owner: P3, units: { line: 1 } },
        },
      },
      [
        { playerId: P3, orders: [moveOrder('B2', 'A2', { line: 1 })] },
        { playerId: P2, orders: [moveOrder('A3', 'A2', { line: 1 })] },
        { playerId: P1, orders: [moveOrder('A1', 'A2', { line: 1 })] },
      ],
    );
    expect(occupiedZones(result.match)).toEqual({ A2: 'p1:L1 p2:L1 p3:L1' });
  });
});
