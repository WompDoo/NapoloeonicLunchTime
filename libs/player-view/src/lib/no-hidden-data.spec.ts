import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import { P1, P2, P3, P4 } from '@lunch-campaign/content/testing';
import type { MatchState, PlayerId } from '@lunch-campaign/engine';
import { findPlayer, UNIT_TYPES } from '@lunch-campaign/engine';
import type { MatchDay } from '../testing/spied-week';
import {
  CANARY_START,
  playCanaryNight,
  SECRET_SEED,
} from '../testing/canary-night';
import {
  KUTUZOV_PLAYER,
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  playSpiedWeek,
  WEEK_SEED,
  WELLINGTON_PLAYER,
} from '../testing/spied-week';
import { filterForPlayer } from './filter-for-player';
import type { PlayerView } from './player-view';

/*
 * Leak tests. They check the serialised views, not the code that builds them: anything that reaches a
 * PlayerView, in any field, counts as shown.
 */

type JsonRecord = Readonly<Record<string, unknown>>;

const NON_LINE_TYPES = UNIT_TYPES.filter((unitType) => unitType !== 'line');
const UNIT_TYPE_FIELDS = ['unitType', 'targetType'];
const PUBLIC_PLAYER_FIELDS = [
  'abilityUsed',
  'commanderId',
  'eliminated',
  'playerId',
  'score',
  'seat',
  'upgrades',
];

function viewOf(day: MatchDay, viewerId: PlayerId): PlayerView {
  return filterForPlayer(day.state, day.logs, viewerId, DEFAULT_MATCH_CONFIG);
}

/** Every object or array anywhere inside a value, the value included. */
function objectsIn(value: unknown): readonly JsonRecord[] {
  return value instanceof Object
    ? [value as JsonRecord, ...Object.values(value).flatMap(objectsIn)]
    : [];
}

function countsNonLineUnits(record: JsonRecord): boolean {
  return NON_LINE_TYPES.some((unitType) => Number(record[unitType]) > 0);
}

function namesNonLineType(record: JsonRecord): boolean {
  return UNIT_TYPE_FIELDS.some(
    (field) => field in record && record[field] !== 'line',
  );
}

function revealsNonLineUnits(view: PlayerView): readonly JsonRecord[] {
  return objectsIn(view).filter(
    (record) => countsNonLineUnits(record) || namesNonLineType(record),
  );
}

function lastNightTypes(view: PlayerView): readonly string[] {
  return view.lastNight
    .filter((visible) => visible.visibility === 'full')
    .map((visible) => visible.event.type);
}

describe('no hidden data in any PlayerView', () => {
  describe('the canary night', () => {
    const before: MatchDay = {
      state: CANARY_START,
      logs: { replayLog: [], spyLog: [] },
    };
    const after = playCanaryNight();
    const days = [
      { when: 'before', day: before },
      { when: 'after', day: after },
    ];

    it('really did happen out of P1’s sight', () => {
      expect(after.logs.replayLog.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'OrderRejected',
          'AbilityUsed',
          'ReinforcementsJoined',
          'Bombardment',
          'BattleResolved',
        ]),
      );
      expect(revealsNonLineUnits(viewOf(after, P2)).length).toBeGreaterThan(0);
    });

    it.each(days)(
      'shows P1, who only ever had line infantry, no other unit type ($when)',
      ({ day }) => {
        expect(revealsNonLineUnits(viewOf(day, P1))).toEqual([]);
      },
    );

    it.each(
      days.flatMap(({ when, day }) =>
        [P1, P2, P3, P4].map((viewerId) => ({ when, day, viewerId })),
      ),
    )(
      'never shows $viewerId the match seed or anyone else’s supply ($when)',
      ({ day, viewerId }) => {
        const json = JSON.stringify(viewOf(day, viewerId));
        expect(json).not.toContain(SECRET_SEED);
        otherSupplies(day.state, viewerId).forEach((supply) => {
          expect(json).not.toContain(String(supply));
        });
      },
    );

    it.each([
      { viewerId: P1, sees: false },
      { viewerId: P2, sees: true },
      { viewerId: P3, sees: true },
      { viewerId: P4, sees: false },
    ])(
      'shows the bombardment to $viewerId only if in the battle: $sees',
      ({ viewerId, sees }) => {
        expect(
          lastNightTypes(viewOf(after, viewerId)).includes('Bombardment'),
        ).toBe(sees);
      },
    );

    it.each([P1, P3, P4])('keeps P2’s rejected order from %s', (viewerId) => {
      expect(lastNightTypes(viewOf(after, viewerId))).not.toContain(
        'OrderRejected',
      );
    });
  });

  describe('every day of the spied week', () => {
    const viewers = [
      NAPOLEON_PLAYER,
      WELLINGTON_PLAYER,
      KUTUZOV_PLAYER,
      MURAT_PLAYER,
    ];
    const views = playSpiedWeek().flatMap((day, dayIndex) =>
      viewers.map((viewerId) => ({
        dayIndex,
        viewerId,
        view: viewOf(day, viewerId),
      })),
    );

    it.each(views)('$viewerId on day $dayIndex', ({ viewerId, view }) => {
      expect(JSON.stringify(view)).not.toContain(WEEK_SEED);
      view.players.forEach((player) => {
        expect(Object.keys(player).toSorted()).toEqual(PUBLIC_PLAYER_FIELDS);
      });
      view.zones
        .filter((zone) => zone.ownerId !== viewerId)
        .forEach((zone) => {
          expect(zone.army.kind).not.toBe('composition');
        });
      view.spyReports.forEach((report) => {
        expect(report).toMatchObject({
          playerId: viewerId,
          turnNumber: view.turnNumber,
        });
      });
    });
  });
});

/** The canary supplies: large, distinctive numbers that cannot appear by chance. */
function otherSupplies(
  state: MatchState,
  viewerId: PlayerId,
): readonly number[] {
  return [P2, P3, P4]
    .filter((playerId) => playerId !== viewerId)
    .map((playerId) => findPlayer(state, playerId).supply);
}
