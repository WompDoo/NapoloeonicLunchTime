import { EngineContractError } from './engine-error';
import {
  addUnitCounts,
  areValidUnitCounts,
  createUnitCounts,
  hasAnyUnits,
  isValidUnitCount,
  mapUnitTypes,
  NO_UNITS,
  subtractUnitCounts,
  totalUnitCount,
  unitCountsContain,
  unitCountsOfSingleType,
  unitTypesPresent,
} from './unit-counts';

describe('unit counts', () => {
  it('builds a record over every unit type', () => {
    expect(mapUnitTypes((unitType) => unitType.length)).toEqual({
      line: 4,
      cavalry: 7,
      skirmishers: 11,
      artillery: 9,
    });
  });

  it('fills missing types with zero', () => {
    expect(createUnitCounts({ cavalry: 2 })).toEqual({
      line: 0,
      cavalry: 2,
      skirmishers: 0,
      artillery: 0,
    });
    expect(NO_UNITS).toEqual({
      line: 0,
      cavalry: 0,
      skirmishers: 0,
      artillery: 0,
    });
  });

  it('creates counts of a single type', () => {
    expect(unitCountsOfSingleType('artillery', 3)).toEqual(
      createUnitCounts({ artillery: 3 }),
    );
  });

  it('adds and subtracts per type', () => {
    const left = createUnitCounts({ line: 3, cavalry: 1 });
    const right = createUnitCounts({ line: 1, artillery: 2 });
    expect(addUnitCounts(left, right)).toEqual(
      createUnitCounts({ line: 4, cavalry: 1, artillery: 2 }),
    );
    expect(subtractUnitCounts(left, createUnitCounts({ line: 1 }))).toEqual(
      createUnitCounts({ line: 2, cavalry: 1 }),
    );
  });

  it('refuses to remove units that are not there', () => {
    expect(() =>
      subtractUnitCounts(
        createUnitCounts({ line: 1 }),
        createUnitCounts({ line: 2 }),
      ),
    ).toThrow(EngineContractError);
  });

  it('totals and detects units', () => {
    expect(
      totalUnitCount(
        createUnitCounts({ line: 3, cavalry: 2, skirmishers: 2, artillery: 1 }),
      ),
    ).toBe(8);
    expect(hasAnyUnits(NO_UNITS)).toBe(false);
    expect(hasAnyUnits(createUnitCounts({ artillery: 1 }))).toBe(true);
  });

  it.each([
    { container: { line: 2 }, contained: { line: 2 }, expected: true },
    {
      container: { line: 2, cavalry: 1 },
      contained: { cavalry: 1 },
      expected: true,
    },
    { container: { line: 2 }, contained: { line: 3 }, expected: false },
    { container: { line: 2 }, contained: { skirmishers: 1 }, expected: false },
  ])(
    'checks containment of $contained in $container',
    ({ container, contained, expected }) => {
      expect(
        unitCountsContain(
          createUnitCounts(container),
          createUnitCounts(contained),
        ),
      ).toBe(expected);
    },
  );

  it.each([
    { count: 0, expected: true },
    { count: 3, expected: true },
    { count: -1, expected: false },
    { count: 1.5, expected: false },
    { count: Number.NaN, expected: false },
  ])('treats $count as a valid count: $expected', ({ count, expected }) => {
    expect(isValidUnitCount(count)).toBe(expected);
  });

  it('validates every type of a count record', () => {
    expect(areValidUnitCounts(createUnitCounts({ line: 2 }))).toBe(true);
    expect(
      areValidUnitCounts(createUnitCounts({ line: 2, artillery: -1 })),
    ).toBe(false);
  });

  it('lists the types present in canonical order', () => {
    expect(
      unitTypesPresent(createUnitCounts({ artillery: 1, line: 2 })),
    ).toEqual(['line', 'artillery']);
  });
});
