/** A wall-clock time in the match's time zone. */
export interface LocalTime {
  readonly hour: number;
  readonly minute: number;
}

/** ISO weekday numbers, as calendars count them: Monday is 1, Sunday is 7. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** When a match's days happen. Not engine rules: the engine never sees a clock. */
export interface MatchTiming {
  /** Orders and spies close at this time on each match day. */
  readonly ordersDeadline: LocalTime;
  /** Each night resolves at the first occurrence of this time after the deadline. */
  readonly resolutionTime: LocalTime;
  /** Weekdays that can be match days; the others are skipped. */
  readonly matchWeekdays: readonly IsoWeekday[];
}

export interface LobbyRules {
  /** The most is the map's number of starting capitals. */
  readonly minimumPlayers: number;
}

const MONDAY: IsoWeekday = 1;
const TUESDAY: IsoWeekday = 2;
const WEDNESDAY: IsoWeekday = 3;
const THURSDAY: IsoWeekday = 4;
const FRIDAY: IsoWeekday = 5;

export const DEFAULT_MATCH_TIMING: MatchTiming = {
  ordersDeadline: { hour: 23, minute: 0 },
  resolutionTime: { hour: 2, minute: 0 },
  matchWeekdays: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY],
};

export const DEFAULT_LOBBY_RULES: LobbyRules = {
  minimumPlayers: 2,
};
