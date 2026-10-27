import { requirePresent } from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import type { DayPhase } from './day-status';

export const MATCH_TABS = ['map', 'orders', 'night', 'honours'] as const;
export type MatchTab = (typeof MATCH_TABS)[number];

export const TAB_LABELS: Readonly<Record<MatchTab, TranslationKey>> = {
  map: 'match.tab.map',
  orders: 'match.tab.orders',
  night: 'match.tab.night',
  honours: 'match.tab.honours',
};

/** Where a match opens: the map while it runs, the honours and final score once it is over. */
export const OPENING_TAB: Readonly<Record<DayPhase, MatchTab>> = {
  open: 'map',
  closed: 'map',
  finished: 'honours',
};

/** Arrow keys step through the tabs and wrap; Home and End jump to the ends. */
const TAB_STEPS: Readonly<
  Record<string, (index: number, count: number) => number>
> = {
  ArrowRight: (index, count): number => (index + 1) % count,
  ArrowLeft: (index, count): number => (index - 1 + count) % count,
  Home: (): number => 0,
  End: (_index, count): number => count - 1,
};

/** The tab a key moves to, or null for keys the tab list does not handle. */
export function tabAfterKey(current: MatchTab, key: string): MatchTab | null {
  const step = TAB_STEPS[key];
  return step === undefined
    ? null
    : tabAt(step(MATCH_TABS.indexOf(current), MATCH_TABS.length));
}

function tabAt(index: number): MatchTab {
  return requirePresent(MATCH_TABS[index], `tab ${index}`);
}
