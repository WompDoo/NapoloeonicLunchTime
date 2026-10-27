import type { Order } from '@lunch-campaign/engine';
import { spiedWeekView } from '@lunch-campaign/player-view/testing';
import { NAPOLEON_PLAYER } from '../../../testing/match-fixtures';
import { abilityAvailabilityOf } from './ability-availability';

const monday = spiedWeekView(0, NAPOLEON_PLAYER);
const ABILITY: Order = { kind: 'useAbility', target: { kind: 'none' } };

describe('abilityAvailabilityOf', () => {
  it.each([
    {
      why: 'used before',
      view: { ...monday, me: { ...monday.me, abilityUsed: true } },
      draft: [],
      availability: 'used',
    },
    {
      why: 'in today’s orders',
      view: monday,
      draft: [ABILITY],
      availability: 'planned',
    },
    { why: 'still unused', view: monday, draft: [], availability: 'available' },
  ])('is $availability when $why', ({ view, draft, availability }) => {
    expect(abilityAvailabilityOf(view, draft)).toBe(availability);
  });
});
