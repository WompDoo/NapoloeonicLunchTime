import type { PlayingMatchDto, TurnWindowDto } from '@lunch-campaign/contracts';
import { requirePresent } from '@lunch-campaign/engine';
import type { Translatable } from '../../core/i18n/translator';

export type DayPhase = 'open' | 'closed' | 'finished';

type FormatInstant = (isoInstant: string) => string;

/** Taking orders, waiting for the night, or over. */
export function dayPhaseOf(match: PlayingMatchDto): DayPhase {
  return match.phase === 'finished' ? 'finished' : openOrClosed(match.openDay);
}

function openOrClosed(openDay: TurnWindowDto | null): DayPhase {
  return openDay === null ? 'closed' : 'open';
}

/** The calendar window of the day the view is on. */
export function currentWindowOf(match: PlayingMatchDto): TurnWindowDto {
  return requirePresent(
    match.calendar.find(
      (window): boolean => window.turnNumber === match.view.turnNumber,
    ),
    `calendar window for turn ${match.view.turnNumber}`,
  );
}

const DAY_STATUS: Readonly<
  Record<
    DayPhase,
    (match: PlayingMatchDto, format: FormatInstant) => Translatable
  >
> = {
  open: (match, format): Translatable => ({
    key: 'day.deadline',
    params: { time: format(currentWindowOf(match).deadlineAt) },
  }),
  closed: (match, format): Translatable => ({
    key: 'day.closed',
    params: { time: format(currentWindowOf(match).resolvesAt) },
  }),
  finished: (): Translatable => ({ key: 'day.finished' }),
};

/** "Orders close Tuesday 23:00", "Orders are closed…", or "The campaign is over." */
export function dayStatusOf(
  match: PlayingMatchDto,
  format: FormatInstant,
): Translatable {
  return DAY_STATUS[dayPhaseOf(match)](match, format);
}
