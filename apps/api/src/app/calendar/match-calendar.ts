import type { LocalTime, MatchTiming } from '@lunch-campaign/content';
import type { TurnWindowDto } from '@lunch-campaign/contracts';
import type { TurnScheduleEntry } from '@lunch-campaign/engine';
import { requirePresent } from '@lunch-campaign/engine';
import { DateTime, IANAZone } from 'luxon';
import './luxon-settings';

/** One match day as stored and sent: dates and instants as ISO strings. */
export type TurnWindow = TurnWindowDto;

export function isKnownTimeZone(timeZone: string): boolean {
  return IANAZone.isValidZone(timeZone);
}

/**
 * The match's days in its time zone. Day 1 is the start day when that is a match weekday and its deadline
 * has not passed, otherwise the next match weekday; later days follow on match weekdays only. Each night
 * resolves at the first resolution time after that day's deadline.
 */
export function planMatchCalendar(
  startedAt: Date,
  timeZone: string,
  timing: MatchTiming,
  schedule: readonly TurnScheduleEntry[],
): readonly TurnWindow[] {
  requireMatchWeekdays(timing);
  const started = DateTime.fromJSDate(startedAt, { zone: timeZone });
  const days = schedule
    .slice(1)
    .reduce<readonly DateTime[]>(
      (planned): readonly DateTime[] => [
        ...planned,
        nextMatchDay(lastDay(planned), timing),
      ],
      [firstMatchDay(started, timing)],
    );
  return schedule.map(
    (entry, index): TurnWindow =>
      turnWindow(
        entry,
        index,
        requirePresent(days[index], `match day ${index + 1}`),
        timing,
      ),
  );
}

function requireMatchWeekdays(timing: MatchTiming): void {
  if (timing.matchWeekdays.length === 0) {
    throw new Error('Match timing has no match weekdays');
  }
}

function firstMatchDay(started: DateTime, timing: MatchTiming): DateTime {
  const today = started.startOf('day');
  return isOpenMatchDay(started, timing) ? today : nextMatchDay(today, timing);
}

function isOpenMatchDay(moment: DateTime, timing: MatchTiming): boolean {
  return (
    isMatchWeekday(moment, timing) &&
    moment < atTime(moment, timing.ordersDeadline)
  );
}

function nextMatchDay(day: DateTime, timing: MatchTiming): DateTime {
  const next = day.plus({ days: 1 });
  return isMatchWeekday(next, timing) ? next : nextMatchDay(next, timing);
}

function isMatchWeekday(day: DateTime, timing: MatchTiming): boolean {
  return timing.matchWeekdays.some(
    (weekday): boolean => weekday === day.weekday,
  );
}

function lastDay(days: readonly DateTime[]): DateTime {
  return requirePresent(days[days.length - 1], 'a planned match day');
}

function atTime(day: DateTime, time: LocalTime): DateTime {
  return day.set({
    hour: time.hour,
    minute: time.minute,
    second: 0,
    millisecond: 0,
  });
}

function firstTimeAfter(moment: DateTime, time: LocalTime): DateTime {
  const sameDay = atTime(moment, time);
  return sameDay > moment ? sameDay : atTime(moment.plus({ days: 1 }), time);
}

function turnWindow(
  entry: TurnScheduleEntry,
  index: number,
  day: DateTime,
  timing: MatchTiming,
): TurnWindow {
  const deadline = atTime(day, timing.ordersDeadline);
  return {
    turnNumber: index + 1,
    dayLabel: entry.label,
    date: day.toISODate(),
    deadlineAt: deadline.toUTC().toISO(),
    resolvesAt: firstTimeAfter(deadline, timing.resolutionTime)
      .toUTC()
      .toISO(),
  };
}
