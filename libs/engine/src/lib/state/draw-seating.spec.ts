import { toPlayerId } from '../core/ids';
import type { MatchEntrant } from './draw-seating';
import { drawSeating } from './draw-seating';

const ENTRANTS: readonly MatchEntrant[] = ['ada', 'bo', 'cy', 'di'].map(
  (name) => ({ playerId: toPlayerId(name), commanderId: `${name}-pick` }),
);

describe('drawSeating', () => {
  it('seats everyone once, in seats 1 to n, keeping their picks', () => {
    const seating = drawSeating(ENTRANTS, 'seed');
    expect(seating.map((seat) => seat.seat)).toEqual([1, 2, 3, 4]);
    expect(seating.map((seat) => seat.playerId).toSorted()).toEqual([
      'ada',
      'bo',
      'cy',
      'di',
    ]);
    seating.forEach((seat) => {
      expect(seat.commanderId).toBe(`${seat.playerId}-pick`);
    });
  });

  it('does not depend on the order players joined in', () => {
    expect(drawSeating([...ENTRANTS].reverse(), 'seed')).toEqual(
      drawSeating(ENTRANTS, 'seed'),
    );
  });

  it('gives every player a chance at seat 1 across seeds', () => {
    const firstSeats = new Set(
      Array.from(
        { length: 40 },
        (_, index) => drawSeating(ENTRANTS, `seed-${index}`)[0]?.playerId,
      ),
    );
    expect(firstSeats.size).toBe(ENTRANTS.length);
  });
});
