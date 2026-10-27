import { DEFAULT_MATCH_CONFIG, DEFAULT_MATCH_TIMING } from '@lunch-campaign/content';
import { isKnownTimeZone, planMatchCalendar } from './match-calendar';

const TALLINN = 'Europe/Tallinn';

function plan(startedAt: string): ReturnType<typeof planMatchCalendar> {
  return planMatchCalendar(
    new Date(startedAt),
    TALLINN,
    DEFAULT_MATCH_TIMING,
    DEFAULT_MATCH_CONFIG.schedule,
  );
}

describe('planMatchCalendar', () => {
  it('runs Monday to Friday when the match starts on a Monday morning', () => {
    expect(plan('2026-11-02T07:00:00Z')).toEqual([
      {
        turnNumber: 1,
        dayLabel: 'Monday',
        date: '2026-11-02',
        deadlineAt: '2026-11-02T21:00:00.000Z',
        resolvesAt: '2026-11-03T00:00:00.000Z',
      },
      {
        turnNumber: 2,
        dayLabel: 'Tuesday',
        date: '2026-11-03',
        deadlineAt: '2026-11-03T21:00:00.000Z',
        resolvesAt: '2026-11-04T00:00:00.000Z',
      },
      {
        turnNumber: 3,
        dayLabel: 'Wednesday',
        date: '2026-11-04',
        deadlineAt: '2026-11-04T21:00:00.000Z',
        resolvesAt: '2026-11-05T00:00:00.000Z',
      },
      {
        turnNumber: 4,
        dayLabel: 'Thursday',
        date: '2026-11-05',
        deadlineAt: '2026-11-05T21:00:00.000Z',
        resolvesAt: '2026-11-06T00:00:00.000Z',
      },
      {
        turnNumber: 5,
        dayLabel: 'Friday',
        date: '2026-11-06',
        deadlineAt: '2026-11-06T21:00:00.000Z',
        resolvesAt: '2026-11-07T00:00:00.000Z',
      },
    ]);
  });

  it.each([
    {
      name: 'starts on a Wednesday and skips the weekend',
      startedAt: '2026-11-04T08:00:00Z',
      dates: ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'],
    },
    {
      name: 'starts the next day when everyone is ready after the deadline',
      startedAt: '2026-11-04T21:30:00Z',
      dates: ['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11'],
    },
    {
      name: 'starts the next day when everyone is ready exactly at the deadline',
      startedAt: '2026-11-02T21:00:00Z',
      dates: ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09'],
    },
    {
      name: 'starts on Monday when everyone is ready at the weekend',
      startedAt: '2026-11-07T10:00:00Z',
      dates: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'],
    },
  ])('$name', ({ startedAt, dates }) => {
    expect(plan(startedAt).map((day) => day.date)).toEqual(dates);
  });

  it('keeps 23:00 and 02:00 local across the change from summer time', () => {
    const days = plan('2026-10-22T09:00:00Z');
    expect(days.map((day) => [day.date, day.deadlineAt, day.resolvesAt])).toEqual([
      ['2026-10-22', '2026-10-22T20:00:00.000Z', '2026-10-22T23:00:00.000Z'],
      ['2026-10-23', '2026-10-23T20:00:00.000Z', '2026-10-23T23:00:00.000Z'],
      ['2026-10-26', '2026-10-26T21:00:00.000Z', '2026-10-27T00:00:00.000Z'],
      ['2026-10-27', '2026-10-27T21:00:00.000Z', '2026-10-28T00:00:00.000Z'],
      ['2026-10-28', '2026-10-28T21:00:00.000Z', '2026-10-29T00:00:00.000Z'],
    ]);
  });

  it('resolves on the same day when the resolution time comes after the deadline', () => {
    const days = planMatchCalendar(
      new Date('2026-11-02T07:00:00Z'),
      'UTC',
      {
        ...DEFAULT_MATCH_TIMING,
        ordersDeadline: { hour: 12, minute: 0 },
        resolutionTime: { hour: 13, minute: 30 },
      },
      DEFAULT_MATCH_CONFIG.schedule,
    );
    expect(days[0]).toMatchObject({
      deadlineAt: '2026-11-02T12:00:00.000Z',
      resolvesAt: '2026-11-02T13:30:00.000Z',
    });
  });

  it('refuses timing without any match weekday', () => {
    expect(() =>
      planMatchCalendar(
        new Date('2026-11-02T07:00:00Z'),
        TALLINN,
        { ...DEFAULT_MATCH_TIMING, matchWeekdays: [] },
        DEFAULT_MATCH_CONFIG.schedule,
      ),
    ).toThrow('Match timing has no match weekdays');
  });
});

describe('isKnownTimeZone', () => {
  it.each([
    { timeZone: 'Europe/Tallinn', known: true },
    { timeZone: 'UTC', known: true },
    { timeZone: 'Mars/Olympus_Mons', known: false },
  ])('knows $timeZone: $known', ({ timeZone, known }) => {
    expect(isKnownTimeZone(timeZone)).toBe(known);
  });
});
