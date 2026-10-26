import type {
  BattleOutcome,
  BattleRole,
  BattleSide,
  PlayerId,
  PlayerSeating,
  StrengthBonus,
  UnitCounts,
} from '@lunch-campaign/engine';
import {
  createInitialMatchState,
  createUnitCounts,
  isMatchFinished,
  resolveBattle,
  resolveTurn,
  toPlayerId,
  UNIT_TYPES,
} from '@lunch-campaign/engine';
import {
  DEFAULT_COMBAT_RULES,
  DEFAULT_MATCH_CONFIG,
} from './default-match-config';
import { SIR_JOHN_MOORE } from '../modifiers/commanders';

const CAVALRY_PLAYER = toPlayerId('cavalry');
const LINE_PLAYER = toPlayerId('line');

const BONUSES_BY_ROLE: Readonly<Record<BattleRole, readonly StrengthBonus[]>> =
  {
    defender: [
      { source: 'defender', value: DEFAULT_COMBAT_RULES.defenderBonus },
    ],
    attacker: [],
  };

const MUTUAL_DESTRUCTION: BattleOutcome = { kind: 'mutualDestruction' };
const CAVALRY_WINS: BattleOutcome = {
  kind: 'victory',
  winnerId: CAVALRY_PLAYER,
};
const LINE_WINS: BattleOutcome = { kind: 'victory', winnerId: LINE_PLAYER };

function side(
  playerId: PlayerId,
  role: BattleRole,
  counts: Partial<UnitCounts>,
): BattleSide {
  return {
    playerId,
    role,
    units: createUnitCounts(counts),
    profile: DEFAULT_COMBAT_RULES,
    bonuses: BONUSES_BY_ROLE[role],
  };
}

interface CountersCase {
  readonly cavalry: number;
  readonly lineRole: BattleRole;
  readonly outcome: BattleOutcome;
  readonly note: string;
}

describe('default match config', () => {
  it('matches the spec’s default tuning values', () => {
    expect(DEFAULT_MATCH_CONFIG.economy).toEqual({
      startingSupply: 6,
      productionByZoneKind: { plain: 1, city: 2, capital: 3 },
      recruitCost: { line: 2, cavalry: 3, skirmishers: 2, artillery: 4 },
      upgradeCost: 6,
    });
    expect(DEFAULT_MATCH_CONFIG.startingUnits).toEqual({
      line: 3,
      cavalry: 2,
      skirmishers: 2,
      artillery: 1,
    });
    expect(DEFAULT_MATCH_CONFIG.orders.maxMoveOrdersPerTurn).toBe(5);
    expect(DEFAULT_COMBAT_RULES.baseStrength).toEqual({
      line: 1,
      cavalry: 1,
      skirmishers: 1,
      artillery: 0.5,
    });
    expect(DEFAULT_COMBAT_RULES.defenderBonus).toBe(0.25);
    expect(DEFAULT_COMBAT_RULES.winnerLossRatio).toBe(0.5);
  });

  it('uses the spec’s offense matrix and neutral vulnerabilities', () => {
    expect(DEFAULT_COMBAT_RULES.offense).toEqual({
      line: { line: 1, cavalry: 2, skirmishers: 1, artillery: 1 },
      cavalry: { line: 1, cavalry: 1, skirmishers: 2, artillery: 1 },
      skirmishers: { line: 2, cavalry: 1, skirmishers: 1, artillery: 1 },
      artillery: { line: 1, cavalry: 1, skirmishers: 1, artillery: 1 },
    });
    expect(
      UNIT_TYPES.flatMap((target) =>
        UNIT_TYPES.map(
          (attacker) => DEFAULT_COMBAT_RULES.vulnerability[target][attacker],
        ),
      ),
    ).toEqual(Array(16).fill(1));
  });

  it('offers 12 honours worth 3 points each, 3 drawn per match', () => {
    expect(DEFAULT_MATCH_CONFIG.honours.pool).toHaveLength(12);
    expect(
      DEFAULT_MATCH_CONFIG.honours.pool.every((honour) => honour.points === 3),
    ).toBe(true);
    expect(DEFAULT_MATCH_CONFIG.honours.drawnPerMatch).toBe(3);
  });

  it('lists every unit type exactly once in the casualty removal order', () => {
    expect(DEFAULT_COMBAT_RULES.casualtyRemovalOrder.flat().toSorted()).toEqual(
      [...UNIT_TYPES].sort(),
    );
  });

  it('schedules one working week: city points Wednesday and double on Friday, the event on Wednesday', () => {
    expect(DEFAULT_MATCH_CONFIG.schedule).toEqual([
      { label: 'Monday', scoring: [], eventActive: false },
      { label: 'Tuesday', scoring: [], eventActive: false },
      {
        label: 'Wednesday',
        scoring: [{ kind: 'cityPoints', pointsPerCity: 3 }],
        eventActive: true,
      },
      { label: 'Thursday', scoring: [], eventActive: false },
      {
        label: 'Friday',
        scoring: [{ kind: 'cityPoints', pointsPerCity: 6 }],
        eventActive: false,
      },
    ]);
  });

  it('matches the spec’s other M2 tuning values', () => {
    expect(DEFAULT_MATCH_CONFIG.economy.upgradeCost).toBe(6);
    expect(DEFAULT_MATCH_CONFIG.bombardment).toEqual({
      hitsPerArtillery: 1,
      volleysPerNight: 1,
    });
    expect(DEFAULT_MATCH_CONFIG.upgrades.map((upgrade) => upgrade.id)).toEqual([
      'orderly-retreat',
      'bayonet-drill',
      'lancers',
    ]);
    expect(
      DEFAULT_MATCH_CONFIG.commanders.map((commander) => commander.id),
    ).toEqual([
      'napoleon',
      'wellington',
      'murat',
      'blucher',
      'kutuzov',
      'moore',
    ]);
    expect(DEFAULT_MATCH_CONFIG.events.map((event) => event.id)).toEqual([
      'mud',
      'fog',
      'typhus',
      'levee-en-masse',
      'armistice',
    ]);
  });

  describe('counters versus numbers with the default tuning', () => {
    it.each<CountersCase>([
      {
        cavalry: 4,
        lineRole: 'attacker',
        outcome: MUTUAL_DESTRUCTION,
        note: 'exactly 2× into the counter in the open: mutual destruction',
      },
      {
        cavalry: 5,
        lineRole: 'attacker',
        outcome: CAVALRY_WINS,
        note: 'more than 2× into the counter in the open wins',
      },
      {
        cavalry: 4,
        lineRole: 'defender',
        outcome: LINE_WINS,
        note: 'spec table: 4 cavalry into 2 defending line, line holds',
      },
      {
        cavalry: 5,
        lineRole: 'defender',
        outcome: LINE_WINS,
        note: 'exactly 2.5× into a defender: the defender wins the tie',
      },
      {
        cavalry: 6,
        lineRole: 'defender',
        outcome: CAVALRY_WINS,
        note: 'spec table: 6 cavalry into 2 defending line, cavalry wins',
      },
    ])('$note', ({ cavalry, lineRole, outcome }) => {
      const result = resolveBattle(
        [
          side(CAVALRY_PLAYER, 'attacker', { cavalry }),
          side(LINE_PLAYER, lineRole, { line: 2 }),
        ],
        DEFAULT_COMBAT_RULES,
      );
      expect(result.outcome).toEqual(outcome);
    });
  });

  it('plays a full quiet week on the v0 map', () => {
    const seating: readonly PlayerSeating[] = ['p1', 'p2', 'p3', 'p4'].map(
      (id, index) => ({
        playerId: toPlayerId(id),
        seat: index + 1,
        commanderId: SIR_JOHN_MOORE,
      }),
    );
    const week = DEFAULT_MATCH_CONFIG.schedule.reduce(
      (state) => resolveTurn(state, [], DEFAULT_MATCH_CONFIG).state,
      createInitialMatchState(DEFAULT_MATCH_CONFIG, seating, 'quiet-week'),
    );
    expect(isMatchFinished(week, DEFAULT_MATCH_CONFIG)).toBe(true);
    // Each capital produces 3 a night, and scores 3 on Wednesday plus 6 on Friday.
    expect(week.players.map((player) => [player.supply, player.score])).toEqual(
      [
        [21, 9],
        [21, 9],
        [21, 9],
        [21, 9],
      ],
    );
  });
});
