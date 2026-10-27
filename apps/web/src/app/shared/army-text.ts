import type { UnitCounts } from '@lunch-campaign/engine';
import { UNIT_TYPES } from '@lunch-campaign/engine';
import type { PlayerView } from '@lunch-campaign/contracts';
import type { Translator } from '../core/i18n/translator';

type ArmyVisibility = PlayerView['zones'][number]['army'];

/** "3 line, 2 cavalry", or "no units". */
export function unitsText(units: UnitCounts, translator: Translator): string {
  const parts = UNIT_TYPES.filter(
    (unitType): boolean => units[unitType] > 0,
  ).map((unitType): string =>
    translator.translate(`units.${unitType}`, { count: units[unitType] }),
  );
  return parts.length === 0
    ? translator.translate('common.noUnits')
    : parts.join(', ');
}

type ArmyTexts = {
  readonly [TKind in ArmyVisibility['kind']]: (
    army: Extract<ArmyVisibility, { readonly kind: TKind }>,
    translator: Translator,
  ) => string;
};

const ARMY_TEXTS: ArmyTexts = {
  hidden: (_army, translator): string => translator.translate('map.hidden'),
  count: (army, translator): string =>
    translator.translate('common.units', { count: army.count }),
  composition: (army, translator): string => unitsText(army.units, translator),
};

/** An army as far as the viewer may see it. */
export function armyText(army: ArmyVisibility, translator: Translator): string {
  const describe = ARMY_TEXTS[army.kind] as (
    army: ArmyVisibility,
    translator: Translator,
  ) => string;
  return describe(army, translator);
}

/** The total the viewer may see, or null when hidden. */
export function armyCount(army: ArmyVisibility): number | null {
  return army.kind === 'hidden' ? null : visibleCount(army);
}

function visibleCount(
  army: Exclude<ArmyVisibility, { readonly kind: 'hidden' }>,
): number {
  return army.kind === 'count'
    ? army.count
    : UNIT_TYPES.reduce(
        (total, unitType): number => total + army.units[unitType],
        0,
      );
}
