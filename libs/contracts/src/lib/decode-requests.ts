import type {
  AbilityTarget,
  Order,
  UnitCounts,
  UnitType,
  UnknownRecord,
  ZoneId,
} from '@lunch-campaign/engine';
import {
  decodeArray,
  decodeNonEmptyString,
  decodeOneOf,
  decodePositiveInteger,
  decodeRecord,
  EngineContractError,
  mapUnitTypes,
  toZoneId,
  UNIT_TYPES,
} from '@lunch-campaign/engine';
import type {
  CreateMatchRequest,
  JoinMatchRequest,
  PickCommanderRequest,
  ReadyRequest,
  SpyRequest,
  SubmitOrdersRequest,
} from './requests';

/** A request body the API cannot read; the message names the field. */
export class InvalidRequestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidRequestError';
  }
}

export const PLAYER_NAME_MAX_LENGTH = 40;
const BODY = 'body';

type Decoder<T> = (record: UnknownRecord, path: string) => T;

const ORDER_KINDS: readonly Order['kind'][] = [
  'recruit',
  'move',
  'support',
  'buyUpgrade',
  'useAbility',
];

const ORDER_DECODERS: { readonly [TKind in Order['kind']]: Decoder<Order> } = {
  recruit: (record, path): Order => ({
    kind: 'recruit',
    unitType: decodeOneOf(record['unitType'], UNIT_TYPES, `${path}.unitType`),
    count: decodePositiveInteger(record['count'], `${path}.count`),
  }),
  move: (record, path): Order => ({
    kind: 'move',
    fromZoneId: decodeZoneId(record['fromZoneId'], `${path}.fromZoneId`),
    viaZoneIds: decodeArray(
      record['viaZoneIds'] ?? [],
      `${path}.viaZoneIds`,
    ).map(
      (zoneId, index): ZoneId =>
        decodeZoneId(zoneId, `${path}.viaZoneIds[${index}]`),
    ),
    toZoneId: decodeZoneId(record['toZoneId'], `${path}.toZoneId`),
    units: decodeUnitCounts(record['units'], `${path}.units`),
  }),
  support: (record, path): Order => ({
    kind: 'support',
    fromZoneId: decodeZoneId(record['fromZoneId'], `${path}.fromZoneId`),
    targetZoneId: decodeZoneId(record['targetZoneId'], `${path}.targetZoneId`),
    count: decodePositiveInteger(record['count'], `${path}.count`),
  }),
  buyUpgrade: (record, path): Order => ({
    kind: 'buyUpgrade',
    upgradeId: decodeNonEmptyString(record['upgradeId'], `${path}.upgradeId`),
  }),
  useAbility: (record, path): Order => ({
    kind: 'useAbility',
    target: decodeAbilityTarget(record['target'], `${path}.target`),
  }),
};

const TARGET_KINDS: readonly AbilityTarget['kind'][] = [
  'none',
  'ownedZone',
  'reinforcement',
];

const TARGET_DECODERS: {
  readonly [TKind in AbilityTarget['kind']]: Decoder<AbilityTarget>;
} = {
  none: (): AbilityTarget => ({ kind: 'none' }),
  ownedZone: (record, path): AbilityTarget => ({
    kind: 'ownedZone',
    zoneId: decodeZoneId(record['zoneId'], `${path}.zoneId`),
  }),
  reinforcement: (record, path): AbilityTarget => ({
    kind: 'reinforcement',
    fromZoneId: decodeZoneId(record['fromZoneId'], `${path}.fromZoneId`),
    toZoneId: decodeZoneId(record['toZoneId'], `${path}.toZoneId`),
    units: decodeUnitCounts(record['units'], `${path}.units`),
  }),
};

export function decodeCreateMatchRequest(body: unknown): CreateMatchRequest {
  return decodeBody(
    body,
    (record): CreateMatchRequest => ({
      timeZone: decodeNonEmptyString(record['timeZone'], `${BODY}.timeZone`),
    }),
  );
}

export function decodeJoinMatchRequest(body: unknown): JoinMatchRequest {
  return decodeBody(
    body,
    (record): JoinMatchRequest => ({
      name: decodePlayerName(record['name'], `${BODY}.name`),
    }),
  );
}

export function decodePickCommanderRequest(
  body: unknown,
): PickCommanderRequest {
  return decodeBody(
    body,
    (record): PickCommanderRequest => ({
      commanderId: decodeNonEmptyString(
        record['commanderId'],
        `${BODY}.commanderId`,
      ),
    }),
  );
}

export function decodeReadyRequest(body: unknown): ReadyRequest {
  return decodeBody(
    body,
    (record): ReadyRequest => ({
      ready: decodeBoolean(record['ready'], `${BODY}.ready`),
    }),
  );
}

export function decodeSubmitOrdersRequest(body: unknown): SubmitOrdersRequest {
  return decodeBody(
    body,
    (record): SubmitOrdersRequest => ({
      orders: decodeArray(record['orders'], `${BODY}.orders`).map(
        (order, index): Order => decodeOrder(order, `${BODY}.orders[${index}]`),
      ),
    }),
  );
}

export function decodeSpyRequest(body: unknown): SpyRequest {
  return decodeBody(
    body,
    (record): SpyRequest => ({
      zoneId: decodeNonEmptyString(record['zoneId'], `${BODY}.zoneId`),
    }),
  );
}

/** Runs a decoder on a request body, turning every decoding failure into an InvalidRequestError. */
function decodeBody<T>(body: unknown, decode: (record: UnknownRecord) => T): T {
  try {
    return decode(decodeRecord(body, BODY));
  } catch (error) {
    throw asInvalidRequest(error);
  }
}

function asInvalidRequest(error: unknown): unknown {
  return error instanceof EngineContractError
    ? new InvalidRequestError(error.message)
    : error;
}

function decodeOrder(value: unknown, path: string): Order {
  const record = decodeRecord(value, path);
  const kind = decodeOneOf(record['kind'], ORDER_KINDS, `${path}.kind`);
  return ORDER_DECODERS[kind](record, path);
}

function decodeAbilityTarget(value: unknown, path: string): AbilityTarget {
  const record = decodeRecord(value, path);
  const kind = decodeOneOf(record['kind'], TARGET_KINDS, `${path}.kind`);
  return TARGET_DECODERS[kind](record, path);
}

function decodeZoneId(value: unknown, path: string): ZoneId {
  return toZoneId(decodeNonEmptyString(value, path));
}

/** Every unit type defaults to 0; unknown keys are refused so a typo never drops units silently. */
function decodeUnitCounts(value: unknown, path: string): UnitCounts {
  const record = decodeRecord(value, path);
  refuseUnknownUnitTypes(record, path);
  return mapUnitTypes((unitType): number =>
    decodeWholeNumber(record[unitType] ?? 0, `${path}.${unitType}`),
  );
}

function refuseUnknownUnitTypes(record: UnknownRecord, path: string): void {
  const unknown = Object.keys(record).filter(
    (key): boolean =>
      !UNIT_TYPES.some((unitType: UnitType): boolean => unitType === key),
  );
  if (unknown.length > 0) {
    throw new InvalidRequestError(
      `${path} has unknown unit types: ${unknown.join(', ')}`,
    );
  }
}

function decodeWholeNumber(value: unknown, path: string): number {
  if (!isWholeNumber(value)) {
    throw new InvalidRequestError(`${path} must be a whole number, 0 or more`);
  }
  return value;
}

function isWholeNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function decodeBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new InvalidRequestError(`${path} must be true or false`);
  }
  return value;
}

function decodePlayerName(value: unknown, path: string): string {
  const name = decodeNonEmptyString(value, path).trim();
  if (!isAcceptableName(name)) {
    throw new InvalidRequestError(
      `${path} must be 1 to ${PLAYER_NAME_MAX_LENGTH} characters`,
    );
  }
  return name;
}

function isAcceptableName(name: string): boolean {
  return name.length > 0 && name.length <= PLAYER_NAME_MAX_LENGTH;
}
