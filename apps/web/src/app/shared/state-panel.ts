import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { TranslationKey } from '../core/i18n/en';
import { TranslatePipe } from '../core/i18n/translate-pipe';

export type PanelState = 'loading' | 'error' | 'empty';

/** The three states every data-bound component shows besides its content. */
@Component({
  selector: 'lc-state-panel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') {
        <p class="state state--loading" role="status" aria-busy="true">
          {{ message() ?? 'common.loading' | t }}
        </p>
      }
      @case ('error') {
        <div class="state state--error" role="alert">
          <div class="flex flex-wrap items-center gap-3">
            <p class="state__text">{{ message() ?? 'state.error' | t }}</p>
            <button
              type="button"
              class="lc-button lc-button--quiet"
              (click)="retry.emit()"
            >
              {{ 'common.retry' | t }}
            </button>
          </div>
        </div>
      }
      @case ('empty') {
        <p class="state state--empty">{{ message() ?? 'state.error' | t }}</p>
      }
    }
  `,
  styles: `
    .state {
      margin: 0;
      padding: 1rem;
      border-radius: var(--radius);
      border: 1px dashed var(--line);
      color: var(--muted);
    }
    .state--error {
      border-style: solid;
      border-color: var(--danger);
      color: var(--ink);
    }
    .state__text {
      margin: 0;
    }
  `,
})
export class StatePanel {
  public readonly state = input.required<PanelState>();
  public readonly message = input<TranslationKey | null>(null);
  public readonly retry = output();
}
