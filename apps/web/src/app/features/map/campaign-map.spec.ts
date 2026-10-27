import { TestBed } from '@angular/core/testing';
import { toZoneId } from '@lunch-campaign/engine';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { normalise, press, query, queryAll } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { CampaignMap } from './campaign-map';

async function renderMap(
  dayIndex = 0,
): Promise<Awaited<ReturnType<typeof render<CampaignMap>>>> {
  const match = weekMatch(dayIndex);
  return render(CampaignMap, {
    zones: match.view.zones,
    connections: match.view.connections,
    roster: rosterOf(match, TestBed.inject(Translator)),
  });
}

function zoneElement(
  fixture: Awaited<ReturnType<typeof renderMap>>,
  zoneId: string,
): SVGGElement {
  return query<SVGGElement>(fixture, `g.zone[data-zone-id=${zoneId}]`);
}

describe('CampaignMap', () => {
  it('labels every zone with what the map shows of it', async () => {
    const fixture = await renderMap();
    expect(zoneElement(fixture, 'A1').getAttribute('aria-label')).toBe(
      'A1, Capital, Ana (you), 3 line, 2 cavalry, 2 skirmishers, 1 gun',
    );
    expect(zoneElement(fixture, 'A4').getAttribute('aria-label')).toBe(
      'A4, Capital, Bo, 8 units',
    );
    expect(zoneElement(fixture, 'B2').getAttribute('aria-label')).toBe(
      'B2, City, Neutral, 0 units',
    );
    expect(queryAll(fixture, 'line.map__road')).toHaveLength(
      weekMatch(0).view.connections.length,
    );
  });

  it('shows a seat badge on owned zones and a question mark where fog hides the count', async () => {
    const match = weekMatch(2);
    const fixture = await render(CampaignMap, {
      zones: match.view.zones.map((zone) =>
        zone.zoneId === 'A4' ? { ...zone, army: { kind: 'hidden' } } : zone,
      ),
      connections: match.view.connections,
      roster: rosterOf(match, TestBed.inject(Translator)),
    });
    expect(
      normalise(
        query(fixture, 'g.zone[data-zone-id=A4] .zone__army').textContent,
      ),
    ).toBe('?');
    expect(
      normalise(
        query(fixture, 'g.zone[data-zone-id=A4] .zone__seat').textContent,
      ),
    ).toBe('2');
    expect(
      zoneElement(fixture, 'B1').querySelector('.zone__seat'),
    ).not.toBeNull();
  });

  it('has one tab stop, on the first zone until one is selected', async () => {
    const fixture = await renderMap();
    expect(
      queryAll(fixture, 'g.zone[tabindex="0"]').map((element) =>
        element.getAttribute('data-zone-id'),
      ),
    ).toEqual(['A1']);
    fixture.componentRef.setInput('selectedZoneId', toZoneId('C3'));
    await fixture.whenStable();
    expect(
      queryAll(fixture, 'g.zone[tabindex="0"]').map((element) =>
        element.getAttribute('data-zone-id'),
      ),
    ).toEqual(['C3']);
  });

  it('moves focus with the arrow keys and selects with Enter or Space', async () => {
    const fixture = await renderMap();
    const start = zoneElement(fixture, 'A1');
    expect(press(start, 'ArrowRight').defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(document.activeElement).toBe(zoneElement(fixture, 'A2'));
    press(zoneElement(fixture, 'A2'), 'ArrowDown');
    await fixture.whenStable();
    expect(zoneElement(fixture, 'B2').getAttribute('tabindex')).toBe('0');
    press(zoneElement(fixture, 'B2'), 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedZoneId()).toBe('B2');
    expect(zoneElement(fixture, 'B2').getAttribute('aria-pressed')).toBe(
      'true',
    );
    press(zoneElement(fixture, 'B2'), ' ');
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedZoneId()).toBe('B2');
  });

  it('stays put at the edge and ignores other keys', async () => {
    const fixture = await renderMap();
    press(zoneElement(fixture, 'A1'), 'ArrowUp');
    expect(press(zoneElement(fixture, 'A1'), 'x').defaultPrevented).toBe(false);
    await fixture.whenStable();
    expect(zoneElement(fixture, 'A1').getAttribute('tabindex')).toBe('0');
    expect(fixture.componentInstance.selectedZoneId()).toBeNull();
  });

  it('selects a zone on click and rings the zones the replay shows', async () => {
    const fixture = await renderMap();
    fixture.componentRef.setInput('highlightedZoneIds', [
      toZoneId('A1'),
      toZoneId('A2'),
    ]);
    zoneElement(fixture, 'D4').dispatchEvent(new MouseEvent('click'));
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedZoneId()).toBe('D4');
    expect(queryAll(fixture, '.zone__highlight')).toHaveLength(2);
  });
});
