import type {
  BattleSideResult,
  PlayerId,
  ReplayEvent,
  VisibleEvent,
} from '@lunch-campaign/player-view';
import {
  canaryNightView,
  createUnitCounts,
  NAPOLEON_PLAYER,
  spiedWeekView,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/player-view/testing';
import { narrateVisibleEvent } from './narrate-night';

const P1 = toPlayerId('p1');
const P2 = toPlayerId('p2');
const P3 = toPlayerId('p3');
const A1 = toZoneId('A1');
const A2 = toZoneId('A2');
const B2 = toZoneId('B2');
const UNITS = createUnitCounts({ line: 2, cavalry: 1 });

function full(event: ReplayEvent): VisibleEvent {
  return { visibility: 'full', event };
}

function wipedOut(playerId: PlayerId): BattleSideResult {
  return {
    playerId,
    role: 'attacker',
    unitsBefore: createUnitCounts({ cavalry: 1 }),
    unitsLost: createUnitCounts({ cavalry: 1 }),
    unitsRemaining: createUnitCounts({}),
    strength: {
      contributions: [],
      baseStrength: 0,
      bonuses: [],
      totalStrength: 0,
    },
  };
}

function narrateNight(view: {
  readonly lastNight: readonly VisibleEvent[];
}): string {
  return view.lastNight.flatMap(narrateVisibleEvent).join('\n');
}

describe('narrateVisibleEvent', () => {
  it('tells a battle in full to a player who fought in it', () => {
    expect(narrateNight(canaryNightView(P2))).toMatchSnapshot();
  });

  it('tells the same night to a player outside the battle', () => {
    expect(narrateNight(canaryNightView(P1))).toMatchSnapshot();
  });

  it('tells a defence won under bombardment', () => {
    expect(narrateNight(spiedWeekView(3, NAPOLEON_PLAYER))).toMatchSnapshot();
  });

  it.each<{
    readonly name: string;
    readonly visible: VisibleEvent;
    readonly lines: readonly string[];
  }>([
    {
      name: 'a rejected order',
      visible: full({
        type: 'OrderRejected',
        turnNumber: 1,
        playerId: P1,
        orderIndex: 0,
        order: { kind: 'recruit', unitType: 'artillery', count: 4 },
        reason: 'insufficientSupply',
      }),
      lines: ["p1's order 1 (recruit) was rejected: insufficient supply"],
    },
    {
      name: 'an upgrade',
      visible: full({
        type: 'UpgradeBought',
        turnNumber: 1,
        playerId: P1,
        upgradeId: 'squares',
        cost: 6,
      }),
      lines: ['p1 bought squares for 6 supply'],
    },
    {
      name: 'an ability without a target',
      visible: full({
        type: 'AbilityUsed',
        turnNumber: 1,
        playerId: P1,
        commanderId: 'napoleon',
        abilityId: 'grand-battery',
        target: { kind: 'none' },
      }),
      lines: ['p1 used grand-battery'],
    },
    {
      name: 'an ability on a zone',
      visible: full({
        type: 'AbilityUsed',
        turnNumber: 1,
        playerId: P1,
        commanderId: 'wellington',
        abilityId: 'reverse-slope',
        target: { kind: 'ownedZone', zoneId: B2 },
      }),
      lines: ['p1 used reverse-slope on B2'],
    },
    {
      name: 'a revealed ability without a target',
      visible: {
        visibility: 'abilityRevealed',
        event: {
          type: 'AbilityUsed',
          turnNumber: 1,
          playerId: P1,
          commanderId: 'murat',
          abilityId: 'grand-charge',
          target: { kind: 'none' },
        },
      },
      lines: ['p1 used grand-charge'],
    },
    {
      name: 'a revealed ability on a zone',
      visible: {
        visibility: 'abilityRevealed',
        event: {
          type: 'AbilityUsed',
          turnNumber: 1,
          playerId: P1,
          commanderId: 'kutuzov',
          abilityId: 'scorched-earth',
          target: { kind: 'ownedZone', zoneId: B2 },
        },
      },
      lines: ['p1 used scorched-earth on B2'],
    },
    {
      name: 'an ability with no effect',
      visible: full({
        type: 'AbilityHadNoEffect',
        turnNumber: 1,
        playerId: P1,
        modifierId: 'ability:blucher:p1:1',
      }),
      lines: ["p1's ability had no effect"],
    },
    {
      name: 'granted units',
      visible: full({
        type: 'UnitsGranted',
        turnNumber: 3,
        playerId: P1,
        zoneId: A1,
        units: UNITS,
        modifierId: 'event:levee-en-masse:3',
      }),
      lines: ['p1 received 2L 1C at A1'],
    },
    {
      name: "someone else's granted units",
      visible: {
        visibility: 'counted',
        event: {
          type: 'UnitsGranted',
          turnNumber: 3,
          playerId: P1,
          zoneIds: [A1],
          count: 3,
        },
      },
      lines: ['p1 received 3 units at A1'],
    },
    {
      name: 'a bounced move',
      visible: full({
        type: 'MoveBounced',
        turnNumber: 1,
        playerId: P1,
        fromZoneId: A1,
        toZoneId: A2,
        units: UNITS,
      }),
      lines: ["p1's move A1 -> A2 bounced back (2L 1C)"],
    },
    {
      name: 'a blocked retreat',
      visible: full({
        type: 'RetreatBlocked',
        turnNumber: 1,
        playerId: P1,
        zoneId: A2,
        units: UNITS,
      }),
      lines: ["p1's 2L 1C at A2 had nowhere to retreat"],
    },
    {
      name: 'units lost to an event',
      visible: full({
        type: 'UnitsLostToModifier',
        turnNumber: 3,
        playerId: P1,
        zoneId: A2,
        units: UNITS,
        modifierId: 'event:typhus:3',
      }),
      lines: ['p1 lost 2L 1C at A2'],
    },
    {
      name: 'a bombardment that hit nothing',
      visible: full({
        type: 'Bombardment',
        turnNumber: 1,
        playerId: P1,
        fromZoneId: A1,
        targetZoneId: B2,
        artillery: 2,
        hits: [],
        blockedHits: 2,
        wastedHits: 0,
      }),
      lines: [
        "p1's 2 artillery in A1 bombarded B2: no hits (2 blocked, 0 wasted)",
      ],
    },
    {
      name: 'a battle bombarded to nothing',
      visible: full({
        type: 'BattleDecidedByBombardment',
        turnNumber: 1,
        zoneId: B2,
        survivorId: null,
      }),
      lines: ['The battle at B2 ended under bombardment: nobody left standing'],
    },
    {
      name: 'a neutral zone captured',
      visible: full({
        type: 'ZoneCaptured',
        turnNumber: 1,
        zoneId: B2,
        previousOwnerId: null,
        newOwnerId: P1,
      }),
      lines: ['p1 captured B2'],
    },
    {
      name: 'points for one city',
      visible: full({
        type: 'PointsAwarded',
        turnNumber: 3,
        playerId: P1,
        source: 'cityPoints',
        citiesHeld: 1,
        points: 1,
      }),
      lines: ['p1 scored 1 point for 1 city'],
    },
    {
      name: 'an elimination',
      visible: full({ type: 'PlayerEliminated', turnNumber: 4, playerId: P3 }),
      lines: ['p3 was eliminated'],
    },
    {
      name: 'an announced event',
      visible: full({
        type: 'EventAnnounced',
        turnNumber: 2,
        eventId: 'fog',
        activeTurnNumber: 3,
      }),
      lines: ['Event announced: fog, in play on turn 3'],
    },
    {
      name: 'a head-on clash that destroyed both sides',
      visible: full({
        type: 'FieldBattle',
        turnNumber: 1,
        connection: [A1, A2],
        battle: {
          sides: [wipedOut(P1), wipedOut(P2)],
          outcome: { kind: 'mutualDestruction' },
        },
      }),
      lines: [
        'Field battle between A1 and A2: both sides destroyed',
        '  p1 (attacker): 1C -> none, strength 0',
        '    no units left to fight',
        '  p2 (attacker): 1C -> none, strength 0',
        '    no units left to fight',
      ],
    },
    {
      name: 'a head-on clash seen from outside',
      visible: {
        visibility: 'battleOutcome',
        event: {
          type: 'FieldBattle',
          turnNumber: 1,
          zoneIds: [A1, A2],
          sides: [
            { playerId: P1, role: 'attacker', unitsBefore: 1, unitsAfter: 0 },
            { playerId: P2, role: 'attacker', unitsBefore: 1, unitsAfter: 0 },
          ],
          outcome: { kind: 'mutualDestruction' },
        },
      },
      lines: [
        'Field battle between A1 and A2: both sides destroyed',
        '  p1 (attacker): 1 unit -> 0 units',
        '  p2 (attacker): 1 unit -> 0 units',
      ],
    },
  ])('tells $name', ({ visible, lines }) => {
    expect(narrateVisibleEvent(visible)).toEqual(lines);
  });
});
