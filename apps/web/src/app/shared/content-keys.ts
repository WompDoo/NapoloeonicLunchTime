import type { TranslationKey } from '../core/i18n/en';

/*
 * Translation keys for content ids. The catalogue test checks that every commander, ability, upgrade,
 * event and honour in the match config has its keys, so these casts can never name a missing message.
 */

export function commanderName(commanderId: string): TranslationKey {
  return `commander.${commanderId}.name` as TranslationKey;
}

export function commanderPassive(commanderId: string): TranslationKey {
  return `commander.${commanderId}.passive` as TranslationKey;
}

export function commanderAbility(commanderId: string): TranslationKey {
  return `commander.${commanderId}.ability` as TranslationKey;
}

export function commanderAbilityName(commanderId: string): TranslationKey {
  return `commander.${commanderId}.abilityName` as TranslationKey;
}

export function upgradeName(upgradeId: string): TranslationKey {
  return `upgrade.${upgradeId}.name` as TranslationKey;
}

export function upgradeDescription(upgradeId: string): TranslationKey {
  return `upgrade.${upgradeId}.description` as TranslationKey;
}

export function eventName(eventId: string): TranslationKey {
  return `event.${eventId}.name` as TranslationKey;
}

export function eventDescription(eventId: string): TranslationKey {
  return `event.${eventId}.description` as TranslationKey;
}

export function honourName(honourId: string): TranslationKey {
  return `honour.${honourId}.name` as TranslationKey;
}

export function honourDescription(honourId: string): TranslationKey {
  return `honour.${honourId}.description` as TranslationKey;
}
