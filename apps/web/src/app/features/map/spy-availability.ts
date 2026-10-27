import type {
  PlayerView,
  TurnWindowDto,
  ZoneView,
} from '@lunch-campaign/contracts';

/** Whether the viewer can send a spy to a zone now, or the first reason they cannot. */
export type SpyAvailability =
  | 'ownZone'
  | 'reported'
  | 'dayClosed'
  | 'unavailable'
  | 'tooExpensive'
  | 'available';

export interface SpyContext {
  readonly view: PlayerView;
  readonly openDay: TurnWindowDto | null;
  readonly zone: ZoneView;
}

interface SpyRule {
  readonly availability: SpyAvailability;
  readonly applies: (context: SpyContext) => boolean;
}

/** In order: the first that applies decides. The API checks the same and has the last word. */
const SPY_RULES: readonly SpyRule[] = [
  {
    availability: 'ownZone',
    applies: ({ view, zone }): boolean => zone.ownerId === view.viewerId,
  },
  /** A report stays true all day, so a second spy on the same zone could only waste supply. */
  {
    availability: 'reported',
    applies: ({ view, zone }): boolean =>
      view.spyReports.some((report): boolean => report.zoneId === zone.zoneId),
  },
  {
    availability: 'dayClosed',
    applies: ({ openDay }): boolean => openDay === null,
  },
  {
    availability: 'unavailable',
    applies: ({ view }): boolean => !view.spiesAvailable,
  },
  {
    availability: 'tooExpensive',
    applies: ({ view }): boolean => view.me.supply < view.spyCost,
  },
];

export function spyAvailabilityOf(context: SpyContext): SpyAvailability {
  return availabilityOf(
    SPY_RULES.find((rule): boolean => rule.applies(context)),
  );
}

/** No reason not to: the spy can go. */
function availabilityOf(rule: SpyRule | undefined): SpyAvailability {
  return rule === undefined ? 'available' : rule.availability;
}
