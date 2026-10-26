import type {
  EffectiveParameters,
  MatchConfig,
  MatchState,
  PlayerId,
  PlayerState,
  UnitType,
  ZoneId,
} from '@lunch-campaign/engine';
import {
  effectiveParameters,
  findPlayer,
  findZone,
  isMatchFinished,
  isZoneOnMap,
  mapUnitTypes,
  NO_UNITS,
  totalUnitCount,
  unitsOfPlayerInZone,
  updatePlayer,
} from '@lunch-campaign/engine';
import type { SpyReport } from './spy-report';

export type SpyRejectionReason =
  | 'matchFinished'
  | 'playerEliminated'
  | 'unknownZone'
  | 'ownZone'
  | 'spiesUnavailable'
  | 'insufficientSupply';

export type SpyOutcome =
  | {
      readonly kind: 'reported';
      readonly state: MatchState;
      readonly report: SpyReport;
    }
  | { readonly kind: 'rejected'; readonly reason: SpyRejectionReason };

interface SpyingPlayer {
  readonly state: MatchState;
  readonly config: MatchConfig;
  readonly spy: PlayerState;
}

interface SpyRequest extends SpyingPlayer {
  readonly zoneId: ZoneId;
}

interface SpyRule<TRequest> {
  readonly reason: SpyRejectionReason;
  readonly isSatisfied: (request: TRequest) => boolean;
}

/** Whether the player may spy at all today, whatever the zone. */
const SPYING_RULES: readonly SpyRule<SpyingPlayer>[] = [
  {
    reason: 'matchFinished',
    isSatisfied: ({ state, config }): boolean =>
      !isMatchFinished(state, config),
  },
  {
    reason: 'playerEliminated',
    isSatisfied: ({ spy }): boolean => !spy.eliminated,
  },
  {
    reason: 'spiesUnavailable',
    isSatisfied: (request): boolean => spyParameters(request).spiesAvailable,
  },
];

/** Checked in order; the first broken rule is the reason. */
const SPY_RULES: readonly SpyRule<SpyRequest>[] = [
  ...SPYING_RULES,
  {
    reason: 'unknownZone',
    isSatisfied: ({ config, zoneId }): boolean =>
      isZoneOnMap(config.map, zoneId),
  },
  {
    reason: 'ownZone',
    isSatisfied: ({ state, spy, zoneId }): boolean =>
      findZone(state, zoneId).ownerId !== spy.playerId,
  },
  {
    reason: 'insufficientSupply',
    isSatisfied: (request): boolean =>
      request.spy.supply >= spyParameters(request).spyCost,
  },
];

/** Whether spies are open to the player today: the match is running, they are in it, and no Fog. */
export function canSpyToday(
  state: MatchState,
  config: MatchConfig,
  playerId: PlayerId,
): boolean {
  const spying: SpyingPlayer = {
    state,
    config,
    spy: findPlayer(state, playerId),
  };
  return SPYING_RULES.every((rule): boolean => rule.isSatisfied(spying));
}

/**
 * Sends a spy: an instant daytime action, not an order. It costs supply, charged immediately, and reports the
 * zone's exact composition, true for the whole day. Types the zone's owner hides from spies (Moore's
 * skirmishers) are counted as unidentified. Store the report in the spy log: the view and Spymaster read it.
 */
export function spyOnZone(
  state: MatchState,
  config: MatchConfig,
  playerId: PlayerId,
  zoneId: ZoneId,
): SpyOutcome {
  const request: SpyRequest = {
    state,
    config,
    spy: findPlayer(state, playerId),
    zoneId,
  };
  const brokenRule = SPY_RULES.find(
    (rule): boolean => !rule.isSatisfied(request),
  );
  return brokenRule === undefined
    ? report(request)
    : { kind: 'rejected', reason: brokenRule.reason };
}

function spyParameters(request: SpyingPlayer): EffectiveParameters {
  return effectiveParameters(
    request.state,
    request.config,
    request.spy.playerId,
    null,
  );
}

function report(request: SpyRequest): SpyOutcome {
  const zone = findZone(request.state, request.zoneId);
  const units =
    zone.ownerId === null ? NO_UNITS : unitsOfPlayerInZone(zone, zone.ownerId);
  const hiddenTypes = hiddenTypesOf(request, zone.ownerId);
  const identified = mapUnitTypes((unitType): number =>
    hiddenTypes.includes(unitType) ? 0 : units[unitType],
  );
  return {
    kind: 'reported',
    state: updatePlayer(
      request.state,
      request.spy.playerId,
      (player): PlayerState => ({
        ...player,
        supply: player.supply - spyParameters(request).spyCost,
      }),
    ),
    report: {
      playerId: request.spy.playerId,
      turnNumber: request.state.turnNumber,
      zoneId: request.zoneId,
      ownerId: zone.ownerId,
      units: identified,
      unidentified: totalUnitCount(units) - totalUnitCount(identified),
    },
  };
}

function hiddenTypesOf(
  request: SpyRequest,
  ownerId: PlayerId | null,
): readonly UnitType[] {
  return ownerId === null
    ? []
    : effectiveParameters(
        request.state,
        request.config,
        ownerId,
        request.zoneId,
      ).spyHiddenUnitTypes;
}
