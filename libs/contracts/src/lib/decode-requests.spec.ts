import type { Order } from '@lunch-campaign/engine';
import { createUnitCounts, toZoneId } from '@lunch-campaign/engine';
import {
  decodeCreateMatchRequest,
  decodeJoinMatchRequest,
  decodePickCommanderRequest,
  decodeReadyRequest,
  decodeSpyRequest,
  decodeSubmitOrdersRequest,
  InvalidRequestError,
  PLAYER_NAME_MAX_LENGTH,
} from './decode-requests';

const A1 = toZoneId('A1');
const A2 = toZoneId('A2');
const B2 = toZoneId('B2');

describe('request decoders', () => {
  it('reads the simple requests', () => {
    expect(decodeCreateMatchRequest({ timeZone: 'Europe/Tallinn' })).toEqual({
      timeZone: 'Europe/Tallinn',
    });
    expect(decodeJoinMatchRequest({ name: '  Ney  ' })).toEqual({
      name: 'Ney',
    });
    expect(decodePickCommanderRequest({ commanderId: 'murat' })).toEqual({
      commanderId: 'murat',
    });
    expect(decodeReadyRequest({ ready: false })).toEqual({ ready: false });
    expect(decodeSpyRequest({ zoneId: 'B2' })).toEqual({ zoneId: 'B2' });
  });

  it.each<{
    readonly name: string;
    readonly body: unknown;
    readonly order: Order;
  }>([
    {
      name: 'a recruit',
      body: { kind: 'recruit', unitType: 'line', count: 2 },
      order: { kind: 'recruit', unitType: 'line', count: 2 },
    },
    {
      name: 'a move through a zone',
      body: {
        kind: 'move',
        fromZoneId: 'A1',
        viaZoneIds: ['A2'],
        toZoneId: 'B2',
        units: { cavalry: 2 },
      },
      order: {
        kind: 'move',
        fromZoneId: A1,
        viaZoneIds: [A2],
        toZoneId: B2,
        units: createUnitCounts({ cavalry: 2 }),
      },
    },
    {
      name: 'a move without a via list',
      body: {
        kind: 'move',
        fromZoneId: 'A1',
        toZoneId: 'A2',
        units: { line: 1 },
      },
      order: {
        kind: 'move',
        fromZoneId: A1,
        viaZoneIds: [],
        toZoneId: A2,
        units: createUnitCounts({ line: 1 }),
      },
    },
    {
      name: 'a support',
      body: { kind: 'support', fromZoneId: 'A2', targetZoneId: 'B2', count: 1 },
      order: { kind: 'support', fromZoneId: A2, targetZoneId: B2, count: 1 },
    },
    {
      name: 'an upgrade',
      body: { kind: 'buyUpgrade', upgradeId: 'squares' },
      order: { kind: 'buyUpgrade', upgradeId: 'squares' },
    },
    {
      name: 'an ability without a target',
      body: { kind: 'useAbility', target: { kind: 'none' } },
      order: { kind: 'useAbility', target: { kind: 'none' } },
    },
    {
      name: 'an ability on a zone',
      body: { kind: 'useAbility', target: { kind: 'ownedZone', zoneId: 'B2' } },
      order: { kind: 'useAbility', target: { kind: 'ownedZone', zoneId: B2 } },
    },
    {
      name: 'reinforcements',
      body: {
        kind: 'useAbility',
        target: {
          kind: 'reinforcement',
          fromZoneId: 'A2',
          toZoneId: 'B2',
          units: { line: 2, artillery: 0 },
        },
      },
      order: {
        kind: 'useAbility',
        target: {
          kind: 'reinforcement',
          fromZoneId: A2,
          toZoneId: B2,
          units: createUnitCounts({ line: 2 }),
        },
      },
    },
  ])('reads $name', ({ body, order }) => {
    expect(decodeSubmitOrdersRequest({ orders: [body] })).toEqual({
      orders: [order],
    });
  });

  it.each<{
    readonly name: string;
    readonly decode: () => unknown;
    readonly message: string;
  }>([
    {
      name: 'a body that is not an object',
      decode: (): unknown => decodeSpyRequest('B2'),
      message: 'body must be an object',
    },
    {
      name: 'a missing time zone',
      decode: (): unknown => decodeCreateMatchRequest({}),
      message: 'body.timeZone must be a non-empty string',
    },
    {
      name: 'a blank name',
      decode: (): unknown => decodeJoinMatchRequest({ name: '   ' }),
      message: `body.name must be 1 to ${PLAYER_NAME_MAX_LENGTH} characters`,
    },
    {
      name: 'a name that is too long',
      decode: (): unknown =>
        decodeJoinMatchRequest({
          name: 'N'.repeat(PLAYER_NAME_MAX_LENGTH + 1),
        }),
      message: `body.name must be 1 to ${PLAYER_NAME_MAX_LENGTH} characters`,
    },
    {
      name: 'ready as text',
      decode: (): unknown => decodeReadyRequest({ ready: 'yes' }),
      message: 'body.ready must be true or false',
    },
    {
      name: 'an unknown order kind',
      decode: (): unknown =>
        decodeSubmitOrdersRequest({ orders: [{ kind: 'charge' }] }),
      message:
        'body.orders[0].kind must be one of: recruit, move, support, buyUpgrade, useAbility',
    },
    {
      name: 'a misspelt unit type',
      decode: (): unknown =>
        decodeSubmitOrdersRequest({
          orders: [
            {
              kind: 'move',
              fromZoneId: 'A1',
              toZoneId: 'A2',
              units: { calvary: 2 },
            },
          ],
        }),
      message: 'body.orders[0].units has unknown unit types: calvary',
    },
    {
      name: 'a negative unit count',
      decode: (): unknown =>
        decodeSubmitOrdersRequest({
          orders: [
            {
              kind: 'move',
              fromZoneId: 'A1',
              toZoneId: 'A2',
              units: { line: -1 },
            },
          ],
        }),
      message: 'body.orders[0].units.line must be a whole number, 0 or more',
    },
    {
      name: 'an unknown ability target',
      decode: (): unknown =>
        decodeSubmitOrdersRequest({
          orders: [{ kind: 'useAbility', target: { kind: 'everywhere' } }],
        }),
      message:
        'body.orders[0].target.kind must be one of: none, ownedZone, reinforcement',
    },
    {
      name: 'a via zone that is not text',
      decode: (): unknown =>
        decodeSubmitOrdersRequest({
          orders: [
            {
              kind: 'move',
              fromZoneId: 'A1',
              viaZoneIds: [3],
              toZoneId: 'A2',
              units: { line: 1 },
            },
          ],
        }),
      message: 'body.orders[0].viaZoneIds[0] must be a non-empty string',
    },
  ])('refuses $name', ({ decode, message }) => {
    expect(decode).toThrow(new InvalidRequestError(message));
  });

  it('lets errors that are not decoding failures through', () => {
    const exploding = {
      get orders(): unknown {
        throw new RangeError('boom');
      },
    };
    expect(() => decodeSubmitOrdersRequest(exploding)).toThrow(RangeError);
  });
});
