import { TestBed } from '@angular/core/testing';
import { Snackbar, SNACKBAR_DURATION_MS } from './snackbar';

describe('Snackbar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows one message at a time, the newest', () => {
    const snackbar = TestBed.inject(Snackbar);
    snackbar.show('first');
    snackbar.show('second');
    expect(snackbar.message()).toMatchObject({ text: 'second' });
  });

  it('dismisses a message on its own after a while', () => {
    const snackbar = TestBed.inject(Snackbar);
    snackbar.show('soon gone');
    jest.advanceTimersByTime(SNACKBAR_DURATION_MS);
    expect(snackbar.message()).toBeNull();
  });

  it('dismisses only the message asked for', () => {
    const snackbar = TestBed.inject(Snackbar);
    snackbar.show('old');
    const old = snackbar.message();
    snackbar.show('new');
    snackbar.dismiss(old === null ? 0 : old.id);
    expect(snackbar.message()).toMatchObject({ text: 'new' });
  });

  it('ignores a dismissal when nothing is shown', () => {
    const snackbar = TestBed.inject(Snackbar);
    snackbar.dismiss(1);
    expect(snackbar.message()).toBeNull();
  });
});
