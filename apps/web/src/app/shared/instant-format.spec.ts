import { TestBed } from '@angular/core/testing';
import { InstantFormat } from './instant-format';

describe('InstantFormat', () => {
  it('shows a deadline in the match’s time zone, on a 24-hour clock, with the zone named', () => {
    expect(
      TestBed.inject(InstantFormat).timeOfDay(
        '2026-11-02T21:00:00.000Z',
        'Europe/Tallinn',
      ),
    ).toBe('23:00 GMT+2');
  });
});
