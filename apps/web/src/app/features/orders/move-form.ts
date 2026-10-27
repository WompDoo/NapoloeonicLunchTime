import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  MatchupPreview,
  PlayerView,
  PreviewRequest,
} from '@lunch-campaign/contracts';
import type { MoveOrder, UnitCounts, ZoneId } from '@lunch-campaign/engine';
import { hasAnyUnits, NO_UNITS, UNIT_TYPES } from '@lunch-campaign/engine';
import { LunchApi } from '../../core/api/lunch-api';
import { InlineErrors } from '../../core/api/inline-errors';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { errorKeyOf } from '../../shared/error-key';
import { adjacentZoneIds } from '../../shared/map-geometry';
import { ownUnitsAt, ownZonesWith } from '../../shared/own-army';
import { StatePanel } from '../../shared/state-panel';
import { MatchupPreviewCard } from './matchup-preview-card';
import { UnitPicker } from './unit-picker';
import type { ZoneView } from '@lunch-campaign/contracts';
import type { HttpResourceRequest } from '@angular/common/http';

/** Moves farther than one zone pass through another on the way. */
const SINGLE_STEP = 1;

/** A move: from one of your zones, optionally through another, with a preview of the fight. */
@Component({
  selector: 'lc-move-form',
  imports: [
    FormsModule,
    MatchupPreviewCard,
    StatePanel,
    TranslatePipe,
    UnitPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './move-form.html',
})
export class MoveForm {
  private readonly api = inject(LunchApi);
  protected readonly previewError = inject(InlineErrors).for('preview');
  protected readonly errorKeyOf = errorKeyOf;

  public readonly view = input.required<PlayerView>();
  public readonly matchId = input.required<string>();
  public readonly fromZoneId = model<ZoneId | null>(null);
  public readonly add = output<MoveOrder>();

  protected readonly startZones = computed((): readonly ZoneView[] =>
    ownZonesWith(this.view(), UNIT_TYPES),
  );
  protected readonly available = computed(
    (): UnitCounts => ownUnitsAt(this.view(), this.fromZoneId()),
  );
  /** Some unit type may cross more than one zone today (Murat's cavalry), so a route may pass through one. */
  protected readonly canPassThrough = computed(
    (): boolean =>
      Math.max(
        ...UNIT_TYPES.map(
          (unitType): number => this.view().orderRules.moveRange[unitType],
        ),
      ) > SINGLE_STEP,
  );
  protected readonly viaZoneId = linkedSignal<ZoneId | null, ZoneId | null>({
    source: this.fromZoneId,
    computation: (): ZoneId | null => null,
  });
  protected readonly toZoneId = linkedSignal<
    readonly [ZoneId | null, ZoneId | null],
    ZoneId | null
  >({
    source: computed(
      (): readonly [ZoneId | null, ZoneId | null] =>
        [this.fromZoneId(), this.viaZoneId()] as const,
    ),
    computation: (): ZoneId | null => null,
  });
  protected readonly units = linkedSignal<ZoneId | null, UnitCounts>({
    source: this.fromZoneId,
    computation: (): UnitCounts => NO_UNITS,
  });
  protected readonly throughZones = computed((): readonly ZoneId[] =>
    this.neighboursOf(this.fromZoneId()),
  );
  protected readonly destinations = computed((): ZoneId[] =>
    this.neighboursOf(this.viaZoneId() ?? this.fromZoneId()).filter(
      (zoneId): boolean => zoneId !== this.fromZoneId(),
    ),
  );
  protected readonly plan = computed((): MovePlan | null =>
    planOf(this.toZoneId(), this.units()),
  );
  protected readonly order = computed((): MoveOrder | null =>
    moveOrderOf(this.fromZoneId(), this.viaZoneId(), this.plan()),
  );
  protected readonly preview = httpResource<MatchupPreview>(
    (): HttpResourceRequest | undefined => {
      const plan = this.plan();
      return plan === null
        ? undefined
        : this.api.previewRequest(this.matchId(), plan);
    },
  );

  protected submit(): void {
    const order = this.order();
    if (order !== null) {
      this.add.emit(order);
      this.units.set(NO_UNITS);
    }
  }

  private neighboursOf(zoneId: ZoneId | null): readonly ZoneId[] {
    return zoneId === null
      ? []
      : adjacentZoneIds(this.view().connections, zoneId);
  }
}

/** Where the units go and which: also what the preview asks about. */
interface MovePlan extends PreviewRequest {
  readonly toZoneId: ZoneId;
}

function planOf(toZoneId: ZoneId | null, units: UnitCounts): MovePlan | null {
  return toZoneId === null ? null : planWithUnits(toZoneId, units);
}

function planWithUnits(toZoneId: ZoneId, units: UnitCounts): MovePlan | null {
  return hasAnyUnits(units) ? { toZoneId, units } : null;
}

function moveOrderOf(
  fromZoneId: ZoneId | null,
  viaZoneId: ZoneId | null,
  plan: MovePlan | null,
): MoveOrder | null {
  return fromZoneId === null ? null : completeMove(fromZoneId, viaZoneId, plan);
}

function completeMove(
  fromZoneId: ZoneId,
  viaZoneId: ZoneId | null,
  plan: MovePlan | null,
): MoveOrder | null {
  return plan === null
    ? null
    : { kind: 'move', fromZoneId, viaZoneIds: viaOf(viaZoneId), ...plan };
}

function viaOf(viaZoneId: ZoneId | null): readonly ZoneId[] {
  return viaZoneId === null ? [] : [viaZoneId];
}
