import { EngineContractError } from '../core/engine-error';
import { toPlayerId } from '../core/ids';
import { NO_UNITS } from '../core/unit-counts';
import {
  createTestState,
  P1,
  P2,
  P3,
  units,
  zoneId,
} from '../../testing/test-state';
import {
  addUnitsToZone,
  findPlayer,
  findZone,
  seatOfPlayer,
  setPlayerUnitsInZone,
  unitsOfPlayerInZone,
  updatePlayer,
  updateZone,
} from './match-state-queries';

const A2 = zoneId('A2');

describe('match state queries', () => {
  const state = createTestState({
    zones: { A2: { owner: P1, units: { line: 2 } } },
  });

  it('finds players and zones', () => {
    expect(findPlayer(state, P2).seat).toBe(2);
    expect(seatOfPlayer(state, P3)).toBe(3);
    expect(findZone(state, A2).ownerId).toBe(P1);
  });

  it('throws for unknown players and zones', () => {
    expect(() => findPlayer(state, toPlayerId('ghost'))).toThrow(
      new EngineContractError('Missing player ghost'),
    );
    expect(() => findZone(state, zoneId('D4'))).toThrow(
      new EngineContractError('Missing zone D4'),
    );
  });

  it('reads a player’s units in a zone, or none', () => {
    expect(unitsOfPlayerInZone(findZone(state, A2), P1)).toEqual(
      units({ line: 2 }),
    );
    expect(unitsOfPlayerInZone(findZone(state, A2), P2)).toEqual(NO_UNITS);
  });

  it('updates only the targeted player and zone', () => {
    const updated = updateZone(
      updatePlayer(state, P2, (player) => ({ ...player, supply: 1 })),
      A2,
      (zone) => ({ ...zone, ownerId: P2 }),
    );
    expect(updated.players.map((player) => player.supply)).toEqual([
      6, 1, 6, 6,
    ]);
    expect(updated.zones.filter((zone) => zone.ownerId !== null)).toEqual([
      { ...findZone(state, A2), ownerId: P2 },
    ]);
    expect(state.players[1]?.supply).toBe(6);
  });

  it('adds units to an existing army and creates armies kept in seat order', () => {
    const withP3 = addUnitsToZone(state, A2, P3, units({ cavalry: 1 }));
    const withBoth = addUnitsToZone(
      addUnitsToZone(withP3, A2, P2, units({ line: 1 })),
      A2,
      P1,
      units({ line: 1 }),
    );
    expect(findZone(withBoth, A2).armies).toEqual([
      { playerId: P1, units: units({ line: 3 }) },
      { playerId: P2, units: units({ line: 1 }) },
      { playerId: P3, units: units({ cavalry: 1 }) },
    ]);
  });

  it('replaces an army and removes it when it has no units left', () => {
    expect(
      findZone(
        setPlayerUnitsInZone(state, A2, P1, units({ skirmishers: 4 })),
        A2,
      ).armies,
    ).toEqual([{ playerId: P1, units: units({ skirmishers: 4 }) }]);
    const emptied = setPlayerUnitsInZone(state, A2, P1, NO_UNITS);
    expect(findZone(emptied, A2)).toEqual({
      zoneId: A2,
      ownerId: P1,
      armies: [],
    });
  });
});
