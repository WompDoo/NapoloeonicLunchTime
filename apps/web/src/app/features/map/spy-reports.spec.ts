import { TestBed } from '@angular/core/testing';
import { createUnitCounts, toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { textOf } from '../../../testing/dom';
import {
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  weekMatch,
} from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { SpyReports } from './spy-reports';

describe('SpyReports', () => {
  const roster = (): ReturnType<typeof rosterOf> =>
    rosterOf(weekMatch(0), TestBed.inject(Translator));

  it('says how to send a spy when none went out today', async () => {
    const fixture = await render(SpyReports, { reports: [], roster: roster() });
    expect(textOf(fixture)).toContain('No spies sent today.');
  });

  it('lists today’s reports, with units the spy could not identify', async () => {
    const fixture = await render(SpyReports, {
      reports: [
        {
          playerId: NAPOLEON_PLAYER,
          turnNumber: 1,
          zoneId: toZoneId('A4'),
          ownerId: WELLINGTON_PLAYER,
          units: createUnitCounts({ line: 3 }),
          unidentified: 2,
        },
        {
          playerId: NAPOLEON_PLAYER,
          turnNumber: 1,
          zoneId: toZoneId('B2'),
          ownerId: null,
          units: createUnitCounts({}),
          unidentified: 0,
        },
      ],
      roster: roster(),
    });
    expect(textOf(fixture)).toContain('A4 (Bo): 3 line · 2 unidentified');
    expect(textOf(fixture)).toContain('B2 (Neutral): no units');
  });
});
