import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { createTestState, P1, P2, zoneId } from '../../../testing/test-state';
import { findZone } from '../../state/match-state-queries';
import { applyCapturePhase } from './capture-phase';

describe('capture phase', () => {
  const state = createTestState({
    zones: {
      A1: { owner: P1, units: { line: 1 } },
      A2: { armies: [{ playerId: P1, units: { cavalry: 1 } }] },
      A3: { owner: P2, armies: [{ playerId: P1, units: { line: 2 } }] },
      B1: { owner: P2 },
    },
  });
  const result = applyCapturePhase(
    startResolution(state),
    createTestContext(state, [], TEST_CONFIG),
  );
  const ownerOf = (zone: string): string | null =>
    findZone(result.match, zoneId(zone)).ownerId;

  it.each([
    { zone: 'A1', owner: P1, why: 'an own army keeps an own zone' },
    { zone: 'A2', owner: P1, why: 'a lone army captures a neutral zone' },
    { zone: 'A3', owner: P1, why: 'a lone army captures an enemy zone' },
    { zone: 'B1', owner: P2, why: 'an empty zone keeps its owner' },
    { zone: 'B2', owner: null, why: 'an empty neutral zone stays neutral' },
  ])('$why ($zone)', ({ zone, owner }) => {
    expect(ownerOf(zone)).toBe(owner);
  });

  it('logs only real changes of owner', () => {
    expect(result.replayLog).toEqual([
      {
        type: 'ZoneCaptured',
        turnNumber: 1,
        zoneId: 'A2',
        previousOwnerId: null,
        newOwnerId: P1,
      },
      {
        type: 'ZoneCaptured',
        turnNumber: 1,
        zoneId: 'A3',
        previousOwnerId: P2,
        newOwnerId: P1,
      },
    ]);
  });
});
