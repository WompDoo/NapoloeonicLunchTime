import { TestBed } from '@angular/core/testing';
import type { ApiError, MatchupPreview } from '@lunch-campaign/contracts';
import type { MoveOrder } from '@lunch-campaign/engine';
import { NO_UNITS, toZoneId } from '@lunch-campaign/engine';
import {
  buttonNamed,
  choose,
  enter,
  hasButton,
  optionLabels,
  query,
  textOf,
  selectedLabel,
} from '../../../testing/dom';
import { MURAT_PLAYER, weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { MoveForm } from './move-form';

const PREVIEW_URL = '/api/matches/match-1/preview';
const UNOPPOSED: MatchupPreview = { kind: 'unopposed' };

async function renderMove(
  viewerDay = 0,
  viewerId?: Parameters<typeof weekMatch>[1],
): Promise<{
  fixture: Awaited<ReturnType<typeof render<MoveForm>>>;
  orders: MoveOrder[];
}> {
  const fixture = await render(MoveForm, {
    view: weekMatch(viewerDay, viewerId).view,
    matchId: 'match-1',
  });
  const orders: MoveOrder[] = [];
  fixture.componentInstance.add.subscribe((order) => orders.push(order));
  return { fixture, orders };
}

/** Units typed in: the preview asks the API, so the fixture is never stable until it answers. */
function typeUnits(
  fixture: Awaited<ReturnType<typeof render<MoveForm>>>,
  field: string,
  count: string,
): void {
  enter(query<HTMLInputElement>(fixture, field), count);
  TestBed.tick();
}

describe('MoveForm', () => {
  it('moves units to a neighbour, previewing the fight first', async () => {
    setUpWebTest();
    const { fixture, orders } = await renderMove();
    expect(hasButton(fixture, 'Add')).toBe(true);
    expect(buttonNamed(fixture, 'Add').disabled).toBe(true);
    expect(query<HTMLSelectElement>(fixture, '#move-to').disabled).toBe(true);
    choose(query<HTMLSelectElement>(fixture, '#move-from'), 'A1');
    await fixture.whenStable();
    expect(optionLabels(query<HTMLSelectElement>(fixture, '#move-to'))).toEqual(
      ['Choose…', 'A2', 'B1'],
    );
    expect(() => query(fixture, '#move-via')).toThrow();
    choose(query<HTMLSelectElement>(fixture, '#move-to'), 'A2');
    typeUnits(fixture, '#move-line', '2');
    expect(textOf(fixture)).toContain('Working it out…');
    const preview = httpTesting().expectOne(PREVIEW_URL);
    expect(preview.request.body).toEqual({
      toZoneId: 'A2',
      units: { ...NO_UNITS, line: 2 },
    });
    preview.flush(UNOPPOSED);
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('No army there now.');
    buttonNamed(fixture, 'Add').click();
    await fixture.whenStable();
    expect(orders).toEqual([
      {
        kind: 'move',
        fromZoneId: 'A1',
        viaZoneIds: [],
        toZoneId: 'A2',
        units: { ...NO_UNITS, line: 2 },
      },
    ]);
    expect(query<HTMLInputElement>(fixture, '#move-line').value).toBe('0');
  });

  it('starts from the zone the map asked for', async () => {
    setUpWebTest();
    const fixture = await render(MoveForm, {
      view: weekMatch(0).view,
      matchId: 'match-1',
      fromZoneId: toZoneId('A1'),
    });
    expect(selectedLabel(query<HTMLSelectElement>(fixture, '#move-from'))).toBe(
      'A1',
    );
  });

  it('routes cavalry through a zone when a commander lets it go further', async () => {
    setUpWebTest();
    const { fixture, orders } = await renderMove(0, MURAT_PLAYER);
    choose(query<HTMLSelectElement>(fixture, '#move-from'), 'D4');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#move-via'), 'C4');
    await fixture.whenStable();
    expect(optionLabels(query<HTMLSelectElement>(fixture, '#move-to'))).toEqual(
      ['Choose…', 'B4', 'C3'],
    );
    choose(query<HTMLSelectElement>(fixture, '#move-to'), 'C3');
    typeUnits(fixture, '#move-cavalry', '1');
    httpTesting().expectOne(PREVIEW_URL).flush(UNOPPOSED);
    await fixture.whenStable();
    buttonNamed(fixture, 'Add').click();
    expect(orders[0]).toMatchObject({
      fromZoneId: 'D4',
      viaZoneIds: ['C4'],
      toZoneId: 'C3',
    });
  });

  it('shows a refused preview inline', async () => {
    setUpWebTest();
    const { fixture } = await renderMove();
    choose(query<HTMLSelectElement>(fixture, '#move-from'), 'A1');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#move-to'), 'B1');
    typeUnits(fixture, '#move-cavalry', '1');
    httpTesting()
      .expectOne(PREVIEW_URL)
      .flush(
        {
          statusCode: 400,
          code: 'zone.unknown',
          message: '',
          problems: [],
        } satisfies ApiError,
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();
    expect(query(fixture, '[role=alert]').textContent).toContain(
      'That zone is not on the map.',
    );
  });

  it('offers a retry when the preview could not be fetched', async () => {
    setUpWebTest();
    const { fixture } = await renderMove();
    choose(query<HTMLSelectElement>(fixture, '#move-from'), 'A1');
    await fixture.whenStable();
    choose(query<HTMLSelectElement>(fixture, '#move-to'), 'B1');
    typeUnits(fixture, '#move-cavalry', '1');
    httpTesting().expectOne(PREVIEW_URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    buttonNamed(fixture, 'Try again').click();
    TestBed.tick();
    httpTesting().expectOne(PREVIEW_URL).flush(UNOPPOSED);
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('No army there now.');
  });

  it('adds nothing when the form is submitted incomplete', async () => {
    setUpWebTest();
    const { fixture, orders } = await renderMove();
    query(fixture, 'form').dispatchEvent(new Event('submit'));
    expect(orders).toEqual([]);
  });

  it('says so when no zone of yours has units', async () => {
    setUpWebTest();
    const view = weekMatch(0).view;
    const fixture = await render(MoveForm, {
      view: {
        ...view,
        zones: view.zones.map((zone) => ({
          ...zone,
          army: { kind: 'composition', units: NO_UNITS },
        })),
      },
      matchId: 'match-1',
    });
    expect(textOf(fixture)).toContain('None of your zones has units to move.');
  });
});
