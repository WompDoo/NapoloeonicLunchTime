import { compareInOrder } from './ordering';

describe('compareInOrder', () => {
  const byLengthThenText = compareInOrder<string>([
    (left, right): number => left.length - right.length,
    (left, right): number => Number(left > right) - Number(left < right),
  ]);

  it('lets the first comparator that differs decide', () => {
    expect(['bb', 'a', 'ab', 'c'].toSorted(byLengthThenText)).toEqual([
      'a',
      'c',
      'ab',
      'bb',
    ]);
    expect(byLengthThenText('x', 'x')).toBe(0);
  });
});
