import type { PlayerId, ZoneId } from '../core/ids';
import { compareByCodeUnitOrder } from '../core/ids';
import type { MatchConfig } from '../config/match-config';
import {
  findCommander,
  findEvent,
  findUpgrade,
} from '../config/content-queries';
import { compareInOrder } from '../core/ordering';
import type { MatchState } from '../state/match-state';
import { seatOfPlayer } from '../state/match-state-queries';
import type { AbilityTarget } from './ability-target';
import { NO_ABILITY_TARGET } from './ability-target';
import type { AbilityDefinition, ModifierEffect } from './modifier-definitions';

export type ModifierSource =
  | { readonly kind: 'upgrade'; readonly upgradeId: string }
  | { readonly kind: 'commanderPassive'; readonly commanderId: string }
  | { readonly kind: 'commanderAbility'; readonly commanderId: string }
  | { readonly kind: 'event'; readonly eventId: string };

export type ModifierScope =
  | { readonly kind: 'player'; readonly playerId: PlayerId }
  | { readonly kind: 'global' };

export type ModifierDuration =
  | { readonly kind: 'permanent' }
  /** Active from `fromTurn` to `untilTurn`, both inclusive; removed in the cleanup of `untilTurn`. */
  | {
      readonly kind: 'nights';
      readonly fromTurn: number;
      readonly untilTurn: number;
    };

/**
 * A modifier in play. It is plain data (serialisable with the match state); its effect is looked up in
 * the config's content pools by `source`.
 */
export interface ActiveModifier {
  readonly id: string;
  /** The player who bought or used it; `null` for events. Orders steps and attributes log events. */
  readonly ownerId: PlayerId | null;
  readonly source: ModifierSource;
  readonly scope: ModifierScope;
  readonly duration: ModifierDuration;
  readonly target: AbilityTarget;
}

const PERMANENT: ModifierDuration = { kind: 'permanent' };
const GLOBAL: ModifierScope = { kind: 'global' };
const GLOBAL_SEAT = 0;

type EffectLookups = {
  readonly [TKind in ModifierSource['kind']]: (
    config: MatchConfig,
    source: Extract<ModifierSource, { readonly kind: TKind }>,
  ) => ModifierEffect;
};

const EFFECT_LOOKUPS: EffectLookups = {
  upgrade: (config, source): ModifierEffect =>
    findUpgrade(config, source.upgradeId).effect,
  commanderPassive: (config, source): ModifierEffect =>
    findCommander(config, source.commanderId).passive,
  commanderAbility: (config, source): ModifierEffect =>
    findCommander(config, source.commanderId).ability.effect,
  event: (config, source): ModifierEffect =>
    findEvent(config, source.eventId).effect,
};

type ActivityChecks = {
  readonly [TKind in ModifierDuration['kind']]: (
    duration: Extract<ModifierDuration, { readonly kind: TKind }>,
    turnNumber: number,
  ) => boolean;
};

const ACTIVITY_CHECKS: ActivityChecks = {
  permanent: (): boolean => true,
  nights: (duration, turnNumber): boolean =>
    duration.fromTurn <= turnNumber && turnNumber <= duration.untilTurn,
};

const EXPIRY_CHECKS: ActivityChecks = {
  permanent: (): boolean => false,
  nights: (duration, turnNumber): boolean => duration.untilTurn <= turnNumber,
};

type TargetZoneLookups = {
  readonly [TKind in AbilityTarget['kind']]: (
    target: Extract<AbilityTarget, { readonly kind: TKind }>,
  ) => ZoneId | null;
};

const TARGET_ZONE_LOOKUPS: TargetZoneLookups = {
  none: (): ZoneId | null => null,
  ownedZone: (target): ZoneId | null => target.zoneId,
  reinforcement: (): ZoneId | null => null,
};

export function findModifierEffect(
  config: MatchConfig,
  source: ModifierSource,
): ModifierEffect {
  const lookup = EFFECT_LOOKUPS[source.kind] as (
    config: MatchConfig,
    source: ModifierSource,
  ) => ModifierEffect;
  return lookup(config, source);
}

export function isModifierActive(
  modifier: ActiveModifier,
  turnNumber: number,
): boolean {
  const check = ACTIVITY_CHECKS[modifier.duration.kind] as (
    duration: ModifierDuration,
    turnNumber: number,
  ) => boolean;
  return check(modifier.duration, turnNumber);
}

/** True once the modifier's last night has been resolved. */
export function isModifierExpiredAfter(
  modifier: ActiveModifier,
  turnNumber: number,
): boolean {
  const check = EXPIRY_CHECKS[modifier.duration.kind] as (
    duration: ModifierDuration,
    turnNumber: number,
  ) => boolean;
  return check(modifier.duration, turnNumber);
}

export function appliesToPlayer(
  modifier: ActiveModifier,
  playerId: PlayerId,
): boolean {
  return (
    modifier.scope.kind === 'global' || modifier.scope.playerId === playerId
  );
}

export function targetZoneOf(modifier: ActiveModifier): ZoneId | null {
  const lookup = TARGET_ZONE_LOOKUPS[modifier.target.kind] as (
    target: AbilityTarget,
  ) => ZoneId | null;
  return lookup(modifier.target);
}

/** The seat a modifier belongs to, for ordering; events come first. */
export function seatOfModifier(
  state: MatchState,
  modifier: ActiveModifier,
): number {
  return modifier.ownerId === null
    ? GLOBAL_SEAT
    : seatOfPlayer(state, modifier.ownerId);
}

/** Active modifiers in application order: effect priority, then seat, then id. */
export function activeModifiersInOrder(
  state: MatchState,
  config: MatchConfig,
): readonly ActiveModifier[] {
  return state.modifiers
    .filter((modifier): boolean => isModifierActive(modifier, state.turnNumber))
    .toSorted(
      compareInOrder<ActiveModifier>([
        (left, right): number =>
          findModifierEffect(config, left.source).priority -
          findModifierEffect(config, right.source).priority,
        (left, right): number =>
          seatOfModifier(state, left) - seatOfModifier(state, right),
        (left, right): number => compareByCodeUnitOrder(left.id, right.id),
      ]),
    );
}

export function createUpgradeModifier(
  playerId: PlayerId,
  upgradeId: string,
): ActiveModifier {
  return {
    id: `upgrade:${upgradeId}:${playerId}`,
    ownerId: playerId,
    source: { kind: 'upgrade', upgradeId },
    scope: { kind: 'player', playerId },
    duration: PERMANENT,
    target: NO_ABILITY_TARGET,
  };
}

export function createCommanderPassiveModifier(
  playerId: PlayerId,
  commanderId: string,
): ActiveModifier {
  return {
    id: `passive:${commanderId}:${playerId}`,
    ownerId: playerId,
    source: { kind: 'commanderPassive', commanderId },
    scope: { kind: 'player', playerId },
    duration: PERMANENT,
    target: NO_ABILITY_TARGET,
  };
}

export function createAbilityModifier(
  playerId: PlayerId,
  commanderId: string,
  ability: AbilityDefinition,
  target: AbilityTarget,
  turnNumber: number,
): ActiveModifier {
  return {
    id: `ability:${commanderId}:${playerId}:${turnNumber}`,
    ownerId: playerId,
    source: { kind: 'commanderAbility', commanderId },
    scope: ABILITY_SCOPES[ability.scope](playerId),
    duration: {
      kind: 'nights',
      fromTurn: turnNumber,
      untilTurn: turnNumber + ability.durationInNights - 1,
    },
    target,
  };
}

export function createEventModifier(
  eventId: string,
  turnNumber: number,
): ActiveModifier {
  return {
    id: `event:${eventId}:${turnNumber}`,
    ownerId: null,
    source: { kind: 'event', eventId },
    scope: GLOBAL,
    duration: { kind: 'nights', fromTurn: turnNumber, untilTurn: turnNumber },
    target: NO_ABILITY_TARGET,
  };
}

const ABILITY_SCOPES: Readonly<
  Record<AbilityDefinition['scope'], (playerId: PlayerId) => ModifierScope>
> = {
  owner: (playerId): ModifierScope => ({ kind: 'player', playerId }),
  everyone: (): ModifierScope => GLOBAL,
};
