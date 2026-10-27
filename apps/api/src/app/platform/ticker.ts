/** Runs a callback on a fixed interval until stopped. Tests drive it with their fake clock. */
export interface Ticker {
  readonly every: (intervalMs: number, tick: () => void) => () => void;
}

export const TICKER = Symbol('Ticker');

export const intervalTicker: Ticker = {
  every: (intervalMs, tick): (() => void) => {
    const handle = setInterval(tick, intervalMs);
    return (): void => {
      clearInterval(handle);
    };
  },
};
