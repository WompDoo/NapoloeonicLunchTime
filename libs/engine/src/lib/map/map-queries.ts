import { requirePresent } from '../core/engine-error';
import type { ZoneId } from '../core/ids';
import { compareByCodeUnitOrder } from '../core/ids';
import type {
  MapDefinition,
  StartingCapital,
  ZoneConnection,
  ZoneDefinition,
} from './map-definition';
import { ZONE_KIND_COUNTS_AS_CITY } from './map-definition';

const CONNECTION_KEY_SEPARATOR = '|';

export function normaliseConnection(
  firstZoneId: ZoneId,
  secondZoneId: ZoneId,
): ZoneConnection {
  return compareByCodeUnitOrder(firstZoneId, secondZoneId) <= 0
    ? [firstZoneId, secondZoneId]
    : [secondZoneId, firstZoneId];
}

export function connectionKey(
  firstZoneId: ZoneId,
  secondZoneId: ZoneId,
): string {
  return normaliseConnection(firstZoneId, secondZoneId).join(
    CONNECTION_KEY_SEPARATOR,
  );
}

export function compareConnections(
  left: ZoneConnection,
  right: ZoneConnection,
): number {
  return compareByCodeUnitOrder(
    connectionKey(...left),
    connectionKey(...right),
  );
}

export function areZonesAdjacent(
  map: MapDefinition,
  firstZoneId: ZoneId,
  secondZoneId: ZoneId,
): boolean {
  const wantedKey = connectionKey(firstZoneId, secondZoneId);
  return map.connections.some(
    ([connectedZoneId, otherZoneId]): boolean =>
      connectionKey(connectedZoneId, otherZoneId) === wantedKey,
  );
}

export function isZoneOnMap(map: MapDefinition, zoneId: ZoneId): boolean {
  return map.zones.some((zone): boolean => zone.id === zoneId);
}

export function findZoneDefinition(
  map: MapDefinition,
  zoneId: ZoneId,
): ZoneDefinition {
  return requirePresent(
    map.zones.find((zone): boolean => zone.id === zoneId),
    `zone ${zoneId} on map ${map.id}`,
  );
}

export function isCityZone(map: MapDefinition, zoneId: ZoneId): boolean {
  return ZONE_KIND_COUNTS_AS_CITY[findZoneDefinition(map, zoneId).kind];
}

export function findStartingCapital(
  map: MapDefinition,
  seat: number,
): StartingCapital {
  return requirePresent(
    map.startingCapitals.find((capital): boolean => capital.seat === seat),
    `starting capital for seat ${seat} on map ${map.id}`,
  );
}

/** Zones connected to the zone, in zone id order. */
export function adjacentZoneIds(
  map: MapDefinition,
  zoneId: ZoneId,
): readonly ZoneId[] {
  return map.zones
    .map((zone): ZoneId => zone.id)
    .filter((candidate): boolean => areZonesAdjacent(map, zoneId, candidate));
}

/** One step of a route, from the first zone to the second. */
export type RouteLeg = readonly [ZoneId, ZoneId];

export function routeLegs(route: readonly ZoneId[]): readonly RouteLeg[] {
  return route
    .slice(1)
    .map(
      (toZoneId, index): RouteLeg => [
        requirePresent(route[index], 'route zone'),
        toZoneId,
      ],
    );
}
