import type { MatchConfig } from '../config/match-config';
import { TEST_CONFIG } from '../../testing/test-config';
import { compareByCodeUnitOrder } from '../core/ids';
import { drawEventsForTurn } from './match-events';

const EVENT_ON_TURN_2: MatchConfig = {
  ...TEST_CONFIG,
  schedule: TEST_CONFIG.schedule.map((entry, index) => ({
    ...entry,
    eventActive: index === 1,
  })),
};

describe('drawEventsForTurn', () => {
  it('draws nothing on turns without an event, or past the schedule', () => {
    expect(drawEventsForTurn(EVENT_ON_TURN_2, 'seed', 1)).toEqual([]);
    expect(drawEventsForTurn(EVENT_ON_TURN_2, 'seed', 9)).toEqual([]);
  });

  it('draws one event from the pool, the same one every time for the same seed', () => {
    const draws = drawEventsForTurn(EVENT_ON_TURN_2, 'seed', 2);
    expect(draws).toHaveLength(1);
    expect(drawEventsForTurn(EVENT_ON_TURN_2, 'seed', 2)).toEqual(draws);
  });

  it('does not depend on the order of the pool', () => {
    const reversed: MatchConfig = {
      ...EVENT_ON_TURN_2,
      events: [...EVENT_ON_TURN_2.events].reverse(),
    };
    expect(drawEventsForTurn(reversed, 'seed', 2)).toEqual(
      drawEventsForTurn(EVENT_ON_TURN_2, 'seed', 2),
    );
  });

  it('can draw every event in the pool across seeds', () => {
    const drawn = new Set(
      Array.from(
        { length: 60 },
        (_, index) =>
          drawEventsForTurn(EVENT_ON_TURN_2, `seed-${index}`, 2)[0]?.id,
      ),
    );
    expect([...drawn].map(String).sort(compareByCodeUnitOrder)).toEqual([
      'levy',
      'plague',
      'truce',
    ]);
  });

  it('draws nothing from an empty pool', () => {
    expect(
      drawEventsForTurn({ ...EVENT_ON_TURN_2, events: [] }, 'seed', 2),
    ).toEqual([]);
  });
});
