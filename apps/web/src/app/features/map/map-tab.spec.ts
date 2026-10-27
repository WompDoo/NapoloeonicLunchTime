import { TestBed } from '@angular/core/testing';
import type { ZoneId } from '@lunch-campaign/engine';
import { createUnitCounts, toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { buttonNamed, query, textOf } from '../../../testing/dom';
import {
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  weekMatch,
} from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { httpTesting, setUpWebTest } from '../../../testing/test-providers';
import { MapTab } from './map-tab';

describe('MapTab', () => {
  async function renderTab(): Promise<
    Awaited<ReturnType<typeof render<MapTab>>>
  > {
    const match = weekMatch(0);
    return render(MapTab, {
      match,
      roster: rosterOf(match, TestBed.inject(Translator)),
    });
  }

  it('asks for a zone until one is selected', async () => {
    setUpWebTest();
    const fixture = await renderTab();
    expect(textOf(fixture)).toContain(
      'Select a zone on the map to see what you know about it.',
    );
    query<SVGGElement>(fixture, 'g.zone[data-zone-id=A4]').dispatchEvent(
      new MouseEvent('click'),
    );
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Zone A4');
  });

  it('switches between the map and the zone list, keeping the selection', async () => {
    setUpWebTest();
    const fixture = await renderTab();
    buttonNamed(fixture, 'Show as a list').click();
    await fixture.whenStable();
    expect(
      buttonNamed(fixture, 'Show as a list').getAttribute('aria-pressed'),
    ).toBe('true');
    buttonNamed(fixture, 'B2').click();
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Zone B2');
    buttonNamed(fixture, 'Show as a list').click();
    await fixture.whenStable();
    expect(
      query(fixture, 'g.zone[data-zone-id=B2]').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('passes on a spy sent and a move planned', async () => {
    setUpWebTest();
    const fixture = await renderTab();
    const refreshes: unknown[] = [];
    const plans: ZoneId[] = [];
    fixture.componentInstance.refreshNeeded.subscribe((value) =>
      refreshes.push(value),
    );
    fixture.componentInstance.planMove.subscribe((zoneId) =>
      plans.push(zoneId),
    );
    fixture.componentRef.setInput('selectedZoneId', toZoneId('A4'));
    await fixture.whenStable();
    buttonNamed(fixture, /Send a spy/).click();
    httpTesting()
      .expectOne('/api/matches/match-1/spies')
      .flush({
        playerId: NAPOLEON_PLAYER,
        turnNumber: 1,
        zoneId: 'A4',
        ownerId: WELLINGTON_PLAYER,
        units: createUnitCounts({ line: 1 }),
        unidentified: 0,
      });
    await fixture.whenStable();
    fixture.componentRef.setInput('selectedZoneId', toZoneId('A1'));
    await fixture.whenStable();
    buttonNamed(fixture, 'Plan a move from here').click();
    expect(refreshes).toHaveLength(1);
    expect(plans).toEqual(['A1']);
  });
});
