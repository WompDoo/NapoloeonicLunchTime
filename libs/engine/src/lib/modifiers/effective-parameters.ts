import type { PlayerId, ZoneId } from '../core/ids';
import type { MatchConfig } from '../config/match-config';
import type { MatchState } from '../state/match-state';
import type { ActiveModifier } from './active-modifiers';
import {
  activeModifiersInOrder,
  appliesToPlayer,
  findModifierEffect,
  targetZoneOf,
} from './active-modifiers';
import type { ParameterPatch } from './parameter-patches';
import { applyParameterPatch } from './parameter-patches';
import type { EffectiveParameters } from './parameters';
import { baseParameters } from './parameters';

/**
 * The parameters the engine uses for one player tonight: the config's base values with every active
 * modifier that applies to the player patched on top, in modifier order. Pass the zone a battle,
 * bombardment or production happens in so zone-targeted patches (Reverse Slope, Scorched Earth) apply;
 * pass `null` where no zone is involved.
 */
export function effectiveParameters(
  state: MatchState,
  config: MatchConfig,
  playerId: PlayerId,
  zoneId: ZoneId | null,
): EffectiveParameters {
  return activeModifiersInOrder(state, config)
    .filter((modifier): boolean => appliesToPlayer(modifier, playerId))
    .reduce(
      (parameters, modifier): EffectiveParameters =>
        applyModifierPatches(parameters, modifier, config, zoneId),
      baseParameters(config),
    );
}

function applyModifierPatches(
  parameters: EffectiveParameters,
  modifier: ActiveModifier,
  config: MatchConfig,
  zoneId: ZoneId | null,
): EffectiveParameters {
  return findModifierEffect(config, modifier.source)
    .patches.filter((patch): boolean =>
      isPatchApplicable(patch, modifier, zoneId),
    )
    .reduce(
      (current, patch): EffectiveParameters =>
        applyParameterPatch(current, patch, modifier.id),
      parameters,
    );
}

function isPatchApplicable(
  patch: ParameterPatch,
  modifier: ActiveModifier,
  zoneId: ZoneId | null,
): boolean {
  return patch.onlyInTargetZone !== true || isInTargetZone(modifier, zoneId);
}

function isInTargetZone(
  modifier: ActiveModifier,
  zoneId: ZoneId | null,
): boolean {
  const targetZoneId = targetZoneOf(modifier);
  return targetZoneId !== null && targetZoneId === zoneId;
}
