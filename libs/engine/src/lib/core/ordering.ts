export type Comparator<T> = (left: T, right: T) => number;

/** Combines comparators: the first one that tells the values apart decides. */
export function compareInOrder<T>(
  comparators: readonly Comparator<T>[],
): Comparator<T> {
  return (left, right): number =>
    comparators.reduce(
      (result, comparator): number => result || comparator(left, right),
      0,
    );
}
