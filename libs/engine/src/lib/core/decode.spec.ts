import {
  decodeArray,
  decodeNonEmptyString,
  decodeOneOf,
  decodePositiveInteger,
  decodeRecord,
  findDuplicates,
} from './decode';
import { EngineContractError } from './engine-error';

describe('decode', () => {
  it('decodes records', () => {
    expect(decodeRecord({ a: 1 }, 'x')).toEqual({ a: 1 });
    expect(() => decodeRecord(null, 'map')).toThrow(
      new EngineContractError('map must be an object'),
    );
    expect(() => decodeRecord('text', 'map')).toThrow(EngineContractError);
  });

  it('decodes arrays', () => {
    expect(decodeArray([1], 'x')).toEqual([1]);
    expect(() => decodeArray({}, 'map.zones')).toThrow(
      new EngineContractError('map.zones must be an array'),
    );
  });

  it.each([{ value: '' }, { value: 3 }, { value: undefined }])(
    'rejects $value as a non-empty string',
    ({ value }) => {
      expect(() => decodeNonEmptyString(value, 'id')).toThrow(
        new EngineContractError('id must be a non-empty string'),
      );
    },
  );

  it('decodes non-empty strings', () => {
    expect(decodeNonEmptyString('A1', 'id')).toBe('A1');
  });

  it.each([{ value: 0 }, { value: -2 }, { value: 1.5 }, { value: '1' }])(
    'rejects $value as a positive integer',
    ({ value }) => {
      expect(() => decodePositiveInteger(value, 'seat')).toThrow(
        new EngineContractError('seat must be a positive integer'),
      );
    },
  );

  it('decodes positive integers', () => {
    expect(decodePositiveInteger(4, 'seat')).toBe(4);
  });

  it('decodes one of the allowed values', () => {
    expect(decodeOneOf('city', ['plain', 'city'], 'kind')).toBe('city');
    expect(() => decodeOneOf('fort', ['plain', 'city'], 'kind')).toThrow(
      new EngineContractError('kind must be one of: plain, city'),
    );
  });

  it('reports each duplicate once, in first-seen order', () => {
    expect(findDuplicates(['b', 'a', 'b', 'c', 'a', 'b'])).toEqual(['b', 'a']);
    expect(findDuplicates(['a', 'b'])).toEqual([]);
  });
});
