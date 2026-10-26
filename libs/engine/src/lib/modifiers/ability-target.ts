import type { ZoneId } from '../core/ids';
import type { UnitCounts } from '../core/unit-types';

/** What a commander's one-time ability is aimed at, chosen in the "use ability" order. */
export type AbilityTarget =
  | { readonly kind: 'none' }
  | { readonly kind: 'ownedZone'; readonly zoneId: ZoneId }
  | {
      readonly kind: 'reinforcement';
      readonly fromZoneId: ZoneId;
      readonly toZoneId: ZoneId;
      readonly units: UnitCounts;
    };

export type AbilityTargetKind = AbilityTarget['kind'];

export const NO_ABILITY_TARGET: AbilityTarget = { kind: 'none' };
