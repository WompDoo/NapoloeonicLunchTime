import { TEST_CONFIG } from '../../../testing/test-config';
import {
  createTestContext,
  startResolution,
} from '../../../testing/test-context';
import { eventsOfType } from '../../../testing/replay-queries';
import {
  abilityOrder,
  createTestState,
  ownedZoneTarget,
  P1,
  P2,
  upgradeOrder,
} from '../../../testing/test-state';
import { findPlayer } from '../../state/match-state-queries';
import { applyPurchasePhase } from './purchase-phase';

describe('purchase phase with upgrades and abilities', () => {
  const state = createTestState({
    turnNumber: 2,
    players: [{ supply: 12 }, { commanderId: 'blight' }, {}, {}],
    zones: { A1: { owner: P1 }, A3: { owner: P2 } },
  });
  const result = applyPurchasePhase(
    startResolution(state),
    createTestContext(
      state,
      [
        {
          playerId: P1,
          orders: [upgradeOrder('drill'), upgradeOrder('retreat')],
        },
        { playerId: P2, orders: [abilityOrder(ownedZoneTarget('A3'))] },
      ],
      TEST_CONFIG,
    ),
  );

  it('pays for upgrades, records them and puts them in play', () => {
    expect(findPlayer(result.match, P1)).toMatchObject({
      supply: 0,
      upgrades: ['drill', 'retreat'],
    });
    expect(result.match.modifiers.map((modifier) => modifier.id)).toContain(
      'upgrade:retreat:p1',
    );
    expect(eventsOfType(result.replayLog, 'UpgradeBought')).toEqual([
      {
        type: 'UpgradeBought',
        turnNumber: 2,
        playerId: P1,
        upgradeId: 'drill',
        cost: 6,
      },
      {
        type: 'UpgradeBought',
        turnNumber: 2,
        playerId: P1,
        upgradeId: 'retreat',
        cost: 6,
      },
    ]);
  });

  it('uses up the ability, reveals it and puts it in play from tonight', () => {
    expect(findPlayer(result.match, P2).abilityUsed).toBe(true);
    expect(result.match.modifiers).toContainEqual(
      expect.objectContaining({
        id: 'ability:blight:p2:2',
        scope: { kind: 'global' },
        duration: { kind: 'nights', fromTurn: 2, untilTurn: 3 },
        target: ownedZoneTarget('A3'),
      }),
    );
    expect(eventsOfType(result.replayLog, 'AbilityUsed')).toEqual([
      {
        type: 'AbilityUsed',
        turnNumber: 2,
        playerId: P2,
        commanderId: 'blight',
        abilityId: 'scorch',
        target: ownedZoneTarget('A3'),
      },
    ]);
  });
});
