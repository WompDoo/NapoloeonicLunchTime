import { randomBytes, randomUUID } from 'node:crypto';

/**
 * Ids, invite codes, player tokens and match seeds. The engine's own randomness stays seeded; this is the
 * one place the API draws fresh entropy, and tests replace it with a predictable sequence.
 */
export interface RandomSource {
  readonly id: () => string;
  readonly secret: () => string;
}

export const RANDOM_SOURCE = Symbol('RandomSource');

const SECRET_BYTES = 24;

export const cryptoRandomSource: RandomSource = {
  id: (): string => randomUUID(),
  secret: (): string => randomBytes(SECRET_BYTES).toString('base64url'),
};
