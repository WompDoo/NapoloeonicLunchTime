import type { PlayerId, ZoneId } from '../../core/ids';
import { compareByCodeUnitOrder } from '../../core/ids';
import { compareInOrder } from '../../core/ordering';
import { totalUnitCount } from '../../core/unit-counts';
import type { UnitCounts } from '../../core/unit-types';
import type { MatchState } from '../../state/match-state';
import { unitsOfPlayerInZone } from '../../state/match-state-queries';

export interface PlacedArmy {
  readonly zoneId: ZoneId;
  readonly units: UnitCounts;
}

/** The player's armies from largest to smallest; equally large armies in zone id order. */
export function armiesByDescendingSize(
  state: MatchState,
  playerId: PlayerId,
): readonly PlacedArmy[] {
  return state.zones
    .map(
      (zone): PlacedArmy => ({
        zoneId: zone.zoneId,
        units: unitsOfPlayerInZone(zone, playerId),
      }),
    )
    .filter((army): boolean => totalUnitCount(army.units) > 0)
    .toSorted(
      compareInOrder<PlacedArmy>([
        (left, right): number =>
          totalUnitCount(right.units) - totalUnitCount(left.units),
        (left, right): number =>
          compareByCodeUnitOrder(left.zoneId, right.zoneId),
      ]),
    );
}
