import type { MapDefinition } from '../lib/map/map-definition';
import { parseMapDefinition } from '../lib/map/parse-map-definition';

/**
 * A 3×3 test grid with orthogonal adjacency, deliberately independent of `libs/content`
 * so engine tests never break when playtest tuning changes.
 *
 *        1        2        3
 *   A [CAP-1]  [plain]  [CAP-2]
 *   B [plain]  [CITY ]  [plain]
 *   C [CAP-3]  [plain]  [CAP-4]
 */
export const TEST_MAP_JSON = {
  id: 'test-grid-3x3',
  zones: [
    { id: 'A1', kind: 'capital', row: 1, column: 1 },
    { id: 'A2', kind: 'plain', row: 1, column: 2 },
    { id: 'A3', kind: 'capital', row: 1, column: 3 },
    { id: 'B1', kind: 'plain', row: 2, column: 1 },
    { id: 'B2', kind: 'city', row: 2, column: 2 },
    { id: 'B3', kind: 'plain', row: 2, column: 3 },
    { id: 'C1', kind: 'capital', row: 3, column: 1 },
    { id: 'C2', kind: 'plain', row: 3, column: 2 },
    { id: 'C3', kind: 'capital', row: 3, column: 3 },
  ],
  connections: [
    ['A1', 'A2'],
    ['A2', 'A3'],
    ['B1', 'B2'],
    ['B2', 'B3'],
    ['C1', 'C2'],
    ['C2', 'C3'],
    ['A1', 'B1'],
    ['B1', 'C1'],
    ['A2', 'B2'],
    ['B2', 'C2'],
    ['A3', 'B3'],
    ['B3', 'C3'],
  ],
  startingCapitals: [
    { seat: 1, zoneId: 'A1' },
    { seat: 2, zoneId: 'A3' },
    { seat: 3, zoneId: 'C1' },
    { seat: 4, zoneId: 'C3' },
  ],
} as const;

export const TEST_MAP: MapDefinition = parseMapDefinition(TEST_MAP_JSON);
