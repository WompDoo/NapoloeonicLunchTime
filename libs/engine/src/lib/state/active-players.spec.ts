import { createTestState, P1, P3, P4 } from '../../testing/test-state';
import { activePlayers } from './active-players';

describe('activePlayers', () => {
  it('leaves out eliminated players and keeps seat order', () => {
    const state = createTestState({
      players: [{}, { eliminated: true }, {}, {}],
    });
    expect(activePlayers(state).map((player) => player.playerId)).toEqual([
      P1,
      P3,
      P4,
    ]);
  });
});
