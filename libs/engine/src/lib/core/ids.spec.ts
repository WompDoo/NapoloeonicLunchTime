import { compareByCodeUnitOrder, toPlayerId, toZoneId } from './ids';

describe('ids', () => {
  it('brands raw strings without changing them', () => {
    expect(toPlayerId('p1')).toBe('p1');
    expect(toZoneId('A1')).toBe('A1');
  });

  it.each([
    { left: 'a', right: 'b', expected: -1 },
    { left: 'b', right: 'a', expected: 1 },
    { left: 'a', right: 'a', expected: 0 },
    { left: 'B', right: 'a', expected: -1 },
    { left: 'A10', right: 'A2', expected: -1 },
  ])(
    'orders $left against $right by code units',
    ({ left, right, expected }) => {
      expect(compareByCodeUnitOrder(left, right)).toBe(expected);
    },
  );
});
