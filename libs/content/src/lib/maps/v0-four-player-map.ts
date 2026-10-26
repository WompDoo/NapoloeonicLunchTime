import type { MapDefinition } from '@lunch-campaign/engine';
import { parseMapDefinition } from '@lunch-campaign/engine';
import v0FourPlayerMapJson from './v0-four-player.map.json';

/**
 * The v0 map: a symmetric 4×4 grid with orthogonal adjacency. Capitals sit in the corners; the four
 * central cities start neutral.
 *
 *          1        2        3        4
 *   A  [CAP-1]  [     ]  [     ]  [CAP-2]
 *   B  [     ]  [CITY ]  [CITY ]  [     ]
 *   C  [     ]  [CITY ]  [CITY ]  [     ]
 *   D  [CAP-3]  [     ]  [     ]  [CAP-4]
 */
export const V0_FOUR_PLAYER_MAP: MapDefinition =
  parseMapDefinition(v0FourPlayerMapJson);
