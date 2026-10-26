import { EngineContractError } from '../core/engine-error';
import { toZoneId } from '../core/ids';
import { TEST_MAP } from '../../testing/test-map';
import {
  areZonesAdjacent,
  compareConnections,
  connectionKey,
  findStartingCapital,
  findZoneDefinition,
  isCityZone,
  isZoneOnMap,
  normaliseConnection,
} from './map-queries';

const A1 = toZoneId('A1');
const A2 = toZoneId('A2');
const B1 = toZoneId('B1');

describe('map queries', () => {
  it('normalises connections regardless of direction', () => {
    expect(normaliseConnection(A2, A1)).toEqual([A1, A2]);
    expect(normaliseConnection(A1, A2)).toEqual([A1, A2]);
    expect(connectionKey(A2, A1)).toBe(connectionKey(A1, A2));
  });

  it('orders connections by their normalised key', () => {
    expect(compareConnections([A1, B1], [A1, A2])).toBe(1);
    expect(compareConnections([A1, A2], [A2, A1])).toBe(0);
  });

  it.each([
    { from: 'A1', to: 'A2', expected: true },
    { from: 'A2', to: 'A1', expected: true },
    { from: 'A2', to: 'B2', expected: true },
    { from: 'A1', to: 'B2', expected: false },
    { from: 'A1', to: 'A3', expected: false },
    { from: 'A1', to: 'A1', expected: false },
  ])('says $from and $to are adjacent: $expected', ({ from, to, expected }) => {
    expect(areZonesAdjacent(TEST_MAP, toZoneId(from), toZoneId(to))).toBe(
      expected,
    );
  });

  it('knows which zones are on the map', () => {
    expect(isZoneOnMap(TEST_MAP, A1)).toBe(true);
    expect(isZoneOnMap(TEST_MAP, toZoneId('D4'))).toBe(false);
  });

  it('finds zone definitions', () => {
    expect(findZoneDefinition(TEST_MAP, toZoneId('B2'))).toEqual({
      id: 'B2',
      kind: 'city',
    });
    expect(() => findZoneDefinition(TEST_MAP, toZoneId('D4'))).toThrow(
      EngineContractError,
    );
  });

  it.each([
    { zone: 'A2', expected: false },
    { zone: 'B2', expected: true },
    { zone: 'A1', expected: true },
  ])('counts $zone as a city: $expected', ({ zone, expected }) => {
    expect(isCityZone(TEST_MAP, toZoneId(zone))).toBe(expected);
  });

  it('finds starting capitals by seat', () => {
    expect(findStartingCapital(TEST_MAP, 2)).toEqual({ seat: 2, zoneId: 'A3' });
    expect(() => findStartingCapital(TEST_MAP, 5)).toThrow(
      new EngineContractError(
        'Missing starting capital for seat 5 on map test-grid-3x3',
      ),
    );
  });
});
