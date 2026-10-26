import type { PlayerId, ZoneId } from '../core/ids';
import type { UnitCounts } from '../core/unit-types';
import type { ActiveModifier } from '../modifiers/active-modifiers';

export interface PlayerState {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly startingCapitalZoneId: ZoneId;
  readonly supply: number;
  readonly score: number;
  readonly commanderId: string;
  /** Upgrade ids bought, in purchase order. Each upgrade can be bought once per match. */
  readonly upgrades: readonly string[];
  readonly abilityUsed: boolean;
  /** Eliminated players own nothing, and their orders are ignored. Their points still count. */
  readonly eliminated: boolean;
}

export interface Army {
  readonly playerId: PlayerId;
  readonly units: UnitCounts;
}

/**
 * Between turns a zone holds at most one army, and that army belongs to the zone's owner.
 * During resolution (after movement, before combat) a zone can hold armies of several players;
 * they are kept sorted by seat.
 */
export interface ZoneState {
  readonly zoneId: ZoneId;
  /** `null` while the zone is neutral. Ownership persists while the zone is empty. */
  readonly ownerId: PlayerId | null;
  readonly armies: readonly Army[];
}

export interface MatchState {
  readonly matchSeed: string;
  /** The turn currently collecting orders (1-based). `resolveTurn` resolves it and advances to the next. */
  readonly turnNumber: number;
  /** Sorted by seat. */
  readonly players: readonly PlayerState[];
  /** Sorted by zone id. */
  readonly zones: readonly ZoneState[];
  /** Upgrades, commander passives and abilities, and events in play, including ones announced for later. */
  readonly modifiers: readonly ActiveModifier[];
}
