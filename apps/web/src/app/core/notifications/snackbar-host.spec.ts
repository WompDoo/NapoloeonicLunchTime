import { TestBed } from '@angular/core/testing';
import { buttonNamed, textOf } from '../../../testing/dom';
import { Snackbar } from './snackbar';
import { SnackbarHost } from './snackbar-host';

describe('SnackbarHost', () => {
  it('shows the message in a live region and closes it on request', async () => {
    const fixture = TestBed.createComponent(SnackbarHost);
    TestBed.inject(Snackbar).show('Cannot reach the server.');
    await fixture.whenStable();
    expect(textOf(fixture)).toContain('Cannot reach the server.');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role=status]'),
    ).not.toBeNull();
    buttonNamed(fixture, 'Close').click();
    await fixture.whenStable();
    expect(textOf(fixture)).toBe('');
  });
});
