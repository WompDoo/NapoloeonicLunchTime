import type { PlayerView } from '@lunch-campaign/contracts';
import type { Order } from '@lunch-campaign/engine';

/** Whether the ability can go into today's orders, or why not. */
export type AbilityAvailability = 'used' | 'planned' | 'available';

interface AbilityRule {
  readonly availability: AbilityAvailability;
  readonly applies: (view: PlayerView, draft: readonly Order[]) => boolean;
}

const ABILITY_RULES: readonly AbilityRule[] = [
  { availability: 'used', applies: (view): boolean => view.me.abilityUsed },
  {
    availability: 'planned',
    applies: (_view, draft): boolean =>
      draft.some((order): boolean => order.kind === 'useAbility'),
  },
];

export function abilityAvailabilityOf(
  view: PlayerView,
  draft: readonly Order[],
): AbilityAvailability {
  return availabilityOf(
    ABILITY_RULES.find((rule): boolean => rule.applies(view, draft)),
  );
}

function availabilityOf(rule: AbilityRule | undefined): AbilityAvailability {
  return rule === undefined ? 'available' : rule.availability;
}
