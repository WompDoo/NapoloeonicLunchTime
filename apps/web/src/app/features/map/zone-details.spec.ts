import { TestBed } from '@angular/core/testing';
import type {
  ApiError,
  PlayingMatchDto,
  SpyReport,
} from '@lunch-campaign/contracts';
import type { ZoneId } from '@lunch-campaign/engine';
import {
  createUnitCounts,
  NO_UNITS,
  requirePresent,
  toZoneId,
} from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import {
  buttonNamed,
  hasButton,
  normalise,
  query,
  textOf,
} from '../../../testing/dom';
import {
  KUTUZOV_PLAYER,
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  weekMatch,
} from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { ZoneDetails } from './zone-details';

const REPORT: SpyReport = {
  playerId: NAPOLEON_PLAYER,
  turnNumber: 1,
  zoneId: toZoneId('A4'),
  ownerId: WELLINGTON_PLAYER,
  units: createUnitCounts({
    line: 3,
    cavalry: 2,
    skirmishers: 2,
    artillery: 1,
  }),
  unidentified: 0,
};

async function renderZone(
  match: PlayingMatchDto,
  zoneId: string,
): Promise<Awaited<ReturnType<typeof render<ZoneDetails>>>> {
  return render(ZoneDetails, {
    zone: requirePresent(
      match.view.zones.find((zone) => zone.zoneId === zoneId),
      zoneId,
    ),
    match,
    roster: rosterOf(match, TestBed.inject(Translator)),
  });
}

describe('ZoneDetails', () => {
  it('describes the zone', async () => {
    setUpWebTest();
    const fixture = await renderZone(weekMatch(0), 'A4');
    const facts = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('dd'),
    ].map((cell) => normalise(cell.textContent));
    expect(normalise(query(fixture, 'h2').textContent)).toBe('Zone A4');
    expect(facts).toEqual(['Capital', 'Bo', '8 units']);
  });

  it('sends a spy and passes on the report', async () => {
    setUpWebTest();
    const fixture = await renderZone(weekMatch(0), 'A4');
    const reports: SpyReport[] = [];
    fixture.componentInstance.spied.subscribe((report) => reports.push(report));
    buttonNamed(fixture, 'Send a spy (2 supply)').click();
    const request = httpTesting().expectOne('/api/matches/match-1/spies');
    expect(request.request.body).toEqual({ zoneId: 'A4' });
    request.flush(REPORT);
    await fixture.whenStable();
    expect(reports).toEqual([REPORT]);
  });

  it('shows a refused spy inline and passes nothing on', async () => {
    setUpWebTest();
    const fixture = await renderZone(weekMatch(0), 'A4');
    const reports: SpyReport[] = [];
    fixture.componentInstance.spied.subscribe((report) => reports.push(report));
    buttonNamed(fixture, /Send a spy/).click();
    httpTesting()
      .expectOne('/api/matches/match-1/spies')
      .flush(
        {
          statusCode: 409,
          code: 'spy.insufficientSupply',
          message: '',
          problems: [],
        } satisfies ApiError,
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(query(fixture, '[role=alert]').textContent).toContain(
      'You do not have enough supply for a spy.',
    );
    expect(reports).toEqual([]);
  });

  it('shows today’s report instead of offering another spy', async () => {
    setUpWebTest();
    const match = weekMatch(2, KUTUZOV_PLAYER);
    const fixture = await renderZone(match, 'C3');
    expect(textOf(fixture)).toContain('Today’s spy report: 2 cavalry');
    expect(textOf(fixture)).toContain('You have today’s report on this zone.');
    expect(hasButton(fixture, /Send a spy/)).toBe(false);
  });

  it('counts units a spy could not identify', async () => {
    setUpWebTest();
    const match = weekMatch(0);
    const withReport = {
      ...match,
      view: { ...match.view, spyReports: [{ ...REPORT, unidentified: 2 }] },
    };
    const fixture = await renderZone(withReport, 'A4');
    expect(textOf(fixture)).toContain('· 2 unidentified');
  });

  it('explains why there is no spy after the deadline', async () => {
    setUpWebTest();
    const fixture = await renderZone({ ...weekMatch(0), openDay: null }, 'A4');
    expect(textOf(fixture)).toContain('Spies open again with the next day.');
  });

  it('plans a move from your own zone with units, while the day is open', async () => {
    setUpWebTest();
    const fixture = await renderZone(weekMatch(0), 'A1');
    const plans: ZoneId[] = [];
    fixture.componentInstance.planMove.subscribe((zoneId) =>
      plans.push(zoneId),
    );
    expect(hasButton(fixture, /Send a spy/)).toBe(false);
    buttonNamed(fixture, 'Plan a move from here').click();
    expect(plans).toEqual(['A1']);
  });

  it('offers no move from an empty zone or after the deadline', async () => {
    setUpWebTest();
    const match = weekMatch(1);
    const emptied = {
      ...match,
      view: {
        ...match.view,
        zones: match.view.zones.map((zone) =>
          zone.zoneId === 'A2'
            ? {
                ...zone,
                army: { kind: 'composition', units: NO_UNITS } as const,
              }
            : zone,
        ),
      },
    };
    const empty = await renderZone(emptied, 'A2');
    expect(hasButton(empty, 'Plan a move from here')).toBe(false);
    const closed = await renderZone({ ...match, openDay: null }, 'A2');
    expect(hasButton(closed, 'Plan a move from here')).toBe(false);
  });
});
