import { DEFAULT_MATCH_CONFIG, HONOUR_IDS } from '@lunch-campaign/content';
import {
  commanderAbility,
  commanderAbilityName,
  commanderName,
  commanderPassive,
  eventDescription,
  eventName,
  honourDescription,
  honourName,
  upgradeDescription,
  upgradeName,
} from '../../shared/content-keys';
import type { Message } from './catalogue';
import { EN } from './en';

/** Every content id the match config can put in front of a player has its words. */
const CONTENT_KEYS = [
  ...DEFAULT_MATCH_CONFIG.commanders.flatMap((commander) => [
    commanderName(commander.id),
    commanderPassive(commander.id),
    commanderAbility(commander.id),
    commanderAbilityName(commander.id),
  ]),
  ...DEFAULT_MATCH_CONFIG.upgrades.flatMap((upgrade) => [
    upgradeName(upgrade.id),
    upgradeDescription(upgrade.id),
  ]),
  ...DEFAULT_MATCH_CONFIG.events.flatMap((event) => [
    eventName(event.id),
    eventDescription(event.id),
  ]),
  ...HONOUR_IDS.flatMap((honourId) => [
    honourName(honourId),
    honourDescription(honourId),
  ]),
];

function placeholdersOf(message: Message): readonly string[] {
  const forms =
    typeof message === 'string' ? [message] : [message.one, message.other];
  return forms.flatMap((form) =>
    [...form.matchAll(/\{(\w+)\}/g)].map((found) => found[1] ?? ''),
  );
}

describe('the English catalogue', () => {
  it.each(CONTENT_KEYS)('has %s', (key) => {
    expect(EN[key]).toEqual(expect.anything());
  });

  it('names a count in every plural message', () => {
    const plurals = Object.entries(EN).filter(
      (entry): boolean => typeof entry[1] !== 'string',
    );
    expect(plurals.length).toBeGreaterThan(0);
    plurals.forEach(([key, message]) => {
      expect({ key, placeholders: placeholdersOf(message) }).toEqual({
        key,
        placeholders: expect.arrayContaining(['count']),
      });
    });
  });
});
