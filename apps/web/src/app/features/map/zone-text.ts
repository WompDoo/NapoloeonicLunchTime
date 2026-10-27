import type { ZoneView } from '@lunch-campaign/contracts';
import type { Translator } from '../../core/i18n/translator';
import type { Roster } from '../../shared/roster';
import { armyText } from '../../shared/army-text';

/** "B2, City, Ana, 5 units": everything the map shows of a zone, for screen readers and the zone list. */
export function zoneLabel(
  zone: ZoneView,
  roster: Roster,
  translator: Translator,
): string {
  return translator.translate('map.zoneLabel', {
    zone: zone.zoneId,
    kind: translator.translate(`map.kind.${zone.kind}`),
    owner: roster.ownerOf(zone.ownerId),
    army: armyText(zone.army, translator),
  });
}
