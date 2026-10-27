import type { PlayerView } from '@lunch-campaign/contracts';
import { requirePresent } from '@lunch-campaign/engine';
import { spiedWeekView } from '@lunch-campaign/player-view/testing';
import { KUTUZOV_PLAYER, windowOf } from '../../../testing/match-fixtures';
import type { SpyAvailability } from './spy-availability';
import { spyAvailabilityOf } from './spy-availability';

/** Kutuzov on Wednesday: he holds C3's neighbours and has spied C3 already. */
const wednesday = spiedWeekView(2, KUTUZOV_PLAYER);
const ownZone = requirePresent(
  wednesday.zones.find((zone) => zone.ownerId === KUTUZOV_PLAYER),
  'a zone of his',
);
const spiedZone = requirePresent(
  wednesday.zones.find((zone) => zone.zoneId === 'C3'),
  'C3',
);
const otherZone = requirePresent(
  wednesday.zones.find((zone) => zone.zoneId === 'A1'),
  'A1',
);
const OPEN = windowOf(3);

describe('spyAvailabilityOf', () => {
  it.each([
    {
      why: 'his own zone',
      view: wednesday,
      openDay: OPEN,
      zone: ownZone,
      availability: 'ownZone',
    },
    {
      why: 'a zone reported today',
      view: wednesday,
      openDay: OPEN,
      zone: spiedZone,
      availability: 'reported',
    },
    {
      why: 'after the deadline',
      view: wednesday,
      openDay: null,
      zone: otherZone,
      availability: 'dayClosed',
    },
    {
      why: 'a day without spies',
      view: { ...wednesday, spiesAvailable: false },
      openDay: OPEN,
      zone: otherZone,
      availability: 'unavailable',
    },
    {
      why: 'too little supply',
      view: { ...wednesday, me: { ...wednesday.me, supply: 1 } },
      openDay: OPEN,
      zone: otherZone,
      availability: 'tooExpensive',
    },
    {
      why: 'another zone',
      view: wednesday,
      openDay: OPEN,
      zone: otherZone,
      availability: 'available',
    },
  ] satisfies readonly {
    why: string;
    view: PlayerView;
    openDay: typeof OPEN | null;
    zone: typeof otherZone;
    availability: SpyAvailability;
  }[])('is $availability for $why', ({ view, openDay, zone, availability }) => {
    expect(spyAvailabilityOf({ view, openDay, zone })).toBe(availability);
  });
});
