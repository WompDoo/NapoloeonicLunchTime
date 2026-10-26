/*
 * Seeded randomness for draws (events, honours). Each draw hashes a labelled seed such as
 * "<matchSeed>:event:3", so draws are independent of each other and of call order.
 * FNV-1a hashes the label, murmur3's fmix32 finaliser spreads it (without it, labels that differ in one
 * character, such as "week-1" and "week-2", give correlated draws), and one mulberry32 step turns it into a
 * fraction.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_FIRST_SHIFT = 15;
const MULBERRY_SECOND_SHIFT = 7;
const MULBERRY_THIRD_SHIFT = 14;
const MULBERRY_ODD_MULTIPLIER = 61;
const UINT32_RANGE = 0x100000000;
const FMIX_FIRST_SHIFT = 16;
const FMIX_SECOND_SHIFT = 13;
const FMIX_FIRST_MULTIPLIER = 0x85ebca6b;
const FMIX_SECOND_MULTIPLIER = 0xc2b2ae35;

export function hashSeedLabel(label: string): number {
  return Array.from(label).reduce(
    (hash, character): number =>
      Math.imul(hash ^ character.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET_BASIS,
  );
}

/** murmur3's fmix32: every input bit affects every output bit. */
export function mixHash(hash: number): number {
  const first = Math.imul(
    hash ^ (hash >>> FMIX_FIRST_SHIFT),
    FMIX_FIRST_MULTIPLIER,
  );
  const second = Math.imul(
    first ^ (first >>> FMIX_SECOND_SHIFT),
    FMIX_SECOND_MULTIPLIER,
  );
  return (second ^ (second >>> FMIX_FIRST_SHIFT)) >>> 0;
}

/** A deterministic fraction in [0, 1) for the label. */
export function seededFraction(label: string): number {
  const state = (mixHash(hashSeedLabel(label)) + MULBERRY_INCREMENT) >>> 0;
  const first = Math.imul(state ^ (state >>> MULBERRY_FIRST_SHIFT), state | 1);
  const second =
    first ^
    (first +
      Math.imul(
        first ^ (first >>> MULBERRY_SECOND_SHIFT),
        first | MULBERRY_ODD_MULTIPLIER,
      ));
  return ((second ^ (second >>> MULBERRY_THIRD_SHIFT)) >>> 0) / UINT32_RANGE;
}

/** A deterministic index in [0, size) for the label. */
export function seededIndex(label: string, size: number): number {
  return Math.floor(seededFraction(label) * size);
}
