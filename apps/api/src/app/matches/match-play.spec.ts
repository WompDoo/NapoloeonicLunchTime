import type { Order, PlayerId } from '@lunch-campaign/engine';
import { findPlayer, requirePresent, toZoneId } from '@lunch-campaign/engine';
import {
  lobbyOf,
  MONDAY_MORNING,
  playerAt,
  playOf,
  SETTINGS,
  startedMatch,
} from '../../testing/match-fixtures';
import type { DomainError } from '../errors/domain-error';
import {
  nextResolutionAt,
  openDayOf,
  ordersOf,
  resolveDueNights,
  sendSpy,
  submitOrders,
} from './match-play';
import type { StoredMatch } from './stored-match';

const CONFIG = SETTINGS.config;
const MONDAY_LATE = new Date('2026-11-02T21:30:00Z');
const TUESDAY_RESOLUTION = new Date('2026-11-03T00:00:00Z');
const SATURDAY = new Date('2026-11-07T08:00:00Z');
const RECRUIT_LINE: Order = { kind: 'recruit', unitType: 'line', count: 1 };

const MATCH = startedMatch(['murat', 'moore'], MONDAY_MORNING, 'seed');

function capitalOf(match: StoredMatch, playerId: PlayerId): string {
  return findPlayer(playOf(match).state, playerId).startingCapitalZoneId;
}

function refusal(action: () => unknown): DomainError {
  try {
    action();
  } catch (error) {
    return error as DomainError;
  }
  throw new Error('Expected a domain error');
}

describe('match play', () => {
  describe('orders', () => {
    it('keeps the last submission of each player', () => {
      const first = submitOrders(MATCH, playerAt(0), [RECRUIT_LINE], MONDAY_MORNING, SETTINGS);
      const second = submitOrders(first, playerAt(0), [], MONDAY_MORNING, SETTINGS);
      const both = submitOrders(second, playerAt(1), [RECRUIT_LINE], MONDAY_MORNING, SETTINGS);
      expect(ordersOf(playOf(first), playerAt(0))).toEqual([RECRUIT_LINE]);
      expect(ordersOf(playOf(both), playerAt(0))).toEqual([]);
      expect(ordersOf(playOf(both), playerAt(1))).toEqual([RECRUIT_LINE]);
    });

    it('refuses a submission with an order the rules refuse, naming each one', () => {
      const error = refusal(() =>
        submitOrders(
          MATCH,
          playerAt(0),
          [
            RECRUIT_LINE,
            {
              kind: 'move',
              fromZoneId: toZoneId('Z9'),
              viaZoneIds: [],
              toZoneId: toZoneId('A2'),
              units: { line: 1, cavalry: 0, skirmishers: 0, artillery: 0 },
            },
          ],
          MONDAY_MORNING,
          SETTINGS,
        ),
      );
      expect(error.code).toBe('orders.invalid');
      expect(error.problems).toEqual([{ orderIndex: 1, reason: 'unknownZone' }]);
    });

    it.each([
      {
        name: 'before the match starts',
        match: lobbyOf(2, MONDAY_MORNING),
        now: MONDAY_MORNING,
        code: 'match.notStarted',
      },
      { name: 'after the deadline', match: MATCH, now: MONDAY_LATE, code: 'day.closed' },
      {
        name: 'once the match is over',
        match: resolveDueNights(MATCH, SATURDAY, CONFIG),
        now: SATURDAY,
        code: 'match.finished',
      },
    ])('refuses orders $name', ({ match, now, code }) => {
      expect(refusal(() => submitOrders(match, playerAt(0), [], now, SETTINGS)).code).toBe(code);
    });
  });

  describe('spies', () => {
    it('charges the spy and logs the report', () => {
      const target = toZoneId(capitalOf(MATCH, playerAt(1)));
      const outcome = sendSpy(MATCH, playerAt(0), target, MONDAY_MORNING, SETTINGS);
      expect(outcome.report).toMatchObject({ playerId: playerAt(0), zoneId: target });
      expect(playOf(outcome.match).spyLog).toEqual([outcome.report]);
      expect(findPlayer(playOf(outcome.match).state, playerAt(0)).supply).toBe(
        findPlayer(playOf(MATCH).state, playerAt(0)).supply -
          CONFIG.intelligence.spyCost,
      );
    });

    it.each([
      {
        name: 'on your own zone',
        now: MONDAY_MORNING,
        zone: (): string => capitalOf(MATCH, playerAt(0)),
        code: 'spy.ownZone',
      },
      {
        name: 'after the deadline',
        now: MONDAY_LATE,
        zone: (): string => capitalOf(MATCH, playerAt(1)),
        code: 'day.closed',
      },
    ])('refuses a spy $name', ({ now, zone, code }) => {
      expect(
        refusal(() => sendSpy(MATCH, playerAt(0), toZoneId(zone()), now, SETTINGS)).code,
      ).toBe(code);
    });
  });

  describe('nights', () => {
    it('resolves nothing before the resolution time', () => {
      expect(resolveDueNights(MATCH, MONDAY_LATE, CONFIG)).toBe(MATCH);
    });

    it('resolves the night with every submission, then clears them', () => {
      const submitted = submitOrders(MATCH, playerAt(0), [RECRUIT_LINE], MONDAY_MORNING, SETTINGS);
      const play = playOf(resolveDueNights(submitted, TUESDAY_RESOLUTION, CONFIG));
      expect(play.state.turnNumber).toBe(2);
      expect(play.orders).toEqual([]);
      expect(play.replayLog).toContainEqual(
        expect.objectContaining({ type: 'UnitsRecruited', playerId: playerAt(0) }),
      );
    });

    it('catches up on every night it missed, and stops after Friday', () => {
      const play = playOf(resolveDueNights(MATCH, SATURDAY, CONFIG));
      expect(play.state.turnNumber).toBe(CONFIG.schedule.length + 1);
      expect(
        play.replayLog.filter((event) => event.type === 'StandingsRecorded'),
      ).toHaveLength(CONFIG.schedule.length);
    });

    it('leaves a lobby alone', () => {
      const lobby = lobbyOf(2, MONDAY_MORNING);
      expect(resolveDueNights(lobby, SATURDAY, CONFIG)).toBe(lobby);
    });

    it('tells the store when to look next', () => {
      expect(nextResolutionAt(lobbyOf(2, MONDAY_MORNING), CONFIG)).toBeNull();
      expect(nextResolutionAt(MATCH, CONFIG)).toBe('2026-11-03T00:00:00.000Z');
      expect(nextResolutionAt(resolveDueNights(MATCH, SATURDAY, CONFIG), CONFIG)).toBeNull();
    });
  });

  describe('the open day', () => {
    it.each([
      { name: 'during the day', match: MATCH, now: MONDAY_MORNING, open: true },
      { name: 'after the deadline', match: MATCH, now: MONDAY_LATE, open: false },
      {
        name: 'after Friday',
        match: resolveDueNights(MATCH, SATURDAY, CONFIG),
        now: SATURDAY,
        open: false,
      },
    ])('is open $name: $open', ({ match, now, open }) => {
      expect(openDayOf(playOf(match), now, CONFIG) !== null).toBe(open);
    });

    it('is the current day of the calendar', () => {
      expect(openDayOf(playOf(MATCH), MONDAY_MORNING, CONFIG)).toEqual(
        requirePresent(playOf(MATCH).calendar[0], 'Monday'),
      );
    });
  });
});
