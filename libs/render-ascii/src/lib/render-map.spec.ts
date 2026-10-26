import type { PlayerView, ZoneView } from '@lunch-campaign/player-view';
import {
  NAPOLEON_PLAYER,
  spiedWeekView,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/player-view/testing';
import { renderMap } from './render-map';

const THURSDAY = spiedWeekView(3, NAPOLEON_PLAYER);

function zone(
  zoneId: string,
  row: number,
  column: number,
  overrides: Partial<ZoneView> = {},
): ZoneView {
  return {
    zoneId: toZoneId(zoneId),
    kind: 'plain',
    position: { row, column },
    ownerId: null,
    army: { kind: 'count', count: 0 },
    ...overrides,
  };
}

function link(from: string, to: string): PlayerView['connections'][number] {
  return [toZoneId(from), toZoneId(to)];
}

describe('renderMap', () => {
  it('draws the v0 map as the viewer sees it', () => {
    expect(renderMap(THURSDAY).join('\n')).toMatchSnapshot();
  });

  it('draws question marks for other players’ armies in fog', () => {
    const foggy: PlayerView = {
      ...THURSDAY,
      unitCountsVisible: false,
      zones: THURSDAY.zones.map((zoneView) =>
        zoneView.ownerId === NAPOLEON_PLAYER
          ? zoneView
          : { ...zoneView, army: { kind: 'hidden' } },
      ),
    };
    expect(renderMap(foggy).join('\n')).toMatchSnapshot();
  });

  it('leaves gaps for empty grid positions and lists links it cannot draw', () => {
    const sparse: PlayerView = {
      ...THURSDAY,
      zones: [
        zone('N1', 1, 1, { kind: 'capital', ownerId: NAPOLEON_PLAYER }),
        zone('N3', 1, 3),
        zone('S2', 2, 2, { kind: 'city' }),
      ],
      connections: [link('N1', 'S2'), link('N3', 'S2')],
    };
    expect(renderMap(sparse)).toEqual([
      '+---------+                 +---------+',
      '| N1 * P1 |                 | N3   -- |',
      '| 0 units |                 | 0 units |',
      '+---------+                 +---------+',
      '              +---------+',
      '              | S2 o -- |',
      '              | 0 units |',
      '              +---------+',
      'Also connected: N1-S2, N3-S2',
      '* capital, o city. P1-P4: seats (see Players).',
      'Armies: L line, C cavalry, S skirmishers, A artillery.',
    ]);
  });

  it.each([
    {
      name: 'an owner who is not a player',
      zones: [zone('N1', 1, 1, { ownerId: toPlayerId('ghost') })],
      connections: [],
      message: 'missing player ghost',
    },
    {
      name: 'a connection to a zone not in the view',
      zones: [zone('N1', 1, 1)],
      connections: [link('N1', 'N9')],
      message: 'missing zone N9',
    },
  ])('refuses $name', ({ zones, connections, message }) => {
    const malformed: PlayerView = { ...THURSDAY, zones, connections };
    expect(() => renderMap(malformed)).toThrow(message);
  });
});
