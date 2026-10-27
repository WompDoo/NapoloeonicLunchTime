import type { Hex, HexId } from './hex';
import { hexDistance } from './hex';
import type { HexMap } from './hex-map';

/** Something that claims the hexes around it: a capital, a held town or an army. */
export interface TerritoryClaim {
  readonly ownerId: string;
  readonly hex: Hex;
  /** How far the claim reaches: 0 is its own hex only. */
  readonly reach: number;
}

export interface TerritoryHex {
  readonly hexId: HexId;
  readonly ownerId: string;
}

interface Contender {
  readonly ownerId: string;
  readonly distance: number;
}

/**
 * Who holds each hex: the nearest claim that reaches it. Where claims of different owners are equally near,
 * nobody does. Returns owned hexes only, in the map's hex order.
 */
export function territoryOf(
  map: HexMap,
  claims: readonly TerritoryClaim[],
): readonly TerritoryHex[] {
  return map.hexes.flatMap((mapHex): readonly TerritoryHex[] =>
    holderOf(contendersFor(mapHex.hex, claims)).map(
      (ownerId): TerritoryHex => ({ hexId: mapHex.id, ownerId }),
    ),
  );
}

function contendersFor(
  hex: Hex,
  claims: readonly TerritoryClaim[],
): readonly Contender[] {
  return claims
    .map((claim): Contender & { readonly reach: number } => ({
      ownerId: claim.ownerId,
      distance: hexDistance(claim.hex, hex),
      reach: claim.reach,
    }))
    .filter((contender): boolean => contender.distance <= contender.reach);
}

/** The single owner among the nearest contenders, or none. */
function holderOf(contenders: readonly Contender[]): readonly string[] {
  const nearest = Math.min(
    ...contenders.map((contender): number => contender.distance),
  );
  const owners = new Set(
    contenders
      .filter((contender): boolean => contender.distance === nearest)
      .map((contender): string => contender.ownerId),
  );
  return owners.size === 1 ? [...owners] : [];
}
