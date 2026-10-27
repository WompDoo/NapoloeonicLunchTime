import { TestBed } from '@angular/core/testing';
import { Translator } from '../../core/i18n/translator';
import { rosterOf } from '../../shared/roster';
import { buttonNamed, normalise, queryAll } from '../../../testing/dom';
import { weekMatch } from '../../../testing/match-fixtures';
import { render } from '../../../testing/render';
import { ZoneList } from './zone-list';

describe('ZoneList', () => {
  it('gives screen readers the map as a table, and selects a zone', async () => {
    const match = weekMatch(0);
    const fixture = await render(ZoneList, {
      zones: match.view.zones,
      roster: rosterOf(match, TestBed.inject(Translator)),
    });
    const rows = queryAll(fixture, 'tbody tr').map((row) =>
      [...row.children].map((cell) => normalise(cell.textContent)),
    );
    expect(rows[0]).toEqual([
      'A1',
      'Capital',
      'Ana (you)',
      '3 line, 2 cavalry, 2 skirmishers, 1 gun',
    ]);
    expect(rows[3]).toEqual(['A4', 'Capital', 'Bo', '8 units']);
    buttonNamed(fixture, 'B2').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedZoneId()).toBe('B2');
    expect(buttonNamed(fixture, 'B2').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
