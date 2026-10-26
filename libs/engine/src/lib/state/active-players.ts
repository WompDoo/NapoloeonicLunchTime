import type { MatchState, PlayerState } from './match-state';

/** Players still in the game, in seat order. */
export function activePlayers(state: MatchState): readonly PlayerState[] {
  return state.players.filter((player): boolean => !player.eliminated);
}
