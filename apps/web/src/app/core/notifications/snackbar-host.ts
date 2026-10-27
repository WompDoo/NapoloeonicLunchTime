import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../i18n/translate-pipe';
import { Snackbar } from './snackbar';

/** Announced politely to screen readers; dismissable, and gone on its own after a few seconds. */
@Component({
  selector: 'lc-snackbar-host',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="snackbar-region" role="status" aria-live="polite">
      @if (snackbar.message(); as message) {
        <div class="snackbar">
          <div class="flex items-center gap-3">
            <p class="snackbar__text">{{ message.text }}</p>
            <button
              type="button"
              class="snackbar__close"
              (click)="snackbar.dismiss(message.id)"
            >
              {{ 'common.close' | t }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .snackbar-region {
      position: fixed;
      inset: auto 0 0 0;
      padding: 0 max(16px, env(safe-area-inset-right, 0px))
        calc(16px + env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 20;
    }
    .snackbar {
      pointer-events: auto;
      max-width: 36rem;
      padding: 0.75rem 1rem;
      background: var(--ink);
      color: var(--paper);
      border-radius: var(--radius);
      box-shadow: 0 6px 24px rgb(0 0 0 / 0.25);
    }
    .snackbar__text {
      margin: 0;
    }
    .snackbar__close {
      font: 600 0.875rem/1 var(--font-display);
      background: none;
      border: 0;
      color: inherit;
      text-decoration: underline;
      padding: 0 0.5rem;
      min-height: 44px;
      cursor: pointer;
    }
  `,
})
export class SnackbarHost {
  protected readonly snackbar = inject(Snackbar);
}
