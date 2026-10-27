import { V0_FOUR_PLAYER_MAP } from '../maps/v0-four-player-map';
import { DEFAULT_LOBBY_RULES, DEFAULT_MATCH_TIMING } from './match-timing';

describe('default match timing', () => {
  it('closes orders at 23:00 and resolves at 02:00', () => {
    expect(DEFAULT_MATCH_TIMING.ordersDeadline).toEqual({
      hour: 23,
      minute: 0,
    });
    expect(DEFAULT_MATCH_TIMING.resolutionTime).toEqual({ hour: 2, minute: 0 });
  });

  it('plays on weekdays only, each once, Monday first', () => {
    expect(DEFAULT_MATCH_TIMING.matchWeekdays).toEqual([1, 2, 3, 4, 5]);
  });

  it('allows from the minimum up to one player per starting capital', () => {
    expect(DEFAULT_LOBBY_RULES.minimumPlayers).toBe(2);
    expect(V0_FOUR_PLAYER_MAP.startingCapitals.length).toBeGreaterThanOrEqual(
      DEFAULT_LOBBY_RULES.minimumPlayers,
    );
  });
});
