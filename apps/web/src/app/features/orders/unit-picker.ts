import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import type { UnitCounts, UnitType } from '@lunch-campaign/engine';
import { UNIT_TYPES } from '@lunch-campaign/engine';
import type { TranslationKey } from '../../core/i18n/en';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { clampCount } from '../../shared/own-army';

/** How many of each type to send, from what is in the zone. */
@Component({
  selector: 'lc-unit-picker',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="grid gap-2">
      <legend class="lc-label">{{ legend() | t }}</legend>
      <div class="grid grid-cols-2 gap-3">
        @for (unitType of presentTypes(); track unitType) {
          <div class="grid gap-1">
            <label class="picker__label" [for]="idPrefix() + unitType">
              {{ unitNameKey(unitType) | t }} ({{
                'orders.available' | t: { count: available()[unitType] }
              }})
            </label>
            <input
              #field
              type="number"
              inputmode="numeric"
              class="lc-input"
              min="0"
              [id]="idPrefix() + unitType"
              [max]="available()[unitType]"
              [value]="units()[unitType]"
              (input)="setCount(unitType, field.valueAsNumber)"
            />
          </div>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .picker__label {
      font-size: 0.875rem;
    }
  `,
})
export class UnitPicker {
  public readonly available = input.required<UnitCounts>();
  public readonly legend = input<TranslationKey>('orders.units');
  public readonly idPrefix = input.required<string>();
  public readonly units = model.required<UnitCounts>();

  protected presentTypes(): readonly UnitType[] {
    return UNIT_TYPES.filter(
      (unitType): boolean => this.available()[unitType] > 0,
    );
  }

  protected unitNameKey(unitType: UnitType): TranslationKey {
    return `unitName.${unitType}`;
  }

  protected setCount(unitType: UnitType, value: number): void {
    this.units.update(
      (units): UnitCounts => ({
        ...units,
        [unitType]: clampCount(value, this.available()[unitType]),
      }),
    );
  }
}
