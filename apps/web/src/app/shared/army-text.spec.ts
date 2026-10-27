import { TestBed } from '@angular/core/testing';
import { createUnitCounts, NO_UNITS } from '@lunch-campaign/engine';
import { Translator } from '../core/i18n/translator';
import { armyCount, armyText, unitsText } from './army-text';

describe('army text', () => {
  const translator = (): Translator => TestBed.inject(Translator);

  it.each([
    {
      units: createUnitCounts({ line: 3, cavalry: 1 }),
      text: '3 line, 1 cavalry',
    },
    {
      units: createUnitCounts({ skirmishers: 1, artillery: 2 }),
      text: '1 skirmisher, 2 guns',
    },
    { units: NO_UNITS, text: 'no units' },
  ])('says $text', ({ units, text }) => {
    expect(unitsText(units, translator())).toBe(text);
  });

  it.each([
    { army: { kind: 'hidden' } as const, text: 'Hidden by fog', count: null },
    { army: { kind: 'count', count: 5 } as const, text: '5 units', count: 5 },
    {
      army: {
        kind: 'composition',
        units: createUnitCounts({ line: 2, artillery: 1 }),
      } as const,
      text: '2 line, 1 gun',
      count: 3,
    },
  ])(
    'shows a $army.kind army as "$text", counting $count',
    ({ army, text, count }) => {
      expect(armyText(army, translator())).toBe(text);
      expect(armyCount(army)).toBe(count);
    },
  );
});
