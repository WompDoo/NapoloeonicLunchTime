import type { SpyReport } from '@lunch-campaign/player-view';
import {
  createUnitCounts,
  KUTUZOV_PLAYER,
  spiedWeekView,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/player-view/testing';
import { renderSpyReport } from './render-spy-report';

function report(overrides: Partial<SpyReport>): SpyReport {
  return {
    playerId: toPlayerId('p1'),
    turnNumber: 1,
    zoneId: toZoneId('B3'),
    ownerId: toPlayerId('p2'),
    units: createUnitCounts({}),
    unidentified: 0,
    ...overrides,
  };
}

describe('renderSpyReport', () => {
  it('reports a zone spied on during the scripted week', () => {
    expect(
      spiedWeekView(2, KUTUZOV_PLAYER)
        .spyReports.map(renderSpyReport)
        .join('\n'),
    ).toMatchSnapshot();
  });

  it.each([
    {
      name: "Moore's skirmishers as unidentified",
      overrides: { units: createUnitCounts({ line: 3 }), unidentified: 2 },
      text: 'Spy report on B3, held by p2: 3L, 2 unidentified',
    },
    {
      name: 'an army of only unidentified units',
      overrides: { unidentified: 2 },
      text: 'Spy report on B3, held by p2: 2 unidentified',
    },
    {
      name: 'an army by type',
      overrides: { units: createUnitCounts({ cavalry: 2, artillery: 1 }) },
      text: 'Spy report on B3, held by p2: 2C 1A',
    },
    {
      name: 'an empty neutral zone',
      overrides: { ownerId: null },
      text: 'Spy report on B3, neutral: no units',
    },
  ])('reports $name', ({ overrides, text }) => {
    expect(renderSpyReport(report(overrides))).toBe(text);
  });
});
