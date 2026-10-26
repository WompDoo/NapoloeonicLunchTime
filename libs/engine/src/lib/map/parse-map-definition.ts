import {
  decodeArray,
  decodeNonEmptyString,
  decodeOneOf,
  decodePositiveInteger,
  decodeRecord,
  findDuplicates,
} from '../core/decode';
import { EngineContractError } from '../core/engine-error';
import type { ZoneId } from '../core/ids';
import { compareByCodeUnitOrder, toZoneId } from '../core/ids';
import type {
  MapDefinition,
  StartingCapital,
  ZoneConnection,
  ZoneDefinition,
} from './map-definition';
import { ZONE_KINDS } from './map-definition';
import {
  compareConnections,
  connectionKey,
  normaliseConnection,
} from './map-queries';

/**
 * Turns raw map JSON into a validated, normalised `MapDefinition`.
 * Structural problems throw on the first one found; semantic problems are collected and thrown together.
 */
export function parseMapDefinition(raw: unknown): MapDefinition {
  const record = decodeRecord(raw, 'map');
  const map: MapDefinition = {
    id: decodeNonEmptyString(record['id'], 'map.id'),
    zones: decodeArray(record['zones'], 'map.zones')
      .map(decodeZoneDefinition)
      .sort((left, right): number => compareByCodeUnitOrder(left.id, right.id)),
    connections: decodeArray(record['connections'], 'map.connections')
      .map(decodeConnection)
      .sort(compareConnections),
    startingCapitals: decodeArray(
      record['startingCapitals'],
      'map.startingCapitals',
    )
      .map(decodeStartingCapital)
      .sort((left, right): number => left.seat - right.seat),
  };
  assertNoMapIssues(map.id, collectMapIssues(map));
  return map;
}

function decodeZoneDefinition(raw: unknown, index: number): ZoneDefinition {
  const path = `map.zones[${index}]`;
  const record = decodeRecord(raw, path);
  return {
    id: toZoneId(decodeNonEmptyString(record['id'], `${path}.id`)),
    kind: decodeOneOf(record['kind'], ZONE_KINDS, `${path}.kind`),
  };
}

function decodeConnection(raw: unknown, index: number): ZoneConnection {
  const path = `map.connections[${index}]`;
  const [firstZoneId, secondZoneId] = decodeArray(raw, path);
  return normaliseConnection(
    toZoneId(decodeNonEmptyString(firstZoneId, `${path}[0]`)),
    toZoneId(decodeNonEmptyString(secondZoneId, `${path}[1]`)),
  );
}

function decodeStartingCapital(raw: unknown, index: number): StartingCapital {
  const path = `map.startingCapitals[${index}]`;
  const record = decodeRecord(raw, path);
  return {
    seat: decodePositiveInteger(record['seat'], `${path}.seat`),
    zoneId: toZoneId(decodeNonEmptyString(record['zoneId'], `${path}.zoneId`)),
  };
}

function collectMapIssues(map: MapDefinition): readonly string[] {
  const zoneIds = map.zones.map((zone): ZoneId => zone.id);
  const isKnownZone = (zoneId: ZoneId): boolean => zoneIds.includes(zoneId);
  return [
    ...findDuplicates(zoneIds).map(
      (zoneId): string => `duplicate zone id ${zoneId}`,
    ),
    ...map.connections.flatMap((connection): readonly string[] =>
      describeConnectionIssues(connection, isKnownZone),
    ),
    ...findDuplicates(
      map.connections.map((connection): string => connectionKey(...connection)),
    ).map((key): string => `duplicate connection ${key}`),
    ...map.startingCapitals.flatMap((capital): readonly string[] =>
      describeStartingCapitalIssues(capital, map),
    ),
    ...findDuplicates(
      map.startingCapitals.map((capital): string => String(capital.seat)),
    ).map((seat): string => `duplicate starting seat ${seat}`),
    ...findDuplicates(
      map.startingCapitals.map((capital): string => capital.zoneId),
    ).map(
      (zoneId): string =>
        `zone ${zoneId} is the starting capital of more than one seat`,
    ),
  ];
}

function describeConnectionIssues(
  [firstZoneId, secondZoneId]: ZoneConnection,
  isKnownZone: (zoneId: ZoneId) => boolean,
): readonly string[] {
  return [
    ...[firstZoneId, secondZoneId]
      .filter((zoneId): boolean => !isKnownZone(zoneId))
      .map((zoneId): string => `connection references unknown zone ${zoneId}`),
    ...describeSelfConnection(firstZoneId, secondZoneId),
  ];
}

function describeSelfConnection(
  firstZoneId: ZoneId,
  secondZoneId: ZoneId,
): readonly string[] {
  return firstZoneId === secondZoneId
    ? [`zone ${firstZoneId} is connected to itself`]
    : [];
}

function describeStartingCapitalIssues(
  capital: StartingCapital,
  map: MapDefinition,
): readonly string[] {
  const zone = map.zones.find(
    (candidate): boolean => candidate.id === capital.zoneId,
  );
  return zone === undefined
    ? [`seat ${capital.seat} starts at unknown zone ${capital.zoneId}`]
    : describeNonCapitalStart(capital, zone);
}

function describeNonCapitalStart(
  capital: StartingCapital,
  zone: ZoneDefinition,
): readonly string[] {
  return zone.kind === 'capital'
    ? []
    : [
        `seat ${capital.seat} starts at ${zone.id}, which is a ${zone.kind}, not a capital`,
      ];
}

function assertNoMapIssues(mapId: string, issues: readonly string[]): void {
  if (issues.length > 0) {
    throw new EngineContractError(`Invalid map ${mapId}: ${issues.join('; ')}`);
  }
}
