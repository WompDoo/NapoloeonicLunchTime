import { isCityZone } from '../../map/map-queries';
import type { ActiveModifier } from '../../modifiers/active-modifiers';
import {
  createEventModifier,
  isModifierExpiredAfter,
} from '../../modifiers/active-modifiers';
import { drawEventsForTurn } from '../../modifiers/match-events';
import type {
  EventAnnouncedEvent,
  ModifierExpiredEvent,
  PlayerStanding,
} from '../../replay/replay-events';
import { totalUnitCount } from '../../core/unit-counts';
import { activePlayers } from '../../state/active-players';
import type {
  MatchState,
  PlayerState,
  ZoneState,
} from '../../state/match-state';
import {
  unitsOfPlayerInZone,
  updatePlayer,
} from '../../state/match-state-queries';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

/**
 * Eliminates players left with no city and no units, expires modifiers whose last night this was, announces
 * the next night's event, records the night's standings and advances to the next turn.
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
  const match = afterEliminations.match;
  const nextTurnNumber = context.turnNumber + 1;
  const expired = match.modifiers.filter((modifier): boolean =>
    isModifierExpiredAfter(modifier, context.turnNumber),
  );
  const announcedEvents = drawEventsForTurn(
    context.config,
    match.matchSeed,
    nextTurnNumber,
  );
  return appendEvents(
    afterEliminations,
    {
      ...match,
      turnNumber: nextTurnNumber,
      modifiers: [
        ...match.modifiers.filter(
          (modifier): boolean => !expired.includes(modifier),
        ),
        ...announcedEvents.map(
          (event): ActiveModifier =>
            createEventModifier(event.id, nextTurnNumber),
        ),
      ],
    },
    [
      ...expired.map(
        (modifier): ModifierExpiredEvent => ({
          type: 'ModifierExpired',
          turnNumber: context.turnNumber,
          modifierId: modifier.id,
        }),
      ),
      ...announcedEvents.map(
        (event): EventAnnouncedEvent => ({
          type: 'EventAnnounced',
          turnNumber: context.turnNumber,
          eventId: event.id,
          activeTurnNumber: nextTurnNumber,
        }),
      ),
      {
        type: 'StandingsRecorded',
        turnNumber: context.turnNumber,
        standings: match.players.map(
          (player): PlayerStanding => standingOf(match, player, context),
        ),
      },
    ],
  );
}

function standingOf(
  state: MatchState,
  player: PlayerState,
  context: TurnContext,
): PlayerStanding {
  const ownedZones = state.zones.filter(
    (zone): boolean => zone.ownerId === player.playerId,
  );
  return {
    playerId: player.playerId,
    units: state.zones.reduce(
      (total, zone): number =>
        total + totalUnitCount(unitsOfPlayerInZone(zone, player.playerId)),
      0,
    ),
    zonesOwned: ownedZones.length,
    citiesHeld: ownedZones.filter((zone): boolean =>
      isCityZone(context.config.map, zone.zoneId),
    ).length,
    score: player.score,
    eliminated: player.eliminated,
  };
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
