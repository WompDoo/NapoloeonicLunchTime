import { requirePresent } from '../core/engine-error';
import type {
  CommanderDefinition,
  EventDefinition,
  UpgradeDefinition,
} from '../modifiers/modifier-definitions';
import type { MatchConfig } from './match-config';

export function findUpgrade(
  config: MatchConfig,
  upgradeId: string,
): UpgradeDefinition {
  return requirePresent(
    config.upgrades.find((upgrade): boolean => upgrade.id === upgradeId),
    `upgrade ${upgradeId}`,
  );
}

export function findCommander(
  config: MatchConfig,
  commanderId: string,
): CommanderDefinition {
  return requirePresent(
    config.commanders.find(
      (commander): boolean => commander.id === commanderId,
    ),
    `commander ${commanderId}`,
  );
}

export function findEvent(
  config: MatchConfig,
  eventId: string,
): EventDefinition {
  return requirePresent(
    config.events.find((event): boolean => event.id === eventId),
    `event ${eventId}`,
  );
}

export function isKnownUpgrade(
  config: MatchConfig,
  upgradeId: string,
): boolean {
  return config.upgrades.some((upgrade): boolean => upgrade.id === upgradeId);
}
