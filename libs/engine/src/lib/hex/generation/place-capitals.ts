import { requirePresent } from '../../core/engine-error';
import type { Hex } from '../hex';
import { HEX_DIRECTIONS, hexId, reflectHex, rotateHexBy } from '../hex';
import type { MapDraft, PlacedCapital } from './map-draft';
import { pickSeeded } from './map-draft';

const ROTATIONS = Array.from(
  { length: HEX_DIRECTIONS.length },
  (_unused, sixths): number => sixths,
);
const MIRRORINGS = [false, true] as const;

/**
 * The ring of capitals for the player count, turned and mirrored by the seed. Turning and mirroring keep
 * every distance, so neighbouring capitals stay the same number of moves apart.
 */
export const placeCapitals = (draft: MapDraft): MapDraft => {
  const ring = requirePresent(
    draft.rules.capitalRings[draft.playerCount],
    `a capital ring for ${draft.playerCount} players`,
  );
  const sixths = pickSeeded(draft, ROTATIONS, 'capitals', 'rotation');
  const mirrored = pickSeeded(draft, MIRRORINGS, 'capitals', 'mirror');
  return {
    ...draft,
    capitals: ring.map(
      (offset, index): PlacedCapital =>
        capitalAt(index + 1, rotateHexBy(mirror(offset, mirrored), sixths)),
    ),
  };
};

function mirror(hex: Hex, mirrored: boolean): Hex {
  return mirrored ? reflectHex(hex) : hex;
}

function capitalAt(seat: number, hex: Hex): PlacedCapital {
  return { seat, hex, id: hexId(hex) };
}
