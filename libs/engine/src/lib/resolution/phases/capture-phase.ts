import type { PlayerId } from '../../core/ids';
import type { ZoneCapturedEvent } from '../../replay/replay-events';
import type { ZoneState } from '../../state/match-state';
import type { ResolutionState, TurnContext } from '../resolution-state';
import { appendEvents } from '../resolution-state';

const SOLE_ARMY = 1;

/**
 * A zone held by exactly one player's army belongs to that player. Empty zones keep their owner.
 * This covers both an empty zone entered without a battle and the surviving side of a battle.
 */
export function applyCapturePhase(
  resolution: ResolutionState,
  context: TurnContext,
): ResolutionState {
  const captures = resolution.match.zones.flatMap(
    (zone): readonly ZoneCapturedEvent[] =>
      describeCapture(zone, context.turnNumber),
  );
  return appendEvents(
    resolution,
    {
      ...resolution.match,
      zones: resolution.match.zones.map(
        (zone): ZoneState => ({
          ...zone,
          ownerId: findCapturer(zone) ?? zone.ownerId,
        }),
      ),
    },
    captures,
  );
}

function describeCapture(
  zone: ZoneState,
  turnNumber: number,
): readonly ZoneCapturedEvent[] {
  const capturerId = findCapturer(zone);
  return capturerId === undefined
    ? []
    : [
        {
          type: 'ZoneCaptured',
          turnNumber,
          zoneId: zone.zoneId,
          previousOwnerId: zone.ownerId,
          newOwnerId: capturerId,
        },
      ];
}

/** The player whose army alone holds the zone, if that player is not already its owner. */
function findCapturer(zone: ZoneState): PlayerId | undefined {
  const occupierId = findSoleOccupier(zone);
  return occupierId === zone.ownerId ? undefined : occupierId;
}

function findSoleOccupier(zone: ZoneState): PlayerId | undefined {
  const occupierIds = zone.armies.map((army): PlayerId => army.playerId);
  return occupierIds.length === SOLE_ARMY ? occupierIds[0] : undefined;
}
