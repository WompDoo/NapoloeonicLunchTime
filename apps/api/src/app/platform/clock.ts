/** The API's only source of the current time, so tests can play a week in milliseconds. */
export interface Clock {
  readonly now: () => Date;
}

export const CLOCK = Symbol('Clock');

export const systemClock: Clock = {
  now: (): Date => new Date(),
};
