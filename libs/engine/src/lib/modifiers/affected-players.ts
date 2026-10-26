import { activePlayers } from '../state/active-players';
import type { MatchState, PlayerState } from '../state/match-state';
import type { ActiveModifier } from './active-modifiers';
import { appliesToPlayer } from './active-modifiers';

/** The players still in the game that a modifier applies to: everyone for events, its owner otherwise. */
export function playersAffectedBy(
  state: MatchState,
  modifier: ActiveModifier,
): readonly PlayerState[] {
  return activePlayers(state).filter((player): boolean =>
    appliesToPlayer(modifier, player.playerId),
  );
}
