import { TestBed } from '@angular/core/testing';
import { Translator } from '../core/i18n/translator';
import {
  NAPOLEON_PLAYER,
  WELLINGTON_PLAYER,
  weekMatch,
} from '../../testing/match-fixtures';
import { rosterOf } from './roster';

describe('rosterOf', () => {
  const roster = (): ReturnType<typeof rosterOf> =>
    rosterOf(weekMatch(0), TestBed.inject(Translator));

  it('names players, the viewer as themselves', () => {
    expect(roster().nameOf(WELLINGTON_PLAYER)).toBe('Bo');
    expect(roster().nameOf(NAPOLEON_PLAYER)).toBe('Ana (you)');
    expect(roster().nameOf('stranger')).toBe('stranger');
  });

  it('names zone owners, or says the zone is neutral', () => {
    expect(roster().ownerOf(WELLINGTON_PLAYER)).toBe('Bo');
    expect(roster().ownerOf(null)).toBe('Neutral');
  });

  it('gives seats and seat colours, neutral for nobody', () => {
    expect(roster().seatOf(WELLINGTON_PLAYER)).toBe(2);
    expect(roster().seatOf('stranger')).toBeNull();
    expect(roster().colourOf(WELLINGTON_PLAYER)).toBe('var(--seat-2)');
    expect(roster().colourOf(null)).toBe('var(--neutral-zone)');
    expect(roster().colourOf('stranger')).toBe('var(--neutral-zone)');
  });
});
