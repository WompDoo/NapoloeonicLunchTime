import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlayerView } from '@lunch-campaign/contracts';
import type {
  AbilityTarget,
  AbilityTargetKind,
  Order,
  UnitCounts,
  UseAbilityOrder,
  ZoneId,
} from '@lunch-campaign/engine';
import {
  hasAnyUnits,
  NO_ABILITY_TARGET,
  NO_UNITS,
  UNIT_TYPES,
} from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import {
  commanderAbility,
  commanderAbilityName,
} from '../../shared/content-keys';
import { adjacentZoneIds } from '../../shared/map-geometry';
import { ownUnitsAt, ownZones, ownZonesWith } from '../../shared/own-army';
import { StatePanel } from '../../shared/state-panel';
import type { AbilityAvailability } from './ability-availability';
import { abilityAvailabilityOf } from './ability-availability';
import { UnitPicker } from './unit-picker';
import type { ZoneView } from '@lunch-campaign/contracts';

const UNAVAILABLE_MESSAGES: Readonly<
  Record<AbilityAvailability, TranslationKey | null>
> = {
  used: 'orders.abilityUsed',
  planned: 'orders.abilityPlanned',
  available: null,
};

interface TargetFields {
  readonly zoneId: ZoneId | null;
  readonly fromZoneId: ZoneId | null;
  readonly toZoneId: ZoneId | null;
  readonly units: UnitCounts;
}

type TargetBuilders = {
  readonly [TKind in AbilityTargetKind]: (
    fields: TargetFields,
  ) => AbilityTarget | null;
};

/** Each target kind, built from the form's fields once they are complete. */
const TARGET_BUILDERS: TargetBuilders = {
  none: (): AbilityTarget => NO_ABILITY_TARGET,
  ownedZone: ({ zoneId }): AbilityTarget | null =>
    zoneId === null ? null : { kind: 'ownedZone', zoneId },
  reinforcement: (fields): AbilityTarget | null =>
    fields.fromZoneId === null
      ? null
      : reinforcementFrom(fields.fromZoneId, fields),
};

function reinforcementFrom(
  fromZoneId: ZoneId,
  fields: TargetFields,
): AbilityTarget | null {
  return fields.toZoneId === null
    ? null
    : withUnits({
        kind: 'reinforcement',
        fromZoneId,
        toZoneId: fields.toZoneId,
        units: fields.units,
      });
}

function withUnits(
  target: Extract<AbilityTarget, { readonly kind: 'reinforcement' }>,
): AbilityTarget | null {
  return hasAnyUnits(target.units) ? target : null;
}

function orderFor(target: AbilityTarget | null): UseAbilityOrder | null {
  return target === null ? null : { kind: 'useAbility', target };
}

/** Your commander's once-a-match ability, aimed as it needs. */
@Component({
  selector: 'lc-ability-form',
  imports: [FormsModule, StatePanel, TranslatePipe, UnitPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ability-form.html',
  styles: `
    .ability__text {
      margin: 0;
    }
  `,
})
export class AbilityForm {
  public readonly view = input.required<PlayerView>();
  public readonly draft = input.required<readonly Order[]>();
  public readonly add = output<UseAbilityOrder>();

  protected readonly commanderAbility = commanderAbility;
  protected readonly commanderAbilityName = commanderAbilityName;
  protected readonly unavailable = computed(
    (): TranslationKey | null =>
      UNAVAILABLE_MESSAGES[abilityAvailabilityOf(this.view(), this.draft())],
  );
  protected readonly targetKind = computed(
    (): AbilityTargetKind => this.view().orderRules.abilityTargetKind,
  );
  protected readonly zones = computed((): readonly ZoneView[] =>
    ownZones(this.view()),
  );
  protected readonly startZones = computed((): readonly ZoneView[] =>
    ownZonesWith(this.view(), UNIT_TYPES),
  );

  protected readonly zoneId = signal<ZoneId | null>(null);
  protected readonly fromZoneId = signal<ZoneId | null>(null);
  protected readonly destinations = computed((): readonly ZoneId[] =>
    adjacentFrom(this.view(), this.fromZoneId()),
  );
  protected readonly toZoneId = linkedSignal<readonly ZoneId[], ZoneId | null>({
    source: this.destinations,
    computation: (): ZoneId | null => null,
  });
  protected readonly available = computed(
    (): UnitCounts => ownUnitsAt(this.view(), this.fromZoneId()),
  );
  protected readonly units = linkedSignal<ZoneId | null, UnitCounts>({
    source: this.fromZoneId,
    computation: (): UnitCounts => NO_UNITS,
  });
  protected readonly order = computed((): UseAbilityOrder | null =>
    orderFor(
      TARGET_BUILDERS[this.targetKind()]({
        zoneId: this.zoneId(),
        fromZoneId: this.fromZoneId(),
        toZoneId: this.toZoneId(),
        units: this.units(),
      }),
    ),
  );

  protected submit(): void {
    const order = this.order();
    if (order !== null) {
      this.add.emit(order);
    }
  }
}

function adjacentFrom(
  view: PlayerView,
  zoneId: ZoneId | null,
): readonly ZoneId[] {
  return zoneId === null ? [] : adjacentZoneIds(view.connections, zoneId);
}
