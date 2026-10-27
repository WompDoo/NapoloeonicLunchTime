import { requirePresent } from './engine-error';
import { seededIndex } from './random';

interface Draw<T> {
  readonly drawn: readonly T[];
  readonly remaining: readonly T[];
}

/**
 * Every item in a seeded order, drawn one at a time without replacement. Draw `n` uses the label
 * `${labelPrefix}:${n}`, so the first draws stay the same however many are taken. Callers sort the pool
 * first, so the result never depends on the order they hold it in.
 */
export function seededDrawOrder<T>(
  pool: readonly T[],
  labelPrefix: string,
): readonly T[] {
  return pool.reduce<Draw<T>>(
    (draw, _unused, drawIndex): Draw<T> =>
      drawOne(draw, `${labelPrefix}:${drawIndex}`),
    { drawn: [], remaining: pool },
  ).drawn;
}

function drawOne<T>(draw: Draw<T>, label: string): Draw<T> {
  const index = seededIndex(label, draw.remaining.length);
  return {
    drawn: [
      ...draw.drawn,
      requirePresent(draw.remaining[index], 'item to draw'),
    ],
    remaining: draw.remaining.filter(
      (_item, candidate): boolean => candidate !== index,
    ),
  };
}
