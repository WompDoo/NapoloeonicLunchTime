import { createUnitCounts, NO_UNITS } from '@lunch-campaign/engine';
import { enter, query, queryAll, normalise } from '../../../testing/dom';
import { render } from '../../../testing/render';
import { UnitPicker } from './unit-picker';

describe('UnitPicker', () => {
  it('offers the types in the zone, up to what is there', async () => {
    const fixture = await render(UnitPicker, {
      available: createUnitCounts({ line: 3, artillery: 1 }),
      idPrefix: 'test-',
      units: NO_UNITS,
    });
    expect(
      queryAll(fixture, 'label').map((label) => normalise(label.textContent)),
    ).toEqual(['Line infantry (3 here)', 'Artillery (1 here)']);
    expect(normalise(query(fixture, 'legend').textContent)).toBe('Units');
    enter(query<HTMLInputElement>(fixture, '#test-line'), '5');
    enter(query<HTMLInputElement>(fixture, '#test-artillery'), '1');
    await fixture.whenStable();
    expect(fixture.componentInstance.units()).toEqual(
      createUnitCounts({ line: 3, artillery: 1 }),
    );
    enter(query<HTMLInputElement>(fixture, '#test-line'), '');
    expect(fixture.componentInstance.units()).toEqual(
      createUnitCounts({ artillery: 1 }),
    );
  });
});
