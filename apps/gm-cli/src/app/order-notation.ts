import type {
  MatchState,
  Order,
  PlayerId,
  PlayerOrders,
  UnitCounts,
  UnitType,
} from '@lunch-campaign/engine';
import {
  addUnitCounts,
  createUnitCounts,
  decodeArray,
  decodeNonEmptyString,
  decodeOneOf,
  decodeRecord,
  toPlayerId,
  toZoneId,
  UNIT_TYPES,
  unitCountsOfSingleType,
} from '@lunch-campaign/engine';
import { UNIT_LETTERS } from '@lunch-campaign/render-ascii';
import { CliError, parseJson } from './cli-error';

/*
 * The GM's order notation: one string per order, as a player would say it. Only the syntax is checked
 * here; whether an order is legal is the engine's call at resolution, where an illegal order is rejected
 * and logged like any other.
 */

interface OrderForm {
  readonly example: string;
  readonly pattern: RegExp;
  readonly build: (match: RegExpExecArray) => Order;
}

const ROUTE_ARROW = ' -> ';
const UNITS_WORD = /(?<count>[1-9]\d*)(?<letter>[A-Z])/g;

const ORDER_FORMS: readonly OrderForm[] = [
  {
    example: 'recruit 2 line',
    pattern: /^recruit (?<count>[1-9]\d*) (?<unitType>\S+)$/,
    build: (match): Order => ({
      kind: 'recruit',
      count: Number(group(match, 'count')),
      unitType: decodeOneOf(
        group(match, 'unitType'),
        UNIT_TYPES,
        'the unit type',
      ),
    }),
  },
  {
    example: 'move A1 -> B2 2L 1C',
    pattern:
      /^move (?<from>\S+)(?<via>(?: -> \S+)*) -> (?<to>\S+) (?<units>[1-9]\d*[A-Z](?: [1-9]\d*[A-Z])*)$/,
    build: (match): Order => ({
      kind: 'move',
      fromZoneId: toZoneId(group(match, 'from')),
      viaZoneIds: group(match, 'via')
        .split(ROUTE_ARROW)
        .filter((zone): boolean => zone !== '')
        .map(toZoneId),
      toZoneId: toZoneId(group(match, 'to')),
      units: parseUnits(group(match, 'units')),
    }),
  },
  {
    example: 'support A2 -> B2 1',
    pattern: /^support (?<from>\S+) -> (?<to>\S+) (?<count>[1-9]\d*)$/,
    build: (match): Order => ({
      kind: 'support',
      fromZoneId: toZoneId(group(match, 'from')),
      targetZoneId: toZoneId(group(match, 'to')),
      count: Number(group(match, 'count')),
    }),
  },
  {
    example: 'upgrade squares',
    pattern: /^upgrade (?<upgradeId>\S+)$/,
    build: (match): Order => ({
      kind: 'buyUpgrade',
      upgradeId: group(match, 'upgradeId'),
    }),
  },
  {
    example: 'ability',
    pattern: /^ability$/,
    build: (): Order => ({ kind: 'useAbility', target: { kind: 'none' } }),
  },
  {
    example: 'ability B2',
    pattern: /^ability (?<zone>\S+)$/,
    build: (match): Order => ({
      kind: 'useAbility',
      target: { kind: 'ownedZone', zoneId: toZoneId(group(match, 'zone')) },
    }),
  },
  {
    example: 'ability A2 -> B2 2L',
    pattern:
      /^ability (?<from>\S+) -> (?<to>\S+) (?<units>[1-9]\d*[A-Z](?: [1-9]\d*[A-Z])*)$/,
    build: (match): Order => ({
      kind: 'useAbility',
      target: {
        kind: 'reinforcement',
        fromZoneId: toZoneId(group(match, 'from')),
        toZoneId: toZoneId(group(match, 'to')),
        units: parseUnits(group(match, 'units')),
      },
    }),
  },
];

const UNIT_TYPE_BY_LETTER: ReadonlyMap<string, UnitType> = new Map(
  UNIT_TYPES.map((unitType): readonly [string, UnitType] => [
    UNIT_LETTERS[unitType],
    unitType,
  ]),
);

/** Every accepted form, for help and error messages. */
export const ORDER_EXAMPLES = ORDER_FORMS.map((form): string => form.example);

/** Reads an orders file: `{ "<playerId>": ["<order>", …] }`. Players with no entry give no orders. */
export function parseOrdersFile(
  text: string,
  path: string,
  state: MatchState,
): readonly PlayerOrders[] {
  return Object.entries(decodeRecord(parseJson(text, path), path)).map(
    ([playerId, orders]): PlayerOrders => ({
      playerId: requirePlayer(state, playerId, path),
      orders: decodeArray(orders, `${path}.${playerId}`).map(
        (order, index): Order =>
          parseOrderAt(order, `${path}.${playerId}[${index}]`),
      ),
    }),
  );
}

/** One order in the notation; spacing around "->" is optional. */
export function parseOrder(text: string): Order {
  const normalised = text
    .trim()
    .replace(/\s*->\s*/g, ROUTE_ARROW)
    .split(/\s+/)
    .join(' ');
  const order = ORDER_FORMS.reduce<Order | undefined>(
    (found, form): Order | undefined => found ?? orderOfForm(form, normalised),
    undefined,
  );
  if (order === undefined) {
    throw new CliError(`expected one of: ${ORDER_EXAMPLES.join(' | ')}`);
  }
  return order;
}

/** A named group the pattern always captures. */
export function group(match: RegExpExecArray, name: string): string {
  const groups: Readonly<Record<string, string | undefined>> = {
    ...match.groups,
  };
  const value = groups[name];
  if (value === undefined) {
    throw new Error(`Order pattern has no group "${name}"`);
  }
  return value;
}

function orderOfForm(form: OrderForm, text: string): Order | undefined {
  const match = form.pattern.exec(text);
  return match === null ? undefined : form.build(match);
}

function parseOrderAt(order: unknown, path: string): Order {
  const text = decodeNonEmptyString(order, path);
  try {
    return parseOrder(text);
  } catch (error) {
    throw new CliError(`${path} "${text}": ${(error as Error).message}`);
  }
}

function requirePlayer(
  state: MatchState,
  playerId: string,
  path: string,
): PlayerId {
  if (!state.players.some((player): boolean => player.playerId === playerId)) {
    throw new CliError(`${path}: ${playerId} is not in this match`);
  }
  return toPlayerId(playerId);
}

/** "2L 1C" → 2 line and 1 cavalry. Repeated letters add up. */
function parseUnits(text: string): UnitCounts {
  return [...text.matchAll(UNITS_WORD)].reduce(
    (total, match): UnitCounts =>
      addUnitCounts(
        total,
        unitCountsOfSingleType(
          unitTypeOfLetter(group(match, 'letter')),
          Number(group(match, 'count')),
        ),
      ),
    createUnitCounts({}),
  );
}

function unitTypeOfLetter(letter: string): UnitType {
  const unitType = UNIT_TYPE_BY_LETTER.get(letter);
  if (unitType === undefined) {
    throw new CliError(
      `unknown unit letter "${letter}"; letters: ${[...UNIT_TYPE_BY_LETTER.keys()].join(', ')}`,
    );
  }
  return unitType;
}
