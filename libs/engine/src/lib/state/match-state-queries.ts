import { requirePresent } from '../core/engine-error';
import type { PlayerId, ZoneId } from '../core/ids';
import { addUnitCounts, hasAnyUnits, NO_UNITS } from '../core/unit-counts';
import type { UnitCounts } from '../core/unit-types';
import type { Army, MatchState, PlayerState, ZoneState } from './match-state';

export function findPlayer(state: MatchState, playerId: PlayerId): PlayerState {
  return requirePresent(
    state.players.find((player): boolean => player.playerId === playerId),
    `player ${playerId}`,
  );
}

export function findZone(state: MatchState, zoneId: ZoneId): ZoneState {
  return requirePresent(
    state.zones.find((zone): boolean => zone.zoneId === zoneId),
    `zone ${zoneId}`,
  );
}

export function seatOfPlayer(state: MatchState, playerId: PlayerId): number {
  return findPlayer(state, playerId).seat;
}

export function unitsOfPlayerInZone(
  zone: ZoneState,
  playerId: PlayerId,
): UnitCounts {
  const army = zone.armies.find(
    (candidate): boolean => candidate.playerId === playerId,
  );
  return army === undefined ? NO_UNITS : army.units;
}

export function updatePlayer(
  state: MatchState,
  playerId: PlayerId,
  update: (player: PlayerState) => PlayerState,
): MatchState {
  return {
    ...state,
    players: state.players.map(
      (player): PlayerState =>
        player.playerId === playerId ? update(player) : player,
    ),
  };
}

export function updateZone(
  state: MatchState,
  zoneId: ZoneId,
  update: (zone: ZoneState) => ZoneState,
): MatchState {
  return {
    ...state,
    zones: state.zones.map(
      (zone): ZoneState => (zone.zoneId === zoneId ? update(zone) : zone),
    ),
  };
}

/** Adds units to a player's army in the zone, creating the army if needed. Armies stay sorted by seat. */
export function addUnitsToZone(
  state: MatchState,
  zoneId: ZoneId,
  playerId: PlayerId,
  units: UnitCounts,
): MatchState {
  const currentUnits = unitsOfPlayerInZone(findZone(state, zoneId), playerId);
  return setPlayerUnitsInZone(
    state,
    zoneId,
    playerId,
    addUnitCounts(currentUnits, units),
  );
}

/** Replaces a player's army in the zone; an army left with no units is removed. */
export function setPlayerUnitsInZone(
  state: MatchState,
  zoneId: ZoneId,
  playerId: PlayerId,
  units: UnitCounts,
): MatchState {
  return updateZone(
    state,
    zoneId,
    (zone): ZoneState => ({
      ...zone,
      armies: sortArmiesBySeat(
        state,
        [
          ...zone.armies.filter((army): boolean => army.playerId !== playerId),
          { playerId, units },
        ].filter((army): boolean => hasAnyUnits(army.units)),
      ),
    }),
  );
}

function sortArmiesBySeat(
  state: MatchState,
  armies: readonly Army[],
): readonly Army[] {
  return [...armies].sort(
    (left, right): number =>
      seatOfPlayer(state, left.playerId) - seatOfPlayer(state, right.playerId),
  );
}
