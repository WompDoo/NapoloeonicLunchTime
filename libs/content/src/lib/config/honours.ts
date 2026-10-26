import type { HonourDefinition, HonourRules } from '@lunch-campaign/engine';

export const GRANDE_ARMEE = 'grande-armee';
export const EMPIRE = 'empire';
export const BUTCHERS_BILL = 'butchers-bill';
export const IRON_DISCIPLINE = 'iron-discipline';
export const THE_FOX = 'the-fox';
export const LAST_STAND = 'last-stand';
export const SPYMASTER = 'spymaster';
export const THUNDER_OF_GUNS = 'thunder-of-guns';
export const SADDLE_UP = 'saddle-up';
export const REARGUARD = 'rearguard';
export const FORAGER = 'forager';
export const BLITZ = 'blitz';

/** Every honour a match can award. libs/honours implements one log query per id. */
export const HONOUR_IDS = [
  GRANDE_ARMEE,
  EMPIRE,
  BUTCHERS_BILL,
  IRON_DISCIPLINE,
  THE_FOX,
  LAST_STAND,
  SPYMASTER,
  THUNDER_OF_GUNS,
  SADDLE_UP,
  REARGUARD,
  FORAGER,
  BLITZ,
] as const;

export type HonourId = (typeof HONOUR_IDS)[number];

const POINTS_PER_HONOUR = 3;
const HONOURS_PER_MATCH = 3;

export const DEFAULT_HONOUR_RULES: HonourRules = {
  pool: HONOUR_IDS.map(
    (id): HonourDefinition => ({ id, points: POINTS_PER_HONOUR }),
  ),
  drawnPerMatch: HONOURS_PER_MATCH,
};
