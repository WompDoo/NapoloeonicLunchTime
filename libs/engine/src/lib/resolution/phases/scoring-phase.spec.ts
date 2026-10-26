import type { MatchConfig } from '../../config/match-config';
import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { createTestState, P1, P2, P3, P4 } from '../../../testing/test-state';
import { applyScoringPhase } from './scoring-phase';

describe('scoring phase', () => {
  const zones = {
    A1: { owner: P1, units: { line: 1 } },
    A2: { owner: P1, units: { line: 1 } },
    B2: { owner: P1 },
    A3: { owner: P2 },
  };

  it('does nothing on nights without scoring', () => {
    const state = createTestState({ turnNumber: 1, zones });
    const resolution = startResolution(state);
    expect(
      applyScoringPhase(resolution, createTestContext(state, [], TEST_CONFIG)),
    ).toEqual(resolution);
  });

  it('awards city points for every city held, capitals included, empty or not', () => {
    const state = createTestState({
      turnNumber: 3,
      players: [{ score: 2 }, {}, {}, {}],
      zones,
    });
    const result = applyScoringPhase(
      startResolution(state),
      createTestContext(state, [], TEST_CONFIG),
    );

    expect(result.match.players.map((player) => player.score)).toEqual([
      2 + 2 * 3,
      3,
      0,
      0,
    ]);
    expect(result.replayLog).toEqual([
      {
        type: 'PointsAwarded',
        turnNumber: 3,
        playerId: P1,
        source: 'cityPoints',
        citiesHeld: 2,
        points: 6,
      },
      {
        type: 'PointsAwarded',
        turnNumber: 3,
        playerId: P2,
        source: 'cityPoints',
        citiesHeld: 1,
        points: 3,
      },
      {
        type: 'PointsAwarded',
        turnNumber: 3,
        playerId: P3,
        source: 'cityPoints',
        citiesHeld: 0,
        points: 0,
      },
      {
        type: 'PointsAwarded',
        turnNumber: 3,
        playerId: P4,
        source: 'cityPoints',
        citiesHeld: 0,
        points: 0,
      },
    ]);
  });

  it('applies every scoring rule of the night in order', () => {
    const config: MatchConfig = {
      ...TEST_CONFIG,
      schedule: [
        {
          label: 'Double',
          scoring: [
            { kind: 'cityPoints', pointsPerCity: 1 },
            { kind: 'cityPoints', pointsPerCity: 10 },
          ],
        },
      ],
    };
    const state = createTestState({ zones });
    const result = applyScoringPhase(
      startResolution(state),
      createTestContext(state, [], config),
    );
    expect(result.match.players.map((player) => player.score)).toEqual([
      22, 11, 0, 0,
    ]);
  });
});
