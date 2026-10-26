import type { MatchState, PlayerSeating } from '@lunch-campaign/engine';
import {
  createEventModifier,
  createInitialMatchState,
  createUnitCounts,
  effectiveParameters,
  toPlayerId,
} from '@lunch-campaign/engine';
import { DEFAULT_MATCH_CONFIG } from '../config/default-match-config';
import {
  armyIn,
  createV0State,
  eventsOfType,
  firstEvent,
  move,
  P1,
  P2,
  P3,
  P4,
  play,
} from '../../testing/v0-scenario';
import { SIR_JOHN_MOORE } from './commanders';
import {
  ARMISTICE,
  DEFAULT_EVENTS,
  FOG,
  LEVEE_EN_MASSE,
  MUD,
  TYPHUS,
} from './events';

const WEDNESDAY = 3;

function onWednesdayWith(
  eventId: string,
  zones: Parameters<typeof createV0State>[0]['zones'],
): MatchState {
  return createV0State({
    turnNumber: WEDNESDAY,
    zones,
    extraModifiers: [createEventModifier(eventId, WEDNESDAY)],
  });
}

describe('events', () => {
  it('Mud: cavalry loses its counter bonus and artillery cannot move', () => {
    const zones = {
      B2: { owner: P1, units: { cavalry: 3, artillery: 1 } },
      B3: { owner: P2, units: { skirmishers: 3 } },
    };
    const orders = [
      {
        playerId: P1,
        orders: [
          move('B2', 'B3', { cavalry: 3 }),
          move('B2', 'C2', { artillery: 1 }),
        ],
      },
    ];
    // Normally cavalry 3 × 2 = 6 beat skirmishers 3 × 1.25 = 3.75; in the mud 3 lose.
    const dry = play(createV0State({ turnNumber: WEDNESDAY, zones }), orders);
    const muddy = play(onWednesdayWith(MUD, zones), orders);
    expect(firstEvent(dry.replayLog, 'BattleResolved').battle.outcome).toEqual({
      kind: 'victory',
      winnerId: P1,
    });
    expect(
      firstEvent(muddy.replayLog, 'BattleResolved').battle.outcome,
    ).toEqual({ kind: 'victory', winnerId: P2 });
    expect(
      eventsOfType(muddy.replayLog, 'OrderRejected').map(
        (event) => event.reason,
      ),
    ).toEqual(['beyondMoveRange']);
  });

  it('Fog: spies are unavailable and unit counts hidden for the day', () => {
    const foggy = onWednesdayWith(FOG, {});
    expect(
      effectiveParameters(foggy, DEFAULT_MATCH_CONFIG, P1, null),
    ).toMatchObject({
      spiesAvailable: false,
      unitCountsVisible: false,
    });
    const thursday = play(foggy, []).state;
    expect(
      effectiveParameters(thursday, DEFAULT_MATCH_CONFIG, P1, null),
    ).toMatchObject({
      spiesAvailable: true,
      unitCountsVisible: true,
    });
  });

  it('Typhus: each player’s largest army loses 20%, rounded down, minimum 1', () => {
    const { state, replayLog } = play(
      onWednesdayWith(TYPHUS, {
        A1: { owner: P1, units: { line: 5, cavalry: 5 } },
        A2: { owner: P1, units: { line: 2 } },
        A4: { owner: P2, units: { line: 1 } },
        D1: { owner: P3, units: { skirmishers: 4 } },
      }),
      [],
    );
    expect(armyIn(state, 'A1', P1)).toEqual(
      createUnitCounts({ line: 4, cavalry: 4 }),
    );
    expect(armyIn(state, 'A4', P2)).toEqual(createUnitCounts({ line: 1 }));
    expect(armyIn(state, 'D1', P3)).toEqual(
      createUnitCounts({ skirmishers: 3 }),
    );
    expect(
      eventsOfType(replayLog, 'UnitsLostToModifier').map(
        (event) => event.playerId,
      ),
    ).toEqual([P1, P3]);
  });

  it('Levée en masse: 3 free line at the capital, else a city, else the largest army', () => {
    const { state } = play(
      onWednesdayWith(LEVEE_EN_MASSE, {
        A1: { owner: P1, units: { line: 1 } },
        A4: { owner: P3, units: { line: 1 } },
        B3: { owner: P2 },
        D1: { owner: P3 },
        C4: { owner: P4, units: { cavalry: 1 } },
      }),
      [],
    );
    expect(armyIn(state, 'A1', P1)).toEqual(createUnitCounts({ line: 4 }));
    expect(armyIn(state, 'B3', P2)).toEqual(createUnitCounts({ line: 3 }));
    expect(armyIn(state, 'D1', P3)).toEqual(createUnitCounts({ line: 3 }));
    expect(armyIn(state, 'C4', P4)).toEqual(
      createUnitCounts({ line: 3, cavalry: 1 }),
    );
  });

  it('Armistice: no combat; moves into held or contested zones bounce back', () => {
    const { state, replayLog } = play(
      onWednesdayWith(ARMISTICE, {
        B2: { owner: P1, units: { line: 4 } },
        B3: { owner: P2, units: { line: 1 } },
        D2: { owner: P3, units: { line: 1 } },
      }),
      [
        {
          playerId: P1,
          orders: [
            move('B2', 'B3', { line: 2 }),
            move('B2', 'C2', { line: 1 }),
          ],
        },
        { playerId: P3, orders: [move('D2', 'C2', { line: 1 })] },
      ],
    );
    expect(eventsOfType(replayLog, 'MoveBounced')).toHaveLength(3);
    expect(eventsOfType(replayLog, 'BattleResolved')).toEqual([]);
    expect(armyIn(state, 'B2', P1)).toEqual(createUnitCounts({ line: 4 }));
  });

  it('is drawn with the match seed, announced at Tuesday’s resolution and active only on Wednesday', () => {
    const seating: readonly PlayerSeating[] = [1, 2, 3, 4].map((seat) => ({
      playerId: toPlayerId(`p${seat}`),
      seat,
      commanderId: SIR_JOHN_MOORE,
    }));
    const monday = createInitialMatchState(
      DEFAULT_MATCH_CONFIG,
      seating,
      'event-week',
    );
    const tuesday = play(monday, []).state;
    const tuesdayNight = play(tuesday, []);
    const announcement = firstEvent(tuesdayNight.replayLog, 'EventAnnounced');
    expect(DEFAULT_EVENTS.map((event) => event.id)).toContain(
      announcement.eventId,
    );
    expect(announcement.activeTurnNumber).toBe(WEDNESDAY);
    const wednesdayNight = play(tuesdayNight.state, []);
    expect(
      wednesdayNight.state.modifiers.filter(
        (modifier) => modifier.source.kind === 'event',
      ),
    ).toEqual([]);
    expect(eventsOfType(play(monday, []).replayLog, 'EventAnnounced')).toEqual(
      [],
    );
    expect(P4).toBe('p4');
  });
});
