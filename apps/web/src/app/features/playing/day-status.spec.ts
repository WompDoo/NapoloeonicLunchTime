import { weekMatch, windowOf } from '../../../testing/match-fixtures';
import { currentWindowOf, dayPhaseOf, dayStatusOf } from './day-status';

const format = (isoInstant: string): string => `at ${isoInstant}`;

describe('day status', () => {
  it('takes orders until the deadline', () => {
    const match = weekMatch(1);
    expect(dayPhaseOf(match)).toBe('open');
    expect(dayStatusOf(match, format)).toEqual({
      key: 'day.deadline',
      params: { time: `at ${windowOf(2).deadlineAt}` },
    });
  });

  it('waits for the night after the deadline', () => {
    const match = { ...weekMatch(1), openDay: null };
    expect(dayPhaseOf(match)).toBe('closed');
    expect(dayStatusOf(match, format)).toEqual({
      key: 'day.closed',
      params: { time: `at ${windowOf(2).resolvesAt}` },
    });
  });

  it('is over after Friday', () => {
    expect(dayStatusOf(weekMatch(5), format)).toEqual({ key: 'day.finished' });
  });

  it('refuses a calendar without the current day', () => {
    expect(() => currentWindowOf({ ...weekMatch(1), calendar: [] })).toThrow(
      'turn 2',
    );
  });
});
