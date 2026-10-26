/** The resolution phases, in the order they run. The order is a game rule. */
export const RESOLUTION_ORDER = [
  'purchase',
  'movement',
  'reinforcement',
  'bombardment',
  'combat',
  'capture',
  'production',
  'scoring',
  'cleanup',
] as const;

export type ResolutionPhase = (typeof RESOLUTION_ORDER)[number];
