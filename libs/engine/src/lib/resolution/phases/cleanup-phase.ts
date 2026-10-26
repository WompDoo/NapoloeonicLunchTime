import { isCityZone } from '../../map/map-queries';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import {
  createEventModifier,
  isModifierExpiredAfter,
} from '../../modifiers/active-modifiers';
import { drawEventsForTurn } from '../../modifiers/match-events';
import type { EventAnnouncedEvent } from '../../replay/replay-events';
import { activePlayers } from '../../state/active-players';
import type {
  MatchState,
  PlayerState,
  ZoneState,
} from '../../state/match-state';
import { updatePlayer } from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

/**
 * Eliminates players left with no city and no units, expires modifiers whose last night this was, announces
 * the next night's event, and advances to the next turn.
 */
export function applyCleanupPhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const afterEliminations = activePlayers(resolution.match)
    .filter((player): boolean => isDefeated(resolution.match, player, context))
    .reduce(
      (current, player): ResolutionState => eliminate(current, player, context),
      resolution,
    );
  const nextTurnNumber = context.turnNumber + 1;
  const announcedEvents = drawEventsForTurn(
    context.config,
    resolution.match.matchSeed,
    nextTurnNumber,
  );
  return appendEvents(
    afterEliminations,
    {
      ...afterEliminations.match,
      turnNumber: nextTurnNumber,
      modifiers: [
        ...afterEliminations.match.modifiers.filter(
          (modifier): boolean =>
            !isModifierExpiredAfter(modifier, context.turnNumber),
        ),
        ...announcedEvents.map(
          (event): ActiveModifier =>
            createEventModifier(event.id, nextTurnNumber),
        ),
      ],
    },
    announcedEvents.map(
      (event): EventAnnouncedEvent => ({
        type: 'EventAnnounced',
        turnNumber: context.turnNumber,
        eventId: event.id,
        activeTurnNumber: nextTurnNumber,
      }),
    ),
  );
}

/** A player who owns no city (capitals count) and has no units anywhere is out of the game. */
function isDefeated(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): boolean {
  return !ownsAnyCity(state, player, context) && !hasAnyArmy(state, player);
}

function ownsAnyCity(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): boolean {
  return state.zones.some(
    (zone): boolean =>
      zone.ownerId === player.playerId &&
      isCityZone(context.config.map, zone.zoneId),
  );
}

function hasAnyArmy(state: MatchState, player: PlayerState): boolean {
  return state.zones.some((zone): boolean =>
    zone.armies.some((army): boolean => army.playerId === player.playerId),
  );
}

/** An eliminated player's zones turn neutral. */
function eliminate(
  resolution: ResolutionState,
  player: PlayerState,
  context: TurnContext,
): ResolutionState {
  const marked = updatePlayer(
    resolution.match,
    player.playerId,
    (current): PlayerState => ({
      ...current,
      eliminated: true,
    }),
  );
  return appendEvents(
    resolution,
    {
      ...marked,
      zones: marked.zones.map(
        (zone): ZoneState =>
          zone.ownerId === player.playerId ? { ...zone, ownerId: null } : zone,
      ),
    },
    [
      {
        type: 'PlayerEliminated',
        turnNumber: context.turnNumber,
        playerId: player.playerId,
      },
    ],
  );
}
