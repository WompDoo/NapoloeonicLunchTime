import type { Clock } from '../app/platform/clock';
import type { Ticker } from '../app/platform/ticker';

/**
 * A clock that only moves when told, and the ticker that goes with it: moving the clock runs every tick
 * once, as if the interval had fired. Lets a test play a whole week in milliseconds.
 */
export class FakeClock implements Clock, Ticker {
  private current: Date;
  private readonly ticks = new Set<() => void>();

  public constructor(start: Date) {
    this.current = start;
  }

  public readonly now = (): Date => new Date(this.current.getTime());

  public readonly every = (
    _intervalMs: number,
    tick: () => void,
  ): (() => void) => {
    this.ticks.add(tick);
    return (): void => {
      this.ticks.delete(tick);
    };
  };

  public advanceTo(moment: Date): void {
    this.current = moment;
    this.ticks.forEach((tick) => {
      tick();
    });
  }

  public get tickCount(): number {
    return this.ticks.size;
  }
}
