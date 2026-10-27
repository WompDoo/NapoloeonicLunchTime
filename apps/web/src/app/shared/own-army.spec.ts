import { createUnitCounts, NO_UNITS } from '@lunch-campaign/engine';
import { spiedWeekView } from '@lunch-campaign/player-view/testing';
import { NAPOLEON_PLAYER } from '../../testing/match-fixtures';
import { clampCount, ownUnitsAt, ownZones, ownZonesWith } from './own-army';

describe('own army', () => {
  const monday = spiedWeekView(0, NAPOLEON_PLAYER);

  it('lists your zones and what is in them', () => {
    expect(ownZones(monday).map((zone) => zone.zoneId)).toEqual(['A1']);
    expect(ownUnitsAt(monday, 'A1')).toEqual(
      createUnitCounts({ line: 3, cavalry: 2, skirmishers: 2, artillery: 1 }),
    );
  });

  it('sees no units of yours in other zones or zones not on the map', () => {
    expect(ownUnitsAt(monday, 'A4')).toEqual(NO_UNITS);
    expect(ownUnitsAt(monday, 'Z9')).toEqual(NO_UNITS);
    expect(ownUnitsAt(monday, null)).toEqual(NO_UNITS);
  });

  it('finds zones with units of a type', () => {
    expect(
      ownZonesWith(monday, ['artillery']).map((zone) => zone.zoneId),
    ).toEqual(['A1']);
  });

  it.each([
    { value: 3, available: 5, count: 3 },
    { value: 9, available: 5, count: 5 },
    { value: -2, available: 5, count: 0 },
    { value: 2.7, available: 5, count: 2 },
    { value: Number.NaN, available: 5, count: 0 },
  ])(
    'keeps $value within 0..$available as $count',
    ({ value, available, count }) => {
      expect(clampCount(value, available)).toBe(count);
    },
  );
});
