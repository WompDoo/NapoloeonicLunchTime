import type { RandomSource } from '../app/platform/random-source';

export interface RandomScript {
  readonly ids: readonly string[];
  readonly secrets: readonly string[];
}

/** Hands out the given ids and secrets in order, and fails loudly when a test draws more than it planned. */
export function scriptedRandom(script: RandomScript): RandomSource {
  const ids = [...script.ids];
  const secrets = [...script.secrets];
  return {
    id: (): string => next(ids, 'id'),
    secret: (): string => next(secrets, 'secret'),
  };
}

/** Endless numbered ids and secrets, for tests that don't care which. */
export function countingRandom(): RandomSource {
  const counts = { id: 0, secret: 0 };
  return {
    id: (): string => `id-${++counts.id}`,
    secret: (): string => `secret-${++counts.secret}`,
  };
}

function next(queue: string[], kind: string): string {
  const value = queue.shift();
  if (value === undefined) {
    throw new Error(`The test ran out of scripted ${kind}s`);
  }
  return value;
}
