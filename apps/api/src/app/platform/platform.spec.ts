import { systemClock } from './clock';
import { cryptoRandomSource } from './random-source';
import { intervalTicker } from './ticker';

describe('platform defaults', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('tells the real time', () => {
    const before = Date.now();
    expect(systemClock.now().getTime()).toBeGreaterThanOrEqual(before);
  });

  it('draws unique ids and unguessable secrets', () => {
    expect(cryptoRandomSource.id()).not.toBe(cryptoRandomSource.id());
    expect(cryptoRandomSource.secret()).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('ticks on its interval until stopped', () => {
    jest.useFakeTimers();
    const tick = jest.fn();
    const stop = intervalTicker.every(1_000, tick);
    jest.advanceTimersByTime(2_500);
    expect(tick).toHaveBeenCalledTimes(2);
    stop();
    jest.advanceTimersByTime(5_000);
    expect(tick).toHaveBeenCalledTimes(2);
  });
});
