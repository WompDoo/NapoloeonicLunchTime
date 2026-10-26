import { findDuplicates } from '../core/decode';
import { EngineContractError } from '../core/engine-error';
import type { PlayerId, ZoneId } from '../core/ids';
import type { MatchConfig } from '../config/match-config';
import { findStartingCapital } from '../map/map-queries';
import type { UnitCounts } from '../core/unit-types';
import type { MatchState, PlayerState, ZoneState } from './match-state';

export const FIRST_TURN_NUMBER = 1;
const STARTING_SCORE = 0;

export interface PlayerSeating {
  readonly playerId: PlayerId;
  readonly seat: number;
}

/** Each seated player owns their starting capital with the starting units; every other zone is neutral and empty. */
export function createInitialMatchState(
  config: MatchConfig,
  seating: readonly PlayerSeating[],
  matchSeed: string,
): MatchState {
  assertUniqueSeating(seating);
  const players = [...seating]
    .sort((left, right): number => left.seat - right.seat)
    .map(
      ({ playerId, seat }): PlayerState => ({
        playerId,
        seat,
        startingCapitalZoneId: findStartingCapital(config.map, seat).zoneId,
        supply: config.economy.startingSupply,
        score: STARTING_SCORE,
      }),
    );
  return {
    matchSeed,
    turnNumber: FIRST_TURN_NUMBER,
    players,
    zones: config.map.zones.map(
      (zone): ZoneState =>
        createInitialZoneState(zone.id, players, config.startingUnits),
    ),
  };
}

function createInitialZoneState(
  zoneId: ZoneId,
  players: readonly PlayerState[],
  startingUnits: UnitCounts,
): ZoneState {
  const startingPlayer = players.find(
    (player): boolean => player.startingCapitalZoneId === zoneId,
  );
  return startingPlayer === undefined
    ? { zoneId, ownerId: null, armies: [] }
    : {
        zoneId,
        ownerId: startingPlayer.playerId,
        armies: [{ playerId: startingPlayer.playerId, units: startingUnits }],
      };
}

function assertUniqueSeating(seating: readonly PlayerSeating[]): void {
  const issues = [
    ...findDuplicates(seating.map((entry): string => entry.playerId)).map(
      (playerId): string => `player ${playerId} is seated more than once`,
    ),
    ...findDuplicates(seating.map((entry): string => String(entry.seat))).map(
      (seat): string => `seat ${seat} is taken more than once`,
    ),
  ];
  if (issues.length > 0) {
    throw new EngineContractError(`Invalid seating: ${issues.join('; ')}`);
  }
}
