import type { ZoneConnection, ZoneId } from '@lunch-campaign/engine';

/** The zones one connection away, in connection order. */
export function adjacentZoneIds(
  connections: readonly ZoneConnection[],
  zoneId: string,
): readonly ZoneId[] {
  return connections.flatMap((connection): readonly ZoneId[] =>
    connection.includes(zoneId as ZoneId)
      ? connection.filter((end): boolean => end !== zoneId)
      : [],
  );
}
