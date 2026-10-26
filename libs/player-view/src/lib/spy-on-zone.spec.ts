import { DEFAULT_MATCH_CONFIG, FOG, NAPOLEON } from '@lunch-campaign/content';
import type { ScenarioOptions } from '@lunch-campaign/content/testing';
import { createV0State, P1, P2 } from '@lunch-campaign/content/testing';
import type { MatchState, UnitCounts } from '@lunch-campaign/engine';
import {
  createEventModifier,
  createUnitCounts,
  findPlayer,
  toZoneId,
} from '@lunch-campaign/engine';
import type { SpyOutcome } from './spy-on-zone';
import { spyOnZone } from './spy-on-zone';

const ENEMY_ZONE: ScenarioOptions['zones'] = {
  B2: { owner: P2, units: { line: 3, skirmishers: 2 } },
};

function stateWith(options: ScenarioOptions): MatchState {
  return createV0State({ zones: ENEMY_ZONE, ...options });
}

function spyFromP1(state: MatchState, zone: string): SpyOutcome {
  return spyOnZone(state, DEFAULT_MATCH_CONFIG, P1, toZoneId(zone));
}

function reported(
  outcome: SpyOutcome,
): Extract<SpyOutcome, { kind: 'reported' }> {
  if (outcome.kind === 'rejected') {
    throw new Error(`Expected a report, got ${outcome.reason}`);
  }
  return outcome;
}

describe('spyOnZone', () => {
  it.each([
    {
      name: 'after Friday',
      options: { turnNumber: 6 },
      zone: 'B2',
      reason: 'matchFinished',
    },
    {
      name: 'from an eliminated player, before anything else',
      options: {
        players: [{ eliminated: true }],
        zones: { B2: { owner: P1 } },
      },
      zone: 'B2',
      reason: 'playerEliminated',
    },
    {
      name: 'on a zone off the map',
      options: {},
      zone: 'Z9',
      reason: 'unknownZone',
    },
    {
      name: 'on your own zone',
      options: { zones: { B2: { owner: P1, units: { line: 1 } } } },
      zone: 'B2',
      reason: 'ownZone',
    },
    {
      name: 'in Fog',
      options: { extraModifiers: [createEventModifier(FOG, 1)] },
      zone: 'B2',
      reason: 'spiesUnavailable',
    },
    {
      name: 'without enough supply',
      options: { players: [{ supply: 1 }] },
      zone: 'B2',
      reason: 'insufficientSupply',
    },
  ])('rejects a spy $name', ({ options, zone, reason }) => {
    expect(spyFromP1(stateWith(options), zone)).toEqual({
      kind: 'rejected',
      reason,
    });
  });

  it.each<{
    readonly name: string;
    readonly options: ScenarioOptions;
    readonly zone: string;
    readonly owner: string | null;
    readonly units: Partial<UnitCounts>;
    readonly unidentified: number;
  }>([
    {
      name: "Moore's skirmishers as unidentified",
      options: {},
      zone: 'B2',
      owner: P2,
      units: { line: 3 },
      unidentified: 2,
    },
    {
      name: "another commander's skirmishers by type",
      options: { players: [{}, { commanderId: NAPOLEON }] },
      zone: 'B2',
      owner: P2,
      units: { line: 3, skirmishers: 2 },
      unidentified: 0,
    },
    {
      name: 'an empty enemy zone',
      options: { zones: { B2: { owner: P2 } } },
      zone: 'B2',
      owner: P2,
      units: {},
      unidentified: 0,
    },
    {
      name: 'an empty neutral zone',
      options: {},
      zone: 'C2',
      owner: null,
      units: {},
      unidentified: 0,
    },
  ])('reports $name', ({ options, zone, owner, units, unidentified }) => {
    expect(reported(spyFromP1(stateWith(options), zone)).report).toEqual({
      playerId: P1,
      turnNumber: 1,
      zoneId: zone,
      ownerId: owner,
      units: createUnitCounts(units),
      unidentified,
    });
  });

  it.each([
    { supply: 7, left: 5 },
    { supply: 2, left: 0 },
  ])('charges the spy cost at once: $supply → $left', ({ supply, left }) => {
    const state = stateWith({ players: [{ supply }] });
    const after = reported(spyFromP1(state, 'B2')).state;
    expect(findPlayer(after, P1).supply).toBe(left);
    expect(findPlayer(after, P2)).toEqual(findPlayer(state, P2));
    expect(after.zones).toEqual(state.zones);
  });

  it('leaves the input state untouched', () => {
    const state = stateWith({ players: [{ supply: 7 }] });
    const before = structuredClone(state);
    spyFromP1(state, 'B2');
    expect(state).toEqual(before);
  });
});
