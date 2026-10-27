import { TestBed } from '@angular/core/testing';
import { buttonNamed, textOf } from '../../testing/dom';
import { StatePanel } from './state-panel';

describe('StatePanel', () => {
  it.each([
    { state: 'loading', message: null, text: 'Loading…' },
    {
      state: 'empty',
      message: 'orders.empty',
      text: 'No orders yet. Units without orders hold.',
    },
    {
      state: 'error',
      message: null,
      text: 'This could not be loaded. Try again',
    },
  ] as const)('shows the $state state', async ({ state, message, text }) => {
    const fixture = TestBed.createComponent(StatePanel);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('message', message);
    await fixture.whenStable();
    expect(textOf(fixture)).toBe(text);
  });

  it('offers a retry on error', async () => {
    const fixture = TestBed.createComponent(StatePanel);
    fixture.componentRef.setInput('state', 'error');
    const retried = jest.fn();
    fixture.componentInstance.retry.subscribe(retried);
    await fixture.whenStable();
    buttonNamed(fixture, 'Try again').click();
    expect(retried).toHaveBeenCalledTimes(1);
  });
});
