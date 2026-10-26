import { hashSeedLabel, seededFraction, seededIndex } from './random';

describe('seeded randomness', () => {
  it('is deterministic per label', () => {
    expect(seededFraction('match-1:event:3')).toBe(
      seededFraction('match-1:event:3'),
    );
    expect(hashSeedLabel('abc')).toBe(hashSeedLabel('abc'));
  });

  it('gives different labels different draws', () => {
    const draws = new Set(
      ['a', 'b', 'c', 'd', 'e'].map((label) => seededFraction(`seed:${label}`)),
    );
    expect(draws.size).toBe(5);
  });

  it('stays in [0, 1) and indexes stay in range', () => {
    const labels = Array.from({ length: 200 }, (_, index) => `label-${index}`);
    expect(
      labels.every(
        (label) => seededFraction(label) >= 0 && seededFraction(label) < 1,
      ),
    ).toBe(true);
    expect(
      labels.every(
        (label) => seededIndex(label, 5) >= 0 && seededIndex(label, 5) < 5,
      ),
    ).toBe(true);
    expect(new Set(labels.map((label) => seededIndex(label, 5))).size).toBe(5);
  });

  it('never changes its algorithm silently (stored matches depend on it)', () => {
    expect(hashSeedLabel('')).toBe(0x811c9dc5);
    expect(seededIndex('lunch-campaign:event:3', 1000)).toMatchInlineSnapshot(
      `305`,
    );
  });
});
