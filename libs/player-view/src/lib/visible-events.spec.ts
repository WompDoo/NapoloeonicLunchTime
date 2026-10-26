import {
  bombardment,
  decided,
  field,
  formed,
  P1,
  P2,
  P3,
  resolved,
  standings,
  supply,
  captured,
  points,
} from '@lunch-campaign/honours/testing';
import type { ReplayEvent } from '@lunch-campaign/engine';
import { createUnitCounts, toPlayerId, toZoneId } from '@lunch-campaign/engine';
import type { VisibleEvent } from './visible-events';
import { visibleEventsFor } from './visible-events';

const P4 = toPlayerId('p4');
const A1 = toZoneId('A1');
const A2 = toZoneId('A2');
const B2 = toZoneId('B2');
const UNITS = createUnitCounts({ line: 2, cavalry: 1 });

function seenBy(
  viewerId: string,
  event: ReplayEvent,
  replayLog: readonly ReplayEvent[] = [event],
): readonly VisibleEvent[] {
  return visibleEventsFor([event], toPlayerId(viewerId), replayLog);
}

const PUBLIC_EVENTS: readonly ReplayEvent[] = [
  {
    type: 'UpgradeBought',
    turnNumber: 1,
    playerId: P1,
    upgradeId: 'grand-battery',
    cost: 8,
  },
  {
    type: 'AbilityHadNoEffect',
    turnNumber: 1,
    playerId: P1,
    modifierId: 'ability:blucher:p1:1',
  },
  decided(1, 'B2', P1),
  captured(1, 'B2', P1),
  points(1, P1, 3),
  { type: 'PlayerEliminated', turnNumber: 1, playerId: P1 },
  { type: 'ModifierExpired', turnNumber: 1, modifierId: 'event:fog:3' },
  {
    type: 'EventAnnounced',
    turnNumber: 2,
    eventId: 'fog',
    activeTurnNumber: 3,
  },
  standings(1, [{ playerId: P1, units: 7 }]),
];

const PRIVATE_EVENTS: readonly ReplayEvent[] = [
  {
    type: 'OrderRejected',
    turnNumber: 1,
    playerId: P1,
    orderIndex: 0,
    order: { kind: 'recruit', unitType: 'artillery', count: 4 },
    reason: 'insufficientSupply',
  },
  supply(1, P1, 6),
];

interface CountedCase {
  readonly event: ReplayEvent;
  readonly zoneIds: readonly string[];
  readonly count: number;
}

const COUNTED_CASES: readonly CountedCase[] = [
  {
    event: {
      type: 'UnitsRecruited',
      turnNumber: 1,
      playerId: P1,
      zoneId: A1,
      unitType: 'cavalry',
      count: 2,
      cost: 6,
    },
    zoneIds: ['A1'],
    count: 2,
  },
  {
    event: {
      type: 'UnitsGranted',
      turnNumber: 1,
      playerId: P1,
      zoneId: A1,
      units: UNITS,
      modifierId: 'event:levee-en-masse:3',
    },
    zoneIds: ['A1'],
    count: 3,
  },
  {
    event: {
      type: 'ArmyMoved',
      turnNumber: 1,
      playerId: P1,
      fromZoneId: A1,
      viaZoneIds: [A2],
      toZoneId: B2,
      units: UNITS,
    },
    zoneIds: ['A1', 'A2', 'B2'],
    count: 3,
  },
  {
    event: {
      type: 'MoveBounced',
      turnNumber: 1,
      playerId: P1,
      fromZoneId: A1,
      toZoneId: A2,
      units: UNITS,
    },
    zoneIds: ['A1', 'A2'],
    count: 3,
  },
  {
    event: {
      type: 'ReinforcementsJoined',
      turnNumber: 1,
      playerId: P1,
      fromZoneId: A1,
      toZoneId: A2,
      units: UNITS,
      modifierId: 'ability:blucher:p1:1',
    },
    zoneIds: ['A1', 'A2'],
    count: 3,
  },
  {
    event: {
      type: 'Retreated',
      turnNumber: 1,
      playerId: P1,
      fromZoneId: A2,
      toZoneId: A1,
      units: UNITS,
    },
    zoneIds: ['A2', 'A1'],
    count: 3,
  },
  {
    event: {
      type: 'RetreatBlocked',
      turnNumber: 1,
      playerId: P1,
      zoneId: A2,
      units: UNITS,
    },
    zoneIds: ['A2'],
    count: 3,
  },
  {
    event: {
      type: 'UnitsLostToModifier',
      turnNumber: 1,
      playerId: P1,
      zoneId: A2,
      units: UNITS,
      modifierId: 'event:typhus:3',
    },
    zoneIds: ['A2'],
    count: 3,
  },
];

describe('visibleEventsFor', () => {
  it.each(PUBLIC_EVENTS.map((event) => ({ type: event.type, event })))(
    'shows $type to everyone',
    ({ event }) => {
      expect(seenBy('p1', event)).toEqual([{ visibility: 'full', event }]);
      expect(seenBy('p2', event)).toEqual([{ visibility: 'full', event }]);
    },
  );

  it.each(PRIVATE_EVENTS.map((event) => ({ type: event.type, event })))(
    'shows $type to its player only',
    ({ event }) => {
      expect(seenBy('p1', event)).toEqual([{ visibility: 'full', event }]);
      expect(seenBy('p2', event)).toEqual([]);
    },
  );

  it.each(
    COUNTED_CASES.map((testCase) => ({
      ...testCase,
      type: testCase.event.type,
    })),
  )(
    'shows $type in full to its player and as a count to others',
    ({ event, zoneIds, count }) => {
      expect(seenBy('p1', event)).toEqual([{ visibility: 'full', event }]);
      expect(seenBy('p2', event)).toEqual([
        {
          visibility: 'counted',
          event: {
            type: event.type,
            turnNumber: 1,
            playerId: P1,
            zoneIds,
            count,
          },
        },
      ]);
    },
  );

  describe('abilities', () => {
    const base = {
      type: 'AbilityUsed',
      turnNumber: 2,
      playerId: P1,
      commanderId: 'blucher',
      abilityId: 'marschall-vorwaerts',
    } as const;

    it('shows the ability in full to its player', () => {
      const event: ReplayEvent = { ...base, target: { kind: 'none' } };
      expect(seenBy('p1', event)).toEqual([{ visibility: 'full', event }]);
    });

    it.each([
      { kind: 'none', target: { kind: 'none' } as const },
      { kind: 'ownedZone', target: { kind: 'ownedZone', zoneId: B2 } as const },
    ])('reveals a $kind target as it is', ({ target }) => {
      expect(seenBy('p2', { ...base, target })).toEqual([
        { visibility: 'abilityRevealed', event: { ...base, target } },
      ]);
    });

    it('reveals reinforcements as a count', () => {
      const event: ReplayEvent = {
        ...base,
        target: {
          kind: 'reinforcement',
          fromZoneId: A1,
          toZoneId: A2,
          units: UNITS,
        },
      };
      expect(seenBy('p2', event)).toEqual([
        {
          visibility: 'abilityRevealed',
          event: {
            ...base,
            target: {
              kind: 'reinforcement',
              fromZoneId: A1,
              toZoneId: A2,
              count: 3,
            },
          },
        },
      ]);
    });
  });

  describe('battles', () => {
    const sides = [
      { playerId: P1, units: { line: 2, cavalry: 1 }, remaining: { line: 1 } },
      { playerId: P2, role: 'defender' as const, units: { skirmishers: 2 } },
    ];
    const formation = formed(1, 'B2', [
      ...sides,
      { playerId: P3, units: { artillery: 1 } },
    ]);
    const shelling = bombardment(1, P1, 'B2', [P3]);
    const battle = resolved(1, 'B2', sides, P1);
    const night: readonly ReplayEvent[] = [formation, shelling, battle];
    const outcome = {
      type: 'BattleResolved',
      turnNumber: 1,
      zoneIds: ['B2'],
      sides: [
        { playerId: P1, role: 'attacker', unitsBefore: 3, unitsAfter: 1 },
        { playerId: P2, role: 'defender', unitsBefore: 2, unitsAfter: 0 },
      ],
      outcome: { kind: 'victory', winnerId: P1 },
    };

    it.each(['p1', 'p2', 'p3'])(
      'shows %s, who was in the battle, everything',
      (viewer) => {
        expect(visibleEventsFor(night, toPlayerId(viewer), night)).toEqual(
          night.map((event) => ({ visibility: 'full', event })),
        );
      },
    );

    it('shows everyone else counts and the outcome, but no bombardment', () => {
      expect(visibleEventsFor(night, P4, night)).toEqual([
        {
          visibility: 'battleFormed',
          event: {
            type: 'BattleFormed',
            turnNumber: 1,
            zoneId: 'B2',
            sides: [
              { playerId: P1, role: 'attacker', count: 3 },
              { playerId: P2, role: 'defender', count: 2 },
              { playerId: P3, role: 'attacker', count: 1 },
            ],
          },
        },
        { visibility: 'battleOutcome', event: outcome },
      ]);
    });

    it.each([
      { name: 'on another night', other: formed(2, 'B2', sides) },
      { name: 'in another zone', other: formed(1, 'C2', sides) },
    ])('does not count a battle with the same players $name', ({ other }) => {
      const log: readonly ReplayEvent[] = [other, battle];
      expect(seenBy('p1', battle, log)).toEqual([
        { visibility: 'battleOutcome', event: outcome },
      ]);
      expect(seenBy('p1', shelling, log)).toEqual([]);
    });

    it('summarises a field battle for players outside it', () => {
      const clash = field(1, sides, null);
      expect(seenBy('p2', clash)).toEqual([
        { visibility: 'full', event: clash },
      ]);
      expect(seenBy('p3', clash)).toEqual([
        {
          visibility: 'battleOutcome',
          event: {
            ...outcome,
            type: 'FieldBattle',
            zoneIds: ['A1', 'A2'],
            outcome: { kind: 'mutualDestruction' },
          },
        },
      ]);
    });
  });

  it('keeps the order of the night', () => {
    const night: readonly ReplayEvent[] = [
      supply(1, P2, 4),
      captured(1, 'B2', P1),
      supply(1, P1, 6),
    ];
    expect(visibleEventsFor(night, P1, night)).toEqual([
      { visibility: 'full', event: night[1] },
      { visibility: 'full', event: night[2] },
    ]);
  });
});
