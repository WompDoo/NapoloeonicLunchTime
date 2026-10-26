import { EngineContractError } from '../core/engine-error';
import { TEST_MAP_JSON } from '../../testing/test-map';
import { parseMapDefinition } from './parse-map-definition';

const LINE_MAP = {
  id: 'line',
  zones: [
    { id: 'Z3', kind: 'capital' },
    { id: 'Z1', kind: 'capital' },
    { id: 'Z2', kind: 'city' },
  ],
  connections: [
    ['Z3', 'Z2'],
    ['Z2', 'Z1'],
  ],
  startingCapitals: [
    { seat: 2, zoneId: 'Z3' },
    { seat: 1, zoneId: 'Z1' },
  ],
};

function withOverrides(overrides: Record<string, unknown>): unknown {
  return { ...LINE_MAP, ...overrides };
}

describe('parseMapDefinition', () => {
  it('normalises zones, connections and seats into sorted order', () => {
    expect(parseMapDefinition(LINE_MAP)).toEqual({
      id: 'line',
      zones: [
        { id: 'Z1', kind: 'capital' },
        { id: 'Z2', kind: 'city' },
        { id: 'Z3', kind: 'capital' },
      ],
      connections: [
        ['Z1', 'Z2'],
        ['Z2', 'Z3'],
      ],
      startingCapitals: [
        { seat: 1, zoneId: 'Z1' },
        { seat: 2, zoneId: 'Z3' },
      ],
    });
  });

  it('accepts the 3×3 test grid', () => {
    const map = parseMapDefinition(TEST_MAP_JSON);
    expect(map.zones).toHaveLength(9);
    expect(map.connections).toHaveLength(12);
  });

  it.each([
    { name: 'a non-object map', raw: 'map', message: 'map must be an object' },
    {
      name: 'a missing id',
      raw: withOverrides({ id: undefined }),
      message: 'map.id must be a non-empty string',
    },
    {
      name: 'zones that are not a list',
      raw: withOverrides({ zones: {} }),
      message: 'map.zones must be an array',
    },
    {
      name: 'a zone that is not an object',
      raw: withOverrides({ zones: [7] }),
      message: 'map.zones[0] must be an object',
    },
    {
      name: 'an unknown zone kind',
      raw: withOverrides({ zones: [{ id: 'Z1', kind: 'fort' }] }),
      message: 'map.zones[0].kind must be one of: plain, city, capital',
    },
    {
      name: 'a connection that is not a pair',
      raw: withOverrides({ connections: ['Z1-Z2'] }),
      message: 'map.connections[0] must be an array',
    },
    {
      name: 'a connection with a missing end',
      raw: withOverrides({ connections: [['Z1']] }),
      message: 'map.connections[0][1] must be a non-empty string',
    },
    {
      name: 'a zero seat',
      raw: withOverrides({ startingCapitals: [{ seat: 0, zoneId: 'Z1' }] }),
      message: 'map.startingCapitals[0].seat must be a positive integer',
    },
  ])('rejects $name', ({ raw, message }) => {
    expect(() => parseMapDefinition(raw)).toThrow(
      new EngineContractError(message),
    );
  });

  it.each([
    {
      name: 'duplicate zone ids',
      overrides: { zones: [...LINE_MAP.zones, { id: 'Z2', kind: 'plain' }] },
      issue: 'duplicate zone id Z2',
    },
    {
      name: 'connections to unknown zones',
      overrides: { connections: [['Z1', 'Z9']] },
      issue: 'connection references unknown zone Z9',
    },
    {
      name: 'a zone connected to itself',
      overrides: { connections: [['Z2', 'Z2']] },
      issue: 'zone Z2 is connected to itself',
    },
    {
      name: 'the same connection twice in either direction',
      overrides: { connections: [...LINE_MAP.connections, ['Z1', 'Z2']] },
      issue: 'duplicate connection Z1|Z2',
    },
    {
      name: 'a seat starting at an unknown zone',
      overrides: { startingCapitals: [{ seat: 1, zoneId: 'Z9' }] },
      issue: 'seat 1 starts at unknown zone Z9',
    },
    {
      name: 'a seat starting outside a capital',
      overrides: { startingCapitals: [{ seat: 1, zoneId: 'Z2' }] },
      issue: 'seat 1 starts at Z2, which is a city, not a capital',
    },
    {
      name: 'the same seat twice',
      overrides: {
        startingCapitals: [
          { seat: 1, zoneId: 'Z1' },
          { seat: 1, zoneId: 'Z3' },
        ],
      },
      issue: 'duplicate starting seat 1',
    },
    {
      name: 'two seats sharing a capital',
      overrides: {
        startingCapitals: [
          { seat: 1, zoneId: 'Z1' },
          { seat: 2, zoneId: 'Z1' },
        ],
      },
      issue: 'zone Z1 is the starting capital of more than one seat',
    },
  ])('reports $name', ({ overrides, issue }) => {
    expect(() => parseMapDefinition(withOverrides(overrides))).toThrow(
      new EngineContractError(`Invalid map line: ${issue}`),
    );
  });

  it('reports every semantic issue at once', () => {
    expect(() =>
      parseMapDefinition(
        withOverrides({
          connections: [
            ['Z1', 'Z9'],
            ['Z2', 'Z2'],
          ],
        }),
      ),
    ).toThrow(
      new EngineContractError(
        'Invalid map line: connection references unknown zone Z9; zone Z2 is connected to itself',
      ),
    );
  });
});
