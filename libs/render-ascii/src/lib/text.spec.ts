import {
  describeCount,
  describeUnits,
  describeUnitTypes,
  formatNumber,
  formatPercent,
  formatTable,
  humanise,
  listText,
  plural,
  requireFound,
} from './text';

describe('text helpers', () => {
  it.each([
    {
      units: { line: 3, cavalry: 0, skirmishers: 2, artillery: 1 },
      text: '3L 2S 1A',
    },
    {
      units: { line: 0, cavalry: 0, skirmishers: 0, artillery: 0 },
      text: 'none',
    },
  ])('describes units as $text', ({ units, text }) => {
    expect(describeUnits(units)).toBe(text);
  });

  it('describes a list of single units as army text', () => {
    expect(describeUnitTypes(['cavalry', 'skirmishers', 'cavalry'])).toBe(
      '2C 1S',
    );
    expect(describeUnitTypes([])).toBe('none');
  });

  it.each([
    { count: 0, text: '0 units' },
    { count: 1, text: '1 unit' },
    { count: 5, text: '5 units' },
  ])('counts $count as $text', ({ count, text }) => {
    expect(describeCount(count)).toBe(text);
  });

  it('pluralises', () => {
    expect(plural(1, 'city', 'cities')).toBe('1 city');
    expect(plural(2, 'city', 'cities')).toBe('2 cities');
  });

  it.each([
    { value: 5.500000000000001, text: '5.5' },
    { value: 4.375, text: '4.38' },
    { value: 6, text: '6' },
  ])('formats $value as $text', ({ value, text }) => {
    expect(formatNumber(value)).toBe(text);
  });

  it('formats fractions as percentages', () => {
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(0.1)).toBe('10%');
  });

  it.each([
    { items: [], text: '' },
    { items: ['a'], text: 'a' },
    { items: ['a', 'b'], text: 'a and b' },
    { items: ['a', 'b', 'c'], text: 'a, b and c' },
  ])('lists $items as "$text"', ({ items, text }) => {
    expect(listText(items)).toBe(text);
  });

  it('turns identifiers into words', () => {
    expect(humanise('insufficientUnits')).toBe('insufficient units');
  });

  it('pads table columns to the widest cell', () => {
    expect(
      formatTable([
        ['P1', 'napoleon-player', ''],
        ['P2', 'ney', 'eliminated'],
      ]),
    ).toEqual(['P1  napoleon-player', 'P2  ney              eliminated']);
  });

  it('refuses malformed views', () => {
    expect(requireFound(0, 'zero')).toBe(0);
    expect(() => requireFound(undefined, 'zone Z9')).toThrow(
      'Malformed player view: missing zone Z9',
    );
  });
});
