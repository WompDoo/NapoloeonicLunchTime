import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type { Order } from '@lunch-campaign/engine';
import {
  createInitialMatchState,
  createUnitCounts,
  toZoneId,
} from '@lunch-campaign/engine';
import { NAPOLEON_PLAYER, WEEK_SEATING } from '@lunch-campaign/honours/testing';
import { group, parseOrder, parseOrdersFile } from './order-notation';

const STATE = createInitialMatchState(
  DEFAULT_MATCH_CONFIG,
  WEEK_SEATING,
  'notation',
);

describe('order notation', () => {
  it.each<{ readonly text: string; readonly order: Order }>([
    {
      text: 'recruit 2 line',
      order: { kind: 'recruit', count: 2, unitType: 'line' },
    },
    {
      text: 'move A1 -> B2 2L 1C',
      order: {
        kind: 'move',
        fromZoneId: toZoneId('A1'),
        viaZoneIds: [],
        toZoneId: toZoneId('B2'),
        units: createUnitCounts({ line: 2, cavalry: 1 }),
      },
    },
    {
      text: '  move D4->C4  ->C3   2C 1C ',
      order: {
        kind: 'move',
        fromZoneId: toZoneId('D4'),
        viaZoneIds: [toZoneId('C4')],
        toZoneId: toZoneId('C3'),
        units: createUnitCounts({ cavalry: 3 }),
      },
    },
    {
      text: 'support A2 -> B2 1',
      order: {
        kind: 'support',
        fromZoneId: toZoneId('A2'),
        targetZoneId: toZoneId('B2'),
        count: 1,
      },
    },
    {
      text: 'upgrade squares',
      order: { kind: 'buyUpgrade', upgradeId: 'squares' },
    },
    {
      text: 'ability',
      order: { kind: 'useAbility', target: { kind: 'none' } },
    },
    {
      text: 'ability B2',
      order: {
        kind: 'useAbility',
        target: { kind: 'ownedZone', zoneId: toZoneId('B2') },
      },
    },
    {
      text: 'ability A2 -> B2 2L 1S',
      order: {
        kind: 'useAbility',
        target: {
          kind: 'reinforcement',
          fromZoneId: toZoneId('A2'),
          toZoneId: toZoneId('B2'),
          units: createUnitCounts({ line: 2, skirmishers: 1 }),
        },
      },
    },
  ])('reads "$text"', ({ text, order }) => {
    expect(parseOrder(text)).toEqual(order);
  });

  it.each([
    { text: 'charge B2', problem: 'expected one of: recruit 2 line | move' },
    { text: 'move A1 B2 2L', problem: 'expected one of' },
    { text: 'move A1 -> B2', problem: 'expected one of' },
    { text: 'recruit 0 line', problem: 'expected one of' },
    {
      text: 'recruit 2 hussars',
      problem:
        'the unit type must be one of: line, cavalry, skirmishers, artillery',
    },
    {
      text: 'move A1 -> B2 2X',
      problem: 'unknown unit letter "X"; letters: L, C, S, A',
    },
  ])('refuses "$text"', ({ text, problem }) => {
    expect(() => parseOrder(text)).toThrow(problem);
  });

  it('reads a group the pattern captured and refuses one it did not', () => {
    const match = /(?<zone>B2)/.exec('B2');
    expect(match).not.toBeNull();
    const captured = match as RegExpExecArray;
    expect(group(captured, 'zone')).toBe('B2');
    expect(() => group(captured, 'unit')).toThrow(
      'Order pattern has no group "unit"',
    );
  });

  describe('orders files', () => {
    it('reads each player’s orders', () => {
      const text = JSON.stringify({
        'napoleon-player': ['recruit 1 line', 'ability'],
        'murat-player': [],
      });
      expect(parseOrdersFile(text, 'monday.json', STATE)).toEqual([
        {
          playerId: NAPOLEON_PLAYER,
          orders: [
            { kind: 'recruit', count: 1, unitType: 'line' },
            { kind: 'useAbility', target: { kind: 'none' } },
          ],
        },
        { playerId: 'murat-player', orders: [] },
      ]);
    });

    it.each([
      {
        name: 'invalid JSON',
        text: '{',
        message: 'monday.json is not valid JSON',
      },
      { name: 'a list', text: '7', message: 'monday.json must be an object' },
      {
        name: 'a player not in the match',
        text: '{"ney": []}',
        message: 'monday.json: ney is not in this match',
      },
      {
        name: 'orders that are not a list',
        text: '{"napoleon-player": "recruit 1 line"}',
        message: 'monday.json.napoleon-player must be an array',
      },
      {
        name: 'an order that is not text',
        text: '{"napoleon-player": [3]}',
        message: 'monday.json.napoleon-player[0] must be a non-empty string',
      },
      {
        name: 'an order it cannot read, with where it is',
        text: '{"napoleon-player": ["recruit 1 line", "charge"]}',
        message: 'monday.json.napoleon-player[1] "charge": expected one of',
      },
    ])('refuses $name', ({ text, message }) => {
      expect(() => parseOrdersFile(text, 'monday.json', STATE)).toThrow(
        message,
      );
    });
  });
});
